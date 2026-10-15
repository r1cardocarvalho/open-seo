import { waitUntil } from "cloudflare:workers";
import { createDataforseoClient } from "@/server/lib/dataforseo";
import { buildCacheKey, getCached, setCached } from "@/server/lib/r2-cache";
import type { BillingCustomerContext } from "@/server/billing/subscription";
import {
  serpAuthorityMetricsSchema,
  type SerpAuthorityMetrics,
} from "@/types/schemas/serp-analysis";
import { safeHttpUrl } from "@/shared/safe-url";
import { getSerpAnalysis } from "./serp";
import { asAppError } from "@/server/lib/errors";
import type { SerpResultItem } from "@/types/keywords";

const AUTHORITY_TTL = 7 * 24 * 60 * 60;

export async function getDetailedSerpAnalysis(
  input: {
    projectId: string;
    keyword: string;
    locationCode: number;
    languageCode: string;
    locationName?: string;
  },
  customer: BillingCustomerContext,
) {
  // Resolve targets on the server from the same cached SERP as the preview.
  // The caller cannot turn this into an arbitrary, unbounded backlink lookup.
  const serp = await getSerpAnalysis({ ...input, depth: 20 }, customer);
  try {
    const authority = await loadAuthority(
      serp.items.slice(0, 10),
      input.projectId,
      customer,
    );
    return {
      ...serp,
      items: serp.items.slice(0, 10),
      authority,
      authorityError: null,
    };
  } catch (error) {
    console.error("keywords.serp-authority failed:", error);
    return {
      ...serp,
      items: serp.items.slice(0, 10),
      authority: [],
      authorityError: asAppError(error)?.code ?? "INTERNAL_ERROR",
    };
  }
}

async function loadAuthority(
  items: SerpResultItem[],
  projectId: string,
  customer: BillingCustomerContext,
): Promise<SerpAuthorityMetrics[]> {
  const urls = [
    ...new Set(
      items
        .map((item) => safeHttpUrl(item.url))
        .filter((url): url is string => !!url),
    ),
  ];
  const entries = await Promise.all(
    urls.map(async (url) => {
      const key = await buildCacheKey("serp:authority:v1", {
        organizationId: customer.organizationId,
        projectId,
        url,
      });
      const cached = serpAuthorityMetricsSchema.safeParse(await getCached(key));
      return { url, key, metrics: cached.success ? cached.data : null };
    }),
  );
  const missing = entries.filter((entry) => !entry.metrics);
  if (missing.length) {
    const rows = await createDataforseoClient(
      customer,
    ).backlinks.bulkPagesSummary({
      targets: missing.map((entry) => entry.url),
    });
    const byUrl = new Map(rows.map((row) => [safeHttpUrl(row.url), row]));
    const fetchedAt = new Date().toISOString();
    for (const entry of missing) {
      const row = byUrl.get(entry.url);
      // A missing row may be transient; do not cache it as seven days of no data.
      if (!row) continue;
      entry.metrics = {
        url: entry.url,
        domainStrength: row?.main_domain_rank ?? null,
        pageStrength: row?.rank ?? null,
        referringDomains: row?.referring_domains ?? null,
        backlinks: row?.backlinks ?? null,
        fetchedAt,
      };
    }
    waitUntil(
      Promise.all(
        missing.flatMap((entry) =>
          entry.metrics
            ? [setCached(entry.key, entry.metrics, AUTHORITY_TTL)]
            : [],
        ),
      ).catch((error) => {
        console.error("keywords.serp-authority.cache-write failed:", error);
      }),
    );
  }
  return entries.flatMap((entry) => (entry.metrics ? [entry.metrics] : []));
}

import { waitUntil } from "cloudflare:workers";
import { chunk } from "remeda";
import { analyzeHtml } from "@/server/lib/audit/page-analyzer";
import { normalizeAndValidateStartUrl } from "@/server/lib/audit/url-policy";
import { MAX_HTML_BYTES, readTextUpTo } from "@/server/lib/audit/html-response";
import { buildCacheKey, getCached, setCached } from "@/server/lib/r2-cache";
import type { BillingCustomerContext } from "@/server/billing/subscription";
import { safeHttpUrl } from "@/shared/safe-url";
import {
  serpPageHeadingSchema,
  type SerpPageHeading,
} from "@/types/schemas/serp-analysis";

const HEADING_TTL = 24 * 60 * 60;
const UNAVAILABLE_TTL = 15 * 60;

async function fetchHeading(rawUrl: string): Promise<SerpPageHeading> {
  const unavailable: SerpPageHeading = {
    url: rawUrl,
    heading: null,
    status: "unavailable",
  };
  const signal = AbortSignal.timeout(10_000);
  let current = rawUrl;
  try {
    // Validate every redirect, including DNS/private-address checks. Never send
    // application credentials or cookies to a ranking page.
    for (let hop = 0; hop <= 3; hop++) {
      if (!safeHttpUrl(current)) return unavailable;
      const url = await normalizeAndValidateStartUrl(current);
      const response = await fetch(url, {
        redirect: "manual",
        signal,
        headers: {
          "user-agent": "OpenSEO/1.0 (+https://openseo.so)",
          accept: "text/html,application/xhtml+xml",
        },
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        await response.body?.cancel();
        if (!location) return unavailable;
        current = new URL(location, url).href;
        continue;
      }
      if (
        !response.ok ||
        !/\b(?:text\/html|application\/xhtml\+xml)\b/i.test(
          response.headers.get("content-type") ?? "",
        )
      ) {
        await response.body?.cancel();
        return unavailable;
      }
      const html = await readTextUpTo(response, MAX_HTML_BYTES);
      const analysis = analyzeHtml(html, url, response.status, 0);
      const heading =
        analysis.h1s
          .map((text) => text.replace(/\s+/g, " ").trim())
          .find(Boolean) ?? null;
      return { url: rawUrl, heading, status: heading ? "found" : "missing" };
    }
  } catch {
    // A blocked, timed-out, or non-HTML page does not prevent other H1s loading.
  }
  return unavailable;
}

export async function getSerpHeadings(
  input: { projectId: string; urls: string[] },
  customer: BillingCustomerContext,
): Promise<SerpPageHeading[]> {
  const urls = [...new Set(input.urls)].slice(0, 10);
  const entries = await Promise.all(
    urls.map(async (url) => {
      const key = await buildCacheKey("serp:heading:v1", {
        organizationId: customer.organizationId,
        projectId: input.projectId,
        url,
      });
      const cached = serpPageHeadingSchema.safeParse(await getCached(key));
      return { url, key, result: cached.success ? cached.data : null };
    }),
  );
  const missing = entries.filter((entry) => !entry.result);
  // Limit network requests and bounded HTML parses to three at a time.
  for (const batch of chunk(missing, 3)) {
    await Promise.all(
      batch.map(async (entry) => {
        entry.result = await fetchHeading(entry.url);
      }),
    );
  }
  waitUntil(
    Promise.all(
      missing.flatMap((entry) =>
        entry.result
          ? [
              setCached(
                entry.key,
                entry.result,
                entry.result.status === "unavailable"
                  ? UNAVAILABLE_TTL
                  : HEADING_TTL,
              ),
            ]
          : [],
      ),
    ).catch((error) => {
      console.error("keywords.serp-headings.cache-write failed:", error);
    }),
  );
  return entries.flatMap((entry) => (entry.result ? [entry.result] : []));
}

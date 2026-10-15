import { z } from "zod";
import { KeywordResearchRepository } from "@/server/features/keywords/repositories/KeywordResearchRepository";
import {
  createDataforseoClient,
  fetchKeywordMetricsForList,
} from "@/server/lib/dataforseo";
import type { BillingCustomerContext } from "@/server/billing/subscription";
import type { KeywordResearchRow } from "@/types/keywords";
import { resolveKeywordDataLanguage } from "@/shared/keyword-locations";
import { jsonCodec } from "@/shared/json";
import { normalizeKeyword, normalizeIntent } from "./helpers";

const trendCodec = jsonCodec(
  z.array(
    z.object({
      year: z.number().int().positive(),
      month: z.number().int().min(1).max(12),
      searchVolume: z.number().nonnegative(),
    }),
  ),
);
const METRIC_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export async function getSerpKeywordOverview(
  input: {
    projectId: string;
    keyword: string;
    locationCode: number;
    languageCode: string;
  },
  customer: BillingCustomerContext,
): Promise<Pick<
  KeywordResearchRow,
  "searchVolume" | "keywordDifficulty" | "trend"
> | null> {
  // Keyword data is country-wide and only supports a country's own languages.
  // A local SERP or an arbitrary SERP language must not change this cache's scope.
  const market = {
    projectId: input.projectId,
    keyword: normalizeKeyword(input.keyword),
    locationCode: input.locationCode,
    languageCode: resolveKeywordDataLanguage(
      input.locationCode,
      input.languageCode,
    ),
  };
  const cached = await KeywordResearchRepository.getKeywordMetric(market);
  if (cached && Date.parse(cached.fetchedAt) > Date.now() - METRIC_MAX_AGE_MS) {
    const trend = trendCodec.safeParse(cached.monthlySearches);
    return {
      searchVolume: cached.searchVolume,
      keywordDifficulty: cached.keywordDifficulty,
      trend: trend.success ? trend.data : [],
    };
  }
  const rows = await fetchKeywordMetricsForList(
    createDataforseoClient(customer),
    {
      keywords: [market.keyword],
      locationCode: market.locationCode,
      languageCode: market.languageCode,
      creditFeature: "keyword_research",
    },
  );
  const metric = rows.find(
    (row) => normalizeKeyword(row.keyword) === market.keyword,
  );
  if (!metric) return null;
  await KeywordResearchRepository.upsertKeywordMetric({
    ...market,
    searchVolume: metric.searchVolume,
    keywordDifficulty: metric.keywordDifficulty,
    cpc: metric.cpc,
    competition: metric.competition,
    intent: normalizeIntent(metric.intent),
    monthlySearchesJson: JSON.stringify(metric.monthlySearches),
  }).catch((error: unknown) =>
    console.error("keywords.serp-overview.persist failed:", error),
  );
  return {
    searchVolume: metric.searchVolume,
    keywordDifficulty: metric.keywordDifficulty,
    trend: metric.monthlySearches,
  };
}

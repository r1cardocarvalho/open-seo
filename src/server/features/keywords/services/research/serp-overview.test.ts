import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSerpKeywordOverview } from "./serp-overview";
import type { BillingCustomerContext } from "@/server/billing/subscription";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  upsert: vi.fn(),
  fetch: vi.fn(),
}));
vi.mock(
  "@/server/features/keywords/repositories/KeywordResearchRepository",
  () => ({
    KeywordResearchRepository: {
      getKeywordMetric: mocks.get,
      upsertKeywordMetric: mocks.upsert,
    },
  }),
);
vi.mock("@/server/lib/dataforseo", () => ({
  createDataforseoClient: vi.fn(),
  fetchKeywordMetricsForList: mocks.fetch,
}));
const customer: BillingCustomerContext = {
  organizationId: "org",
  userId: "user",
  userEmail: "user@example.com",
};
const input = {
  projectId: "project",
  keyword: "CRM",
  locationCode: 2620,
  languageCode: "pt",
};

beforeEach(() => {
  mocks.get.mockResolvedValue(null);
  mocks.upsert.mockResolvedValue(undefined);
  mocks.fetch.mockResolvedValue([]);
});

describe("SERP keyword overview", () => {
  it("reuses fresh research metrics without spending, preserving zero values", async () => {
    mocks.get.mockImplementation(async (market: typeof input) =>
      market.keyword === "crm" &&
      market.projectId === "project" &&
      market.locationCode === 2620 &&
      market.languageCode === "pt"
        ? {
            searchVolume: 0,
            keywordDifficulty: 0,
            monthlySearches: '[{"year":2026,"month":9,"searchVolume":0}]',
            fetchedAt: new Date().toISOString(),
          }
        : null,
    );
    expect(await getSerpKeywordOverview(input, customer)).toEqual({
      searchVolume: 0,
      keywordDifficulty: 0,
      trend: [{ year: 2026, month: 9, searchVolume: 0 }],
    });
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("refreshes expired data for one keyword using a supported country language", async () => {
    mocks.get.mockResolvedValue({ fetchedAt: "2020-01-01T00:00:00Z" });
    mocks.fetch.mockResolvedValue([
      {
        keyword: "crm",
        searchVolume: 100,
        keywordDifficulty: null,
        cpc: null,
        competition: null,
        intent: null,
        monthlySearches: [],
      },
    ]);
    const result = await getSerpKeywordOverview(
      { ...input, languageCode: "ja" },
      customer,
    );
    expect(result).toEqual({
      searchVolume: 100,
      keywordDifficulty: null,
      trend: [],
    });
    // Paid requests must use a supported keyword-data language, even when the SERP uses another one.
    expect(mocks.fetch).toHaveBeenCalledExactlyOnceWith(undefined, {
      keywords: ["crm"],
      locationCode: 2620,
      languageCode: "pt",
      creditFeature: "keyword_research",
    });
    expect(mocks.upsert).toHaveBeenCalledOnce();
  });

  it("does not save an absent provider result as zero difficulty or volume", async () => {
    expect(await getSerpKeywordOverview(input, customer)).toBeNull();
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
});

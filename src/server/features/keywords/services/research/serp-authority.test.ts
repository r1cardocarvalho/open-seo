import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDetailedSerpAnalysis } from "./serp-authority";
import type { SerpResultItem } from "@/types/keywords";
import type { BillingCustomerContext } from "@/server/billing/subscription";
import { AppError } from "@/server/lib/errors";

const mocks = vi.hoisted(() => ({
  serp: vi.fn(),
  bulk: vi.fn(),
  getCached: vi.fn(),
  setCached: vi.fn(),
}));
vi.mock("cloudflare:workers", () => ({ waitUntil: vi.fn() }));
vi.mock("./serp", () => ({ getSerpAnalysis: mocks.serp }));
vi.mock("@/server/lib/dataforseo", () => ({
  createDataforseoClient: () => ({
    backlinks: { bulkPagesSummary: mocks.bulk },
  }),
}));
vi.mock("@/server/lib/r2-cache", () => ({
  buildCacheKey: async (
    _namespace: string,
    params: { organizationId: string; projectId: string; url: string },
  ) => [params.organizationId, params.projectId, params.url].join("|"),
  getCached: mocks.getCached,
  setCached: mocks.setCached,
}));
const input = {
  projectId: "project",
  keyword: "crm",
  locationCode: 2840,
  languageCode: "en",
};
const customer: BillingCustomerContext = {
  organizationId: "org",
  userId: "user",
  userEmail: "user@example.com",
};
const page = (rank: number): SerpResultItem => ({
  rank,
  title: "Page",
  url: `https://example.com/${rank}`,
  domain: "example.com",
  description: "",
  etv: null,
  estimatedPaidTrafficCost: null,
  referringDomains: null,
  backlinks: null,
  isNew: false,
  rankChange: null,
});
const cachedMetrics = {
  url: page(1).url,
  domainStrength: 62,
  pageStrength: 0,
  referringDomains: 0,
  backlinks: 0,
  fetchedAt: "2026-10-15T00:00:00Z",
};

beforeEach(() => {
  mocks.serp.mockResolvedValue({
    requestedKeyword: "crm",
    depth: 20,
    items: [page(1)],
  });
  mocks.getCached.mockResolvedValue(null);
  mocks.setCached.mockResolvedValue(undefined);
  mocks.bulk.mockResolvedValue([]);
});

describe("detailed SERP analysis", () => {
  it("batches only uncached URLs from the top ten and maps scores by URL", async () => {
    mocks.serp.mockResolvedValue({
      requestedKeyword: "crm",
      depth: 20,
      items: Array.from({ length: 20 }, (_, i) => page(i + 1)),
    });
    mocks.getCached.mockImplementation(async (key: string) =>
      key.endsWith(`|${page(1).url}`) ? cachedMetrics : null,
    );
    mocks.bulk.mockResolvedValue([
      {
        url: page(3).url,
        rank: 18,
        main_domain_rank: 75,
        backlinks: 200,
        referring_domains: 9,
      },
    ]);
    const result = await getDetailedSerpAnalysis(input, customer);
    expect(result.items).toHaveLength(10);
    expect(mocks.bulk).toHaveBeenCalledExactlyOnceWith({
      targets: Array.from({ length: 9 }, (_, i) => page(i + 2).url),
    });
    expect(result.authority[0]).toEqual(cachedMetrics);
    expect(result.authority[1]).toMatchObject({
      url: page(3).url,
      domainStrength: 75,
      pageStrength: 18,
      referringDomains: 9,
      backlinks: 200,
    });
    expect(result.authority).toHaveLength(2);
    expect(mocks.setCached).toHaveBeenCalledOnce();
  });

  it("reuses URL metrics across keywords without a paid authority request", async () => {
    mocks.getCached.mockImplementation(async (key: string) => {
      return key === `org|project|${page(1).url}` ? cachedMetrics : null;
    });
    const result = await getDetailedSerpAnalysis(
      { ...input, keyword: "other crm" },
      customer,
    );
    expect(result.authority).toEqual([cachedMetrics]);
    expect(mocks.bulk).not.toHaveBeenCalled();
  });

  it("does not reuse another organization's cached metrics", async () => {
    mocks.getCached.mockImplementation(async (key: string) =>
      key.startsWith("org|") ? cachedMetrics : null,
    );
    await getDetailedSerpAnalysis(input, {
      ...customer,
      organizationId: "other-org",
    });
    expect(mocks.bulk).toHaveBeenCalledOnce();
  });

  it("keeps search results when authority billing fails and does not cache the failure", async () => {
    mocks.bulk.mockRejectedValue(
      new AppError("BACKLINKS_BILLING_ISSUE", "Private provider detail"),
    );
    const result = await getDetailedSerpAnalysis(input, customer);
    expect(result.items).toEqual([page(1)]);
    expect(result.authorityError).toBe("BACKLINKS_BILLING_ISSUE");
    expect(mocks.setCached).not.toHaveBeenCalled();
  });

  it("skips authority spending when there are no organic results", async () => {
    mocks.serp.mockResolvedValue({
      requestedKeyword: "crm",
      depth: 20,
      items: [],
    });
    const result = await getDetailedSerpAnalysis(input, customer);
    expect(result.items).toEqual([]);
    expect(result.authorityError).toBeNull();
    expect(mocks.bulk).not.toHaveBeenCalled();
  });
});

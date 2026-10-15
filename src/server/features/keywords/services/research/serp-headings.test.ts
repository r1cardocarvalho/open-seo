import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSerpHeadings } from "./serp-headings";
import type { BillingCustomerContext } from "@/server/billing/subscription";

const mocks = vi.hoisted(() => ({ getCached: vi.fn(), setCached: vi.fn() }));
vi.mock("cloudflare:workers", () => ({ waitUntil: vi.fn() }));
vi.mock("@/server/lib/r2-cache", () => ({
  buildCacheKey: async (
    _namespace: string,
    params: { organizationId: string; projectId: string; url: string },
  ) => [params.organizationId, params.projectId, params.url].join("|"),
  getCached: mocks.getCached,
  setCached: mocks.setCached,
}));
const customer: BillingCustomerContext = {
  organizationId: "org",
  userId: "user",
  userEmail: "user@example.com",
};
const input = { projectId: "project", urls: ["https://example.com/"] };
const html = (body: string) =>
  new Response(body, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });

function stubPages(routes: Record<string, () => Response>) {
  vi.mocked(fetch).mockImplementation(async (request) => {
    const url = request instanceof Request ? request.url : request.toString();
    if (url.startsWith("https://cloudflare-dns.com/"))
      return Response.json({
        Status: 0,
        Answer: [{ type: 1, data: "93.184.216.34" }],
      });
    return routes[url]?.() ?? new Response(null, { status: 404 });
  });
}

beforeEach(() => {
  mocks.getCached.mockResolvedValue(null);
  mocks.setCached.mockResolvedValue(undefined);
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => vi.unstubAllGlobals());

describe("SERP page headings", () => {
  it("extracts the first non-empty real H1 with decoded entities and normalized whitespace", async () => {
    stubPages({
      "https://example.com/": () =>
        html(
          '<script>"<h1>Fake</h1>"</script><h1> </h1><h1> Move <em>Bubble</em> &amp;\n build </h1><h1>Second</h1>',
        ),
    });
    expect(await getSerpHeadings(input, customer)).toEqual([
      { url: input.urls[0], heading: "Move Bubble & build", status: "found" },
    ]);
  });

  it("reuses URL headings across keywords without fetching the page again", async () => {
    const cached = {
      url: input.urls[0],
      heading: "Cached heading",
      status: "found",
    };
    mocks.getCached.mockResolvedValue(cached);
    expect(await getSerpHeadings(input, customer)).toEqual([cached]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("deduplicates page fetches and distinguishes absent H1s from unreadable pages", async () => {
    stubPages({ "https://example.com/": () => html("<p>No heading</p>") });
    const results = await getSerpHeadings(
      {
        ...input,
        urls: [...input.urls, ...input.urls, "https://example.com/blocked"],
      },
      customer,
    );
    expect(results).toEqual([
      { url: input.urls[0], heading: null, status: "missing" },
      {
        url: "https://example.com/blocked",
        heading: null,
        status: "unavailable",
      },
    ]);
    expect(
      vi
        .mocked(fetch)
        .mock.calls.filter(([request]) => request === input.urls[0]),
    ).toHaveLength(1);
  });

  it.each([
    "http://127.0.0.1/admin",
    "http://169.254.169.254/latest/meta-data/",
    "https://user:password@example.com/private",
  ])("blocks redirect destination %s before fetching it", async (location) => {
    stubPages({
      "https://example.com/": () =>
        new Response(null, { status: 302, headers: { location } }),
    });
    expect(await getSerpHeadings(input, customer)).toEqual([
      { url: input.urls[0], heading: null, status: "unavailable" },
    ]);
    expect(
      vi.mocked(fetch).mock.calls.some(([request]) => request === location),
    ).toBe(false);
  });

  it("checks redirect host DNS before fetching a hostname that resolves to a private address", async () => {
    vi.mocked(fetch).mockImplementation(async (request) => {
      const url = request instanceof Request ? request.url : request.toString();
      if (url.startsWith("https://cloudflare-dns.com/"))
        return Response.json({
          Status: 0,
          Answer: [
            {
              type: 1,
              data: url.includes("name=private.example")
                ? "10.0.0.1"
                : "93.184.216.34",
            },
          ],
        });
      return new Response(null, {
        status: 302,
        headers: { location: "https://private.example/" },
      });
    });
    expect((await getSerpHeadings(input, customer))[0].status).toBe(
      "unavailable",
    );
    expect(
      vi
        .mocked(fetch)
        .mock.calls.some(([request]) => request === "https://private.example/"),
    ).toBe(false);
  });
});

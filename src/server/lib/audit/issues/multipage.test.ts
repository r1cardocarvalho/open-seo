import { readFileSync } from "node:fs";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import type * as MultipageModule from "./multipage";

vi.mock("cloudflare:workers", () => ({ env: { DATABASE_PROVIDER: "d1" } }));

const client = createClient({ url: "file::memory:" });
let runMultipageChecks: typeof MultipageModule.runMultipageChecks;

beforeAll(async () => {
  vi.doMock("@/db", () => ({ db: drizzle(client) }));
  await client.execute("CREATE TABLE audits (id text PRIMARY KEY)");
  // Real audit DDL keeps this query test aligned with the persisted columns.
  for (const migration of ["0000_fantastic_vanisher", "0030_legal_reaper"]) {
    for (const statement of readFileSync(
      `drizzle/sqlite/${migration}.sql`,
      "utf8",
    ).split("--> statement-breakpoint")) {
      if (
        /^\s*(CREATE TABLE|ALTER TABLE) `audit_(pages|issues)`/.test(statement)
      ) {
        await client.execute(statement);
      }
    }
  }
  ({ runMultipageChecks } = await import("./multipage"));
});
afterAll(() => client.close());

it("skips persisted app-shell coverage gaps while retaining genuine duplicate pages", async () => {
  await client.execute("INSERT INTO audits (id) VALUES ('audit')");
  for (const id of ["shell-1", "shell-2", "readable-1", "readable-2"]) {
    await client.execute({
      sql: "INSERT INTO audit_pages (id, audit_id, url, status_code, fetch_class, title, meta_description, word_count, content_hash) VALUES (?, 'audit', ?, 200, 'ok', ?, ?, 1, ?)",
      args: [
        id,
        `https://example.com/${id}`,
        id.startsWith("shell") ? "App shell" : "Real title",
        "Shared description",
        "same-text",
      ],
    });
  }
  for (const id of ["shell-1", "shell-2"]) {
    await client.execute({
      sql: "INSERT INTO audit_issues (id, audit_id, page_id, page_url, issue_type, severity) VALUES (?, 'audit', ?, ?, 'javascript-rendering-suspected', 'warning')",
      args: [`issue-${id}`, id, `https://example.com/${id}`],
    });
  }
  const { issues, hasUnreadShells } = await runMultipageChecks({
    auditId: "audit",
  });
  expect(hasUnreadShells).toBe(true);
  expect(issues).toHaveLength(6);
  expect(new Set(issues.map((issue) => issue.pageId))).toEqual(
    new Set(["readable-1", "readable-2"]),
  );
});

it("reports deep pages from finalized depths, excluding shallow, unknown and failed pages", async () => {
  await client.execute("INSERT INTO audits (id) VALUES ('depth-audit')");
  for (const [id, depth, status, fetchClass] of [
    ["shallow", 4, 200, "ok"],
    ["deep", 5, 200, "ok"],
    ["unknown", null, 200, "ok"],
    ["redirect", 6, 301, "ok"],
    ["failed", 6, 500, "error"],
    ["blocked", 6, 200, "blocked"],
  ] as const) {
    await client.execute({
      sql: "INSERT INTO audit_pages (id, audit_id, url, crawl_depth, status_code, fetch_class) VALUES (?, 'depth-audit', ?, ?, ?, ?)",
      args: [id, `https://example.com/${id}`, depth, status, fetchClass],
    });
  }
  const { issues } = await runMultipageChecks({ auditId: "depth-audit" });
  expect(issues.filter((issue) => issue.issueType === "deep-page")).toEqual([
    {
      issueType: "deep-page",
      pageId: "deep",
      pageUrl: "https://example.com/deep",
      details: { crawlDepth: 5 },
    },
  ]);
});

/**
 * Cross-page checks that need the whole crawl: duplicate titles, meta
 * descriptions and content, plus redirect chains and loops.
 *
 * Reads the audit's persisted page rows from the app DB. Link-graph checks
 * (broken links, orphan pages) are not here: they run inside the
 * audit's scratchpad Durable Object (AuditScratchpad.runFinalizeChecks),
 * next to the link edges themselves — link rows never touch the app DB.
 */
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditIssues, auditPages } from "@/db/schema";
import {
  findDuplicates,
  findRedirectChainsAndLoops,
  type SlimPage,
} from "./multipage-checks";
import type { DetectedIssue } from "@/server/lib/audit/issues/page-reporters";

export async function runMultipageChecks(input: {
  auditId: string;
}): Promise<{ issues: DetectedIssue[]; hasUnreadShells: boolean }> {
  // Unrendered app shells carry a persisted coverage warning. Their
  // placeholder titles and loading text must not become duplicate findings.
  const shellPageIds = new Set(
    (
      await db
        .select({ pageId: auditIssues.pageId })
        .from(auditIssues)
        .where(
          and(
            eq(auditIssues.auditId, input.auditId),
            eq(auditIssues.issueType, "javascript-rendering-suspected"),
          ),
        )
    ).map((row) => row.pageId),
  );
  const allPages = await db
    .select({
      id: auditPages.id,
      url: auditPages.url,
      statusCode: auditPages.statusCode,
      fetchClass: auditPages.fetchClass,
      redirectUrl: auditPages.redirectUrl,
      title: auditPages.title,
      metaDescription: auditPages.metaDescription,
      contentHash: auditPages.contentHash,
      wordCount: auditPages.wordCount,
      isIndexable: auditPages.isIndexable,
      canonicalUrl: auditPages.canonicalUrl,
      headerCanonicalUrl: auditPages.headerCanonicalUrl,
      crawlDepth: auditPages.crawlDepth,
    })
    .from(auditPages)
    .where(eq(auditPages.auditId, input.auditId));
  const pages: SlimPage[] = allPages.filter(
    (page) => !shellPageIds.has(page.id),
  );
  const deepPages: DetectedIssue[] = allPages
    .filter(
      (page) =>
        page.fetchClass === "ok" &&
        page.statusCode !== null &&
        page.statusCode >= 200 &&
        page.statusCode < 300 &&
        page.crawlDepth !== null &&
        page.crawlDepth >= 5,
    )
    .map((page) => ({
      issueType: "deep-page",
      pageId: page.id,
      pageUrl: page.url,
      details: { crawlDepth: page.crawlDepth },
    }));

  return {
    issues: [
      ...findDuplicates(pages),
      ...findRedirectChainsAndLoops(pages),
      ...deepPages,
    ],
    hasUnreadShells: shellPageIds.size > 0,
  };
}

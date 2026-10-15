import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { savedKeywords } from "@/db/schema";

type SavedKeywordRecord = typeof savedKeywords.$inferSelect;

async function updateSavedKeywordRow(
  projectId: string,
  savedKeywordId: string,
  values: Partial<Pick<SavedKeywordRecord, "notes" | "priority">>,
) {
  const updated = await db
    .update(savedKeywords)
    .set(values)
    .where(
      and(
        eq(savedKeywords.id, savedKeywordId),
        eq(savedKeywords.projectId, projectId),
      ),
    )
    .returning({ id: savedKeywords.id });
  return updated.length > 0;
}

export function updateSavedKeywordNote(params: {
  projectId: string;
  savedKeywordId: string;
  notes: string | null;
}) {
  return updateSavedKeywordRow(params.projectId, params.savedKeywordId, {
    notes: params.notes,
  });
}

export function updateSavedKeywordPriority(params: {
  projectId: string;
  savedKeywordId: string;
  priority: number | null;
}) {
  return updateSavedKeywordRow(params.projectId, params.savedKeywordId, {
    priority: params.priority,
  });
}

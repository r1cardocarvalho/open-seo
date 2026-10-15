import { useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { z } from "zod";
import { cn } from "cn";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { ProjectPageHeader } from "@/client/features/projects/ProjectPageHeader";
import {
  keywordColumns,
  seedWorkbook,
  templateSheets,
  textRow,
  type TemplateRow,
} from "@/client/features/keyword-template/templateSheets";

const rowSchema = z.object({
  id: z.string(),
  cells: z.record(z.string(), z.string()),
});

const workbookSchema = z.record(z.string(), z.array(rowSchema));

const legacyKeywordSchema = z.object({
  id: z.string(),
  keyword: z.string(),
  category1: z.string(),
  category2: z.string(),
  avgVolume: z.string(),
  difficulty: z.string(),
  serpCtr: z.string(),
  mozPriority: z.string(),
  onSiteRelevance: z.string(),
  notes: z.string(),
  minVolume: z.string(),
  maxVolume: z.string(),
  targeted: z.enum(["Yes", "No"]),
});

function storageKey(projectId: string) {
  return `compact-keywords-template:${projectId}`;
}

function readStoredWorkbook(
  projectId: string,
): Record<string, TemplateRow[]> | null {
  try {
    const raw = localStorage.getItem(storageKey(projectId));
    if (!raw) return null;
    const json: unknown = JSON.parse(raw);
    const workbook = workbookSchema.safeParse(json);
    if (workbook.success) {
      const seeded = seedWorkbook();
      for (const sheet of templateSheets) {
        const stored = workbook.data[sheet.id];
        if (stored) seeded[sheet.id] = stored;
      }
      return seeded;
    }

    const legacy = z.array(legacyKeywordSchema).safeParse(json);
    if (!legacy.success) return null;
    return {
      ...seedWorkbook(),
      keywords: legacy.data.map((row) =>
        textRow(row.id, keywordColumns, {
          keyword: row.keyword,
          category1: row.category1,
          category2: row.category2,
          avgVolume: row.avgVolume,
          difficulty: row.difficulty,
          serpCtr: row.serpCtr,
          mozPriority: row.mozPriority,
          onSiteRelevance: row.onSiteRelevance,
          notes: row.notes,
          minVolume: row.minVolume,
          maxVolume: row.maxVolume,
          targeted: row.targeted,
        }),
      ),
    };
  } catch {
    return null;
  }
}

export function CompactKeywordsTemplate({ projectId }: { projectId: string }) {
  const [workbook, setWorkbook] =
    useState<Record<string, TemplateRow[]>>(seedWorkbook);
  const [activeId, setActiveId] = useState(templateSheets[0]?.id ?? "");
  const loadedFor = useRef<string | null>(null);
  const activeSheet =
    templateSheets.find((sheet) => sheet.id === activeId) ?? templateSheets[0];
  const rows = activeSheet ? (workbook[activeSheet.id] ?? []) : [];

  useEffect(() => {
    const stored = readStoredWorkbook(projectId);
    loadedFor.current = projectId;
    setWorkbook(stored ?? seedWorkbook());
    setActiveId(templateSheets[0]?.id ?? "");
  }, [projectId]);

  useEffect(() => {
    if (loadedFor.current !== projectId) return;
    localStorage.setItem(storageKey(projectId), JSON.stringify(workbook));
  }, [projectId, workbook]);

  function updateRows(
    sheetId: string,
    next: (current: TemplateRow[]) => TemplateRow[],
  ) {
    setWorkbook((current) => ({
      ...current,
      [sheetId]: next(current[sheetId] ?? []),
    }));
  }

  if (!activeSheet) return null;

  return (
    <div className="h-full overflow-auto px-4 py-4 pb-24 md:px-6 md:py-6 md:pb-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <ProjectPageHeader
          projectId={projectId}
          title="Compact Keywords template"
        />
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div
            role="tablist"
            aria-label="Template sheets"
            className="flex gap-1 overflow-x-auto border-b border-border"
          >
            {templateSheets.map((sheet) => {
              const selected = sheet.id === activeSheet.id;
              return (
                <button
                  key={sheet.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  className={cn(
                    "relative inline-flex h-9 shrink-0 items-center px-3 text-sm font-medium text-muted-foreground hover:text-foreground",
                    selected &&
                      "text-foreground after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-foreground",
                  )}
                  onClick={() => setActiveId(sheet.id)}
                >
                  {sheet.label}
                </button>
              );
            })}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              updateRows(activeSheet.id, (current) => [
                ...current,
                textRow(crypto.randomUUID(), activeSheet.columns),
              ])
            }
          >
            <Plus />
            Add row
          </Button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                {activeSheet.columns.map((column) => (
                  <th
                    key={column.key}
                    className="px-2 py-2 font-medium whitespace-nowrap"
                  >
                    {column.label}
                  </th>
                ))}
                <th className="w-10 px-2 py-2">
                  <span className="sr-only">Remove</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border last:border-b-0"
                >
                  {activeSheet.columns.map((column) => (
                    <td key={column.key} className="p-1 align-middle">
                      {column.kind === "yesno" ? (
                        <select
                          aria-label={column.label}
                          value={row.cells[column.key] === "Yes" ? "Yes" : "No"}
                          className="h-8 w-full min-w-20 rounded-lg border border-input bg-background px-2 text-sm"
                          onChange={(event) =>
                            updateRows(activeSheet.id, (current) =>
                              current.map((entry) =>
                                entry.id === row.id
                                  ? {
                                      ...entry,
                                      cells: {
                                        ...entry.cells,
                                        [column.key]:
                                          event.target.value === "Yes"
                                            ? "Yes"
                                            : "No",
                                      },
                                    }
                                  : entry,
                              ),
                            )
                          }
                        >
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      ) : (
                        <Input
                          aria-label={column.label}
                          value={row.cells[column.key] ?? ""}
                          className="h-8 min-w-28 px-2"
                          onChange={(event) =>
                            updateRows(activeSheet.id, (current) =>
                              current.map((entry) =>
                                entry.id === row.id
                                  ? {
                                      ...entry,
                                      cells: {
                                        ...entry.cells,
                                        [column.key]: event.target.value,
                                      },
                                    }
                                  : entry,
                              ),
                            )
                          }
                        />
                      )}
                    </td>
                  ))}
                  <td className="p-1 align-middle">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove ${row.cells[activeSheet.columns[0]?.key ?? ""] || "row"}`}
                      onClick={() =>
                        updateRows(activeSheet.id, (current) =>
                          current.filter((entry) => entry.id !== row.id),
                        )
                      }
                    >
                      <Trash2 />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

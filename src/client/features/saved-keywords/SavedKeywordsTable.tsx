import {
  createColumnHelper,
  type ColumnDef,
  type OnChangeFn,
  type RowSelectionState,
  type SortingState,
} from "@tanstack/react-table";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  DataTable,
  makeSelectionColumn,
  useDataTable,
  useSelectionAnchor,
} from "@/client/components/table/DataTable";
import { SortableHeader } from "@/client/components/table/SortableHeader";
import { ScoreBadge } from "@/client/components/table/ScoreBadge";
import { Button } from "@/client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import { Textarea } from "@/client/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/client/components/ui/tooltip";
import { IntentBadge } from "@/client/features/keywords/components";
import type { KeywordIntent, SavedKeywordRow } from "@/types/keywords";
import { TagChip } from "./TagChip";
import {
  formatSavedKeywordDate,
  formatSavedKeywordNumber,
} from "./savedKeywordsUtils";

const columnHelper = createColumnHelper<SavedKeywordRow>();

export function SavedKeywordsTable({
  rows,
  rowSelection,
  sorting,
  isLoading,
  hasActiveFilters,
  onClearFilters,
  onRowSelectionChange,
  onSaveNote,
  onSavePriority,
  onSortingChange,
  toolbar,
  footer,
}: {
  rows: SavedKeywordRow[];
  rowSelection: RowSelectionState;
  sorting: SortingState;
  isLoading: boolean;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onRowSelectionChange: OnChangeFn<RowSelectionState>;
  onSaveNote: (savedKeywordId: string, notes: string) => Promise<unknown>;
  onSavePriority: (
    savedKeywordId: string,
    priority: number | null,
  ) => Promise<unknown>;
  onSortingChange: OnChangeFn<SortingState>;
  toolbar: ReactNode;
  footer: ReactNode;
}) {
  const selectAnchorRef = useSelectionAnchor();
  const columns = useMemo<ColumnDef<SavedKeywordRow>[]>(
    () => [
      makeSelectionColumn<SavedKeywordRow>(selectAnchorRef),
      columnHelper.accessor("keyword", {
        header: ({ column }) => (
          <SortableHeader column={column} label="Keyword" />
        ),
        cell: ({ getValue }) => (
          <span className="font-medium">{getValue()}</span>
        ),
      }),
      columnHelper.accessor("searchVolume", {
        header: ({ column }) => (
          <SortableHeader column={column} label="Volume" />
        ),
        cell: ({ getValue }) => formatSavedKeywordNumber(getValue()),
      }),
      columnHelper.accessor("cpc", {
        header: ({ column }) => <SortableHeader column={column} label="CPC" />,
        cell: ({ getValue }) => {
          const value = getValue();
          return value == null ? "-" : `$${value.toFixed(2)}`;
        },
      }),
      columnHelper.accessor("competition", {
        header: ({ column }) => (
          <SortableHeader
            column={column}
            label="Competition"
            helpText="Paid-search competition from Google Ads (0-1): higher means more advertisers bidding."
          />
        ),
        cell: ({ getValue }) => {
          const value = getValue();
          return value == null ? "-" : value.toFixed(2);
        },
      }),
      columnHelper.accessor("keywordDifficulty", {
        header: ({ column }) => (
          <SortableHeader
            column={column}
            label="Difficulty"
            helpText="Organic ranking difficulty (0-100): higher means harder to reach Google's top 10."
          />
        ),
        cell: ({ getValue }) => <ScoreBadge value={getValue()} />,
      }),
      columnHelper.accessor("intent", {
        header: () => "Intent",
        cell: ({ getValue }) => (
          <IntentBadge intent={normalizeIntent(getValue())} />
        ),
        enableSorting: false,
      }),
      columnHelper.display({
        id: "tags",
        header: () => "Tags",
        cell: ({ row }) => <TagList tags={row.original.tags} />,
        enableSorting: false,
        meta: { cellClassName: "min-w-40 max-w-64" },
      }),
      columnHelper.accessor("priority", {
        header: ({ column }) => (
          <SortableHeader column={column} label="Priority" />
        ),
        cell: ({ row }) => (
          <PriorityCell
            keyword={row.original.keyword}
            priority={row.original.priority}
            onSave={(priority) => onSavePriority(row.original.id, priority)}
          />
        ),
        meta: { cellClassName: "w-24" },
      }),
      columnHelper.display({
        id: "notes",
        header: () => "Notes",
        cell: ({ row }) => (
          <NoteCell
            keyword={row.original.keyword}
            notes={row.original.notes}
            onSave={(notes) => onSaveNote(row.original.id, notes)}
          />
        ),
        enableSorting: false,
        meta: { cellClassName: "max-w-56" },
      }),
      columnHelper.accessor("fetchedAt", {
        header: ({ column }) => (
          <SortableHeader column={column} label="Last Fetched" />
        ),
        cell: ({ getValue }) => (
          <span className="text-xs text-muted-foreground">
            {formatSavedKeywordDate(getValue())}
          </span>
        ),
      }),
    ],
    [onSaveNote, onSavePriority, selectAnchorRef],
  );
  const table = useDataTable({
    data: rows,
    columns,
    state: { rowSelection, sorting },
    onRowSelectionChange,
    onSortingChange,
    getRowId: (row) => row.id,
    enableRowSelection: true,
    manualSorting: true,
    // The server sorts by one column, so there is always exactly one sort:
    // a click flips its direction and shift+click does not add a second.
    enableSortingRemoval: false,
    enableMultiSort: false,
  });

  return (
    <DataTable
      table={table}
      isLoading={isLoading}
      isFiltered={hasActiveFilters}
      onClearFilters={onClearFilters}
      empty={{
        title: "No saved keywords yet",
        description: "Use the Keyword Research page to find and save keywords.",
      }}
      toolbar={toolbar}
      footer={footer}
    />
  );
}

function normalizeIntent(value: string | null): KeywordIntent {
  switch (value) {
    case "informational":
    case "commercial":
    case "transactional":
    case "navigational":
    case "unknown":
      return value;
    default:
      return "unknown";
  }
}

const PRIORITY_OPTIONS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];

function PriorityCell({
  keyword,
  priority,
  onSave,
}: {
  keyword: string;
  priority: number | null;
  onSave: (priority: number | null) => Promise<unknown>;
}) {
  const [value, setValue] = useState(priority == null ? "" : String(priority));

  useEffect(() => {
    setValue(priority == null ? "" : String(priority));
  }, [priority]);

  return (
    <select
      aria-label={`Priority for ${keyword}`}
      value={value}
      className="h-8 w-16 rounded-lg border border-input bg-background px-1.5 text-sm"
      onChange={(event) => {
        const next = event.target.value;
        const previous = value;
        setValue(next);
        void onSave(next === "" ? null : Number(next)).catch(() => {
          setValue(previous);
        });
      }}
    >
      <option value="">—</option>
      {PRIORITY_OPTIONS.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function NoteCell({
  keyword,
  notes,
  onSave,
}: {
  keyword: string;
  notes: string | null;
  onSave: (notes: string) => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const text = notes?.trim() ? notes : null;

  return (
    <>
      {text ? (
        <Tooltip>
          <TooltipTrigger
            delay={200}
            render={
              <button
                type="button"
                className="block max-w-56 truncate text-left text-sm hover:underline"
                onClick={() => setOpen(true)}
              />
            }
          >
            {text}
          </TooltipTrigger>
          <TooltipContent className="max-h-60 max-w-sm flex-col items-start overflow-y-auto whitespace-pre-wrap text-left">
            {text}
          </TooltipContent>
        </Tooltip>
      ) : (
        <button
          type="button"
          className="text-sm text-muted-foreground hover:text-foreground hover:underline"
          onClick={() => setOpen(true)}
        >
          Add a note
        </button>
      )}
      <NoteDialog
        keyword={keyword}
        notes={text}
        open={open}
        onOpenChange={setOpen}
        onSave={onSave}
      />
    </>
  );
}

function NoteDialog({
  keyword,
  notes,
  open,
  onOpenChange,
  onSave,
}: {
  keyword: string;
  notes: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (notes: string) => Promise<unknown>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(notes ?? "");
    setEditing(!notes);
    setSaving(false);
  }, [open, notes]);

  const cancelEditing = () => {
    if (notes) {
      setDraft(notes);
      setEditing(false);
      return;
    }
    onOpenChange(false);
  };

  const updateNote = async () => {
    const next = draft.trim();
    if (next === (notes ?? "")) {
      setEditing(false);
      if (!notes) onOpenChange(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(next);
      onOpenChange(false);
    } catch {
      // The mutation toasts the failure and leaves the dialog open.
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{keyword}</DialogTitle>
          <DialogDescription>
            {editing ? "Edit the note, then update it." : "Notes"}
          </DialogDescription>
        </DialogHeader>
        {editing ? (
          <Textarea
            aria-label={`Notes for ${keyword}`}
            value={draft}
            maxLength={2000}
            placeholder="Write a note"
            className="min-h-32"
            onChange={(event) => setDraft(event.target.value)}
          />
        ) : (
          <p className="max-h-80 overflow-y-auto whitespace-pre-wrap text-sm">
            {notes}
          </p>
        )}
        <DialogFooter>
          {editing ? (
            <>
              <Button
                variant="outline"
                onClick={cancelEditing}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button pending={saving} onClick={() => void updateNote()}>
                Update note
              </Button>
            </>
          ) : (
            <Button onClick={() => setEditing(true)}>Edit note</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TagList({ tags }: { tags: SavedKeywordRow["tags"] }) {
  if (tags.length === 0) {
    return <span className="text-muted-foreground">-</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <TagChip key={tag.id} tag={tag} size="xs" />
      ))}
    </div>
  );
}

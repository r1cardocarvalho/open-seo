import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import { captureClientEvent } from "@/client/lib/posthog";
import {
  refreshSavedKeywordMetrics,
  removeSavedKeywords,
  updateSavedKeywordNote,
  updateSavedKeywordPriority,
  updateSavedKeywordTags,
} from "@/serverFunctions/keywords";
import type { SavedKeywordRow } from "@/types/keywords";

export function useSavedKeywordMutations({
  projectId,
  onRemoved,
  onTagsUpdated,
}: {
  projectId: string;
  onRemoved: () => void;
  onTagsUpdated: () => void;
}) {
  const queryClient = useQueryClient();
  const [removeError, setRemoveError] = useState<string | null>(null);
  const invalidateSavedKeywords = () =>
    queryClient.invalidateQueries({ queryKey: ["savedKeywords", projectId] });

  const removeMutation = useMutation({
    mutationFn: (savedKeywordIds: string[]) =>
      removeSavedKeywords({ data: { projectId, savedKeywordIds } }),
    onSuccess: (result) => {
      onRemoved();
      setRemoveError(null);
      void invalidateSavedKeywords();
      captureClientEvent("saved_keywords:bulk_remove", {
        count: result.deletedCount,
      });
      toast.success(
        `${result.deletedCount} keyword${result.deletedCount !== 1 ? "s" : ""} removed`,
      );
    },
    onError: (error) => {
      setRemoveError(getStandardErrorMessage(error, "Remove failed."));
    },
  });

  const noteMutation = useMutation({
    mutationFn: (input: { savedKeywordId: string; notes: string }) =>
      updateSavedKeywordNote({
        data: { projectId, ...input },
      }),
    onSuccess: (result, input) => {
      queryClient.setQueriesData<{ rows: SavedKeywordRow[] }>(
        { queryKey: ["savedKeywords", projectId] },
        (current) => {
          if (!current) return current;
          return {
            ...current,
            rows: current.rows.map((row) =>
              row.id === input.savedKeywordId
                ? { ...row, notes: result.notes }
                : row,
            ),
          };
        },
      );
    },
    onError: (error) => {
      toast.error(getStandardErrorMessage(error, "Could not save the note."));
    },
  });

  const priorityMutation = useMutation({
    mutationFn: (input: { savedKeywordId: string; priority: number | null }) =>
      updateSavedKeywordPriority({
        data: { projectId, ...input },
      }),
    onSuccess: (result, input) => {
      queryClient.setQueriesData<{ rows: SavedKeywordRow[] }>(
        { queryKey: ["savedKeywords", projectId] },
        (current) => {
          if (!current) return current;
          return {
            ...current,
            rows: current.rows.map((row) =>
              row.id === input.savedKeywordId
                ? { ...row, priority: result.priority }
                : row,
            ),
          };
        },
      );
    },
    onError: (error) => {
      toast.error(
        getStandardErrorMessage(error, "Could not save the priority."),
      );
    },
  });

  const tagMutation = useMutation({
    mutationFn: (input: {
      savedKeywordIds: string[];
      addTags?: string[];
      removeTagIds?: string[];
    }) =>
      updateSavedKeywordTags({
        data: {
          projectId,
          savedKeywordIds: input.savedKeywordIds,
          addTags: input.addTags,
          removeTagIds: input.removeTagIds,
        },
      }),
    onSuccess: (result) => {
      onTagsUpdated();
      void invalidateSavedKeywords();
      toast.success(
        `Updated tags for ${result.taggedCount} keyword${result.taggedCount !== 1 ? "s" : ""}`,
      );
    },
  });

  const refreshMetricsMutation = useMutation({
    mutationFn: () => refreshSavedKeywordMetrics({ data: { projectId } }),
    onSuccess: (result) => {
      void invalidateSavedKeywords();
      toast.success(
        `Updated stats for ${result.updated} keyword${result.updated !== 1 ? "s" : ""}`,
      );
    },
  });

  return {
    removeError,
    removeMutation,
    noteMutation,
    priorityMutation,
    tagMutation,
    refreshMetricsMutation,
  };
}

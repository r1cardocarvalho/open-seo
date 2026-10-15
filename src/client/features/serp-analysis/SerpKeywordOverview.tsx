import { sortBy } from "remeda";
import { CircleHelp } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/client/components/ui/tooltip";
import type { KeywordResearchRow } from "@/types/keywords";

type Overview = Pick<
  KeywordResearchRow,
  "searchVolume" | "keywordDifficulty" | "trend"
>;
const format = (value: number | null | undefined) =>
  value == null ? "—" : new Intl.NumberFormat().format(value);

export function SerpKeywordOverview({
  overview,
  country,
  loading,
}: {
  overview: Overview | null | undefined;
  country?: string;
  loading: boolean;
}) {
  const trend = sortBy(
    overview?.trend ?? [],
    (point) => point.year * 12 + point.month,
  ).slice(-12);
  const maxVolume = Math.max(0, ...trend.map((point) => point.searchVolume));
  const difficulty = overview?.keywordDifficulty;
  const difficultyColor =
    difficulty == null
      ? "text-muted-foreground"
      : difficulty <= 30
        ? "text-emerald-600 dark:text-emerald-400"
        : difficulty <= 60
          ? "text-amber-600 dark:text-amber-400"
          : "text-rose-600 dark:text-rose-400";
  return (
    <section
      aria-label="Keyword overview"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
    >
      <div className="flex items-center justify-between gap-5 rounded-lg border border-sky-500/20 bg-sky-500/5 px-4 py-3">
        <div className="shrink-0">
          <OverviewLabel
            label="Monthly volume"
            description={`Estimated average monthly searches for this keyword in ${country ?? "the selected country"}. This counts searches, not visits to your site. The bars show the available monthly search history, with month and volume on hover. Volume is country-wide, including when the SERP uses a city. A dash means data is unavailable.`}
          />
          <div className="mt-1 text-2xl font-semibold tabular-nums text-sky-600 dark:text-sky-400">
            {loading ? "…" : format(overview?.searchVolume)}
          </div>
          <p className="text-[10px] text-muted-foreground">
            {country} · country-wide
          </p>
        </div>
        <div
          className="flex h-10 max-w-52 flex-1 items-end justify-end gap-1"
          aria-label="Monthly search history"
        >
          {trend.length ? (
            trend.map((point) => (
              <div
                key={`${point.year}-${point.month}`}
                className="min-w-1 max-w-4 flex-1 rounded-t-sm bg-sky-500/60"
                style={{
                  height: `${maxVolume > 0 ? (point.searchVolume / maxVolume) * 100 : 0}%`,
                }}
                title={`${point.year}-${String(point.month).padStart(2, "0")}: ${format(point.searchVolume)} searches`}
              />
            ))
          ) : (
            <span className="text-[10px] text-muted-foreground">
              {loading ? "Loading…" : "No trend data"}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between gap-5 rounded-lg border border-border bg-card px-4 py-3">
        <div className="shrink-0">
          <OverviewLabel
            label="Keyword difficulty"
            description="DataForSEO's estimate of how hard it is to reach Google's top 10 organic results, from 0 to 100. Lower scores suggest less competition; higher scores suggest more. This is a country-level keyword metric, separate from the authority of an individual page. It is an estimate, not a guarantee. A dash means difficulty is unavailable for this keyword or market."
          />
          <div
            className={`mt-1 text-2xl font-semibold tabular-nums ${difficultyColor}`}
          >
            {loading ? "…" : format(difficulty)}
            {difficulty != null && !loading ? (
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                / 100
              </span>
            ) : null}
          </div>
          <p className="text-[10px] text-muted-foreground">
            {difficulty == null
              ? "Country-level estimate"
              : difficulty <= 30
                ? "Lower competition"
                : difficulty <= 60
                  ? "Moderate competition"
                  : "Higher competition"}
          </p>
        </div>
        <div
          className={`flex h-7 max-w-52 flex-1 gap-1 ${difficultyColor}`}
          aria-hidden="true"
        >
          {Array.from({ length: 10 }, (_, i) => (
            <span
              key={i}
              className={`flex-1 rounded-sm ${difficulty != null && difficulty > i * 10 ? "bg-current opacity-70" : "bg-muted"}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function OverviewLabel({
  label,
  description,
}: {
  label: string;
  description: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={<button type="button" />}
        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        aria-label={`About ${label.toLowerCase()}`}
      >
        {label}
        <CircleHelp className="size-3" aria-hidden="true" />
      </TooltipTrigger>
      <TooltipContent className="max-w-80 p-3 leading-relaxed">
        {description}
      </TooltipContent>
    </Tooltip>
  );
}

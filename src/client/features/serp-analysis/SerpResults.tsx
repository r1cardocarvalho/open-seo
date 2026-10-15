import { SerpHeading } from "./SerpHeading";
import { sortBy } from "remeda";
import { CircleHelp, ExternalLink, Globe, Gauge, Network } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/client/components/ui/tooltip";
import { safeHostname, safeHttpUrl } from "@/shared/safe-url";
import type { SerpResultItem } from "@/types/keywords";
import type {
  SerpAuthorityMetrics,
  SerpPageHeading,
} from "@/types/schemas/serp-analysis";

type MetricKey = "domainStrength" | "pageStrength" | "referringDomains";
const metricDetails = {
  domainStrength: {
    label: "Domain strength",
    icon: Globe,
    color: "text-sky-600 dark:text-sky-400",
    background: "bg-sky-500/10",
    border: "border-sky-500/20",
    fill: "bg-sky-500",
    description:
      "DataForSEO's backlink authority score for the whole root domain, on a 0–100 scale. Higher scores mean a stronger backlink profile. This is DataForSEO Rank, not Moz DA or Ahrefs DR, and it does not guarantee a Google ranking.",
  },
  pageStrength: {
    label: "Page strength",
    icon: Gauge,
    color: "text-emerald-600 dark:text-emerald-400",
    background: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    fill: "bg-emerald-500",
    description:
      "DataForSEO's backlink authority score for this specific ranking URL, on a 0–100 scale. Higher scores mean a stronger page backlink profile. It measures link strength, not content quality or the probability of ranking.",
  },
  referringDomains: {
    label: "Referring domains",
    icon: Network,
    color: "text-violet-600 dark:text-violet-400",
    background: "bg-violet-500/10",
    border: "border-violet-500/20",
    fill: "bg-violet-500",
    description:
      "The number of different domains linking to this exact page. Multiple links from the same domain count as one referring domain. The bar compares this count with the highest count among these results.",
  },
};
const metricKeys: MetricKey[] = [
  "domainStrength",
  "pageStrength",
  "referringDomains",
];
const numberFormat = new Intl.NumberFormat();

function MetricLabel({
  metric,
  median = false,
  backlinks,
}: {
  metric: MetricKey;
  median?: boolean;
  backlinks?: number | null;
}) {
  const details = metricDetails[metric];
  const label = `${median ? "Median " : ""}${details.label.toLowerCase()}`;
  return (
    <Tooltip>
      <TooltipTrigger
        delay={150}
        render={<button type="button" />}
        aria-label={`About ${label}`}
        className="inline-flex items-center gap-1 text-left text-[10px] font-medium text-muted-foreground hover:text-foreground focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-ring"
      >
        <span className="first-letter:uppercase">{label}</span>
        <CircleHelp className="size-3 shrink-0 opacity-60" aria-hidden="true" />
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-80 flex-col items-start gap-2 p-3 leading-relaxed"
      >
        <span className="font-semibold capitalize">{label}</span>
        <span>{details.description}</span>
        {metric === "referringDomains" ? (
          <span>
            {median ? "Median backlinks" : "Total backlinks"}:{" "}
            <strong>
              {backlinks == null ? "—" : numberFormat.format(backlinks)}
            </strong>
            . Backlinks count all links to the exact page; one domain can
            contribute multiple links.
          </span>
        ) : null}
        {median ? (
          <span>
            The median is the middle value across results with available data.
            Missing values are excluded.
          </span>
        ) : null}
        <span>
          Missing data is shown as a dash. A zero is a measured value.
        </span>
      </TooltipContent>
    </Tooltip>
  );
}

function Metric({
  metric,
  value,
  maximum,
  median = false,
  available,
  backlinks,
}: {
  metric: MetricKey;
  value: number | null;
  maximum: number;
  median?: boolean;
  available?: number;
  backlinks?: number | null;
}) {
  const details = metricDetails[metric];
  const Icon = details.icon;
  const isStrength = metric === "domainStrength" || metric === "pageStrength";
  const progress =
    value == null
      ? 0
      : Math.min(
          100,
          Math.max(
            0,
            isStrength ? value : maximum > 0 ? (value / maximum) * 100 : 0,
          ),
        );
  return (
    <div
      className={`min-w-0 ${median ? `rounded-lg border px-3 py-2 ${details.background} ${details.border}` : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <MetricLabel metric={metric} median={median} backlinks={backlinks} />
        {median ? (
          <Icon
            className={`size-4 shrink-0 ${details.color}`}
            aria-hidden="true"
          />
        ) : null}
      </div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <div>
          <div
            className={`font-semibold tracking-tight tabular-nums ${median ? "text-xl" : "text-lg"} ${value == null ? "text-muted-foreground/60" : details.color}`}
          >
            {value == null ? "—" : numberFormat.format(value)}
            {isStrength && value != null ? (
              <span className="ml-0.5 text-[10px] font-normal text-muted-foreground">
                / 100
              </span>
            ) : null}
          </div>
          {median ? (
            <p className="text-[10px] text-muted-foreground">
              {available ?? 0} results with data
            </p>
          ) : null}
        </div>
        {isStrength ? (
          <svg
            viewBox="0 0 40 40"
            className={`size-7 shrink-0 -rotate-90 ${details.color}`}
            aria-hidden="true"
          >
            <circle
              cx="20"
              cy="20"
              r="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.5"
              className="opacity-10"
            />
            <circle
              cx="20"
              cy="20"
              r="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.5"
              pathLength="100"
              strokeDasharray={`${progress} 100`}
              strokeLinecap={progress > 0 ? "round" : "butt"}
            />
          </svg>
        ) : (
          <Icon
            className={`size-4 shrink-0 ${details.color} opacity-30`}
            aria-hidden="true"
          />
        )}
      </div>
      {!isStrength ? (
        <div
          className={`mt-1 h-1 overflow-hidden rounded-full ${details.background}`}
          aria-hidden="true"
        >
          <div
            className={`h-full rounded-full ${details.fill}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

function medianValue(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = sortBy(values, (value) => value);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function SerpResults({
  items,
  metrics,
  projectHost,
  headings,
  headingsLoading,
}: {
  items: SerpResultItem[];
  metrics: Map<string, SerpAuthorityMetrics>;
  projectHost: string | null;
  headings: Map<string, SerpPageHeading>;
  headingsLoading: boolean;
}) {
  const values = (metric: MetricKey | "backlinks") =>
    items.flatMap((item) => {
      const value = metrics.get(item.url)?.[metric];
      return value == null ? [] : [value];
    });
  const maximums = Object.fromEntries(
    metricKeys.map((metric) => [metric, Math.max(0, ...values(metric))]),
  );
  return (
    <div className="space-y-4">
      <section aria-label="Backlink profile overview" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold">
            Backlink profile at a glance
          </h3>
          <p className="text-xs text-muted-foreground">
            Medians across available results
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {metricKeys.map((metric) => (
            <Metric
              key={metric}
              metric={metric}
              value={medianValue(values(metric))}
              maximum={maximums[metric]}
              median
              available={values(metric).length}
              backlinks={medianValue(values("backlinks"))}
            />
          ))}
        </div>
      </section>
      <section aria-label="Organic search results" className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">
            Top {items.length} organic results
          </h3>
          <span className="text-xs text-muted-foreground">
            Scores by DataForSEO
          </span>
        </div>
        {items.map((item) => {
          const metric = metrics.get(item.url);
          const href = safeHttpUrl(item.url);
          const host = safeHostname(item.url);
          const ownSite =
            !!projectHost &&
            !!host &&
            (host === projectHost || host.endsWith(`.${projectHost}`));
          return (
            <article
              key={`${item.rank}:${item.url}`}
              className={`overflow-hidden rounded-lg border bg-card p-3 lg:flex lg:items-center lg:gap-6 ${ownSite ? "border-primary/40 ring-1 ring-primary/10" : "border-border"}`}
            >
              <div className="flex min-w-0 items-center gap-3 lg:flex-1">
                <Tooltip>
                  <TooltipTrigger
                    render={<span tabIndex={0} />}
                    aria-label={`Organic position ${item.rank}`}
                    className={`flex size-7 shrink-0 cursor-help items-center justify-center rounded-md border text-xs font-semibold tabular-nums ${item.rank <= 3 ? "border-primary/20 bg-primary/10 text-primary" : "border-border bg-muted text-muted-foreground"}`}
                  >
                    {item.rank}
                  </TooltipTrigger>
                  <TooltipContent>
                    Organic position in Google for this keyword and location.
                    Ads and other result types are excluded.
                  </TooltipContent>
                </Tooltip>
                <div className="min-w-0 flex-1 space-y-1">
                  <h4 className="flex min-w-0 items-center gap-2 text-sm font-medium">
                    {href ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-primary hover:underline"
                        title={item.title || item.url}
                      >
                        {item.title || item.url}
                        <ExternalLink
                          className="ml-1.5 inline size-3.5 opacity-60"
                          aria-hidden="true"
                        />
                      </a>
                    ) : (
                      item.title
                    )}
                    {ownSite ? (
                      <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                        Your site
                      </span>
                    ) : null}
                  </h4>
                  <p
                    className="truncate text-xs text-muted-foreground"
                    title={item.url}
                  >
                    {item.url}
                  </p>
                  <SerpHeading
                    data={headings.get(item.url)}
                    loading={headingsLoading}
                  />
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-x-4 gap-y-2 lg:mt-0 lg:w-[46%] lg:shrink-0">
                {metricKeys.map((key) => (
                  <Metric
                    key={key}
                    metric={key}
                    value={metric?.[key] ?? null}
                    maximum={maximums[key]}
                    backlinks={metric?.backlinks}
                  />
                ))}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}

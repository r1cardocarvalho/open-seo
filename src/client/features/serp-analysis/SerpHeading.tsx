import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/client/components/ui/tooltip";
import type { SerpPageHeading } from "@/types/schemas/serp-analysis";

export function SerpHeading({
  data,
  loading,
}: {
  data?: SerpPageHeading;
  loading: boolean;
}) {
  const text =
    data?.heading ??
    (loading
      ? "Loading…"
      : data?.status === "missing"
        ? "Not found in HTML"
        : "Unavailable");
  const explanation = data?.heading
    ? data.heading
    : loading
      ? "Fetching the page's first H1 heading."
      : data?.status === "missing"
        ? "No non-empty H1 was found in the fetched HTML. Headings added by JavaScript may not be available."
        : "The page could not be read. It may block automated requests, be unavailable, or return a non-HTML response.";
  return (
    <Tooltip>
      <TooltipTrigger
        delay={150}
        render={<span tabIndex={0} />}
        className="block cursor-help truncate text-xs text-muted-foreground focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-ring"
      >
        <span className="mr-1.5 text-[10px] font-medium uppercase text-muted-foreground/60">
          H1
        </span>{" "}
        {text}
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-lg flex-col items-start gap-1 p-3 leading-relaxed [overflow-wrap:anywhere]"
      >
        <span className="font-semibold">First H1 in page HTML</span>
        <span>{explanation}</span>
      </TooltipContent>
    </Tooltip>
  );
}

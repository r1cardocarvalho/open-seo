import { useQuery } from "@tanstack/react-query";
import { Button } from "@/client/components/ui/button";
import { ExportMenu } from "@/client/components/ExportMenu";
import { ErrorState } from "@/client/components/ErrorState";
import { exportRows } from "@/client/lib/exportRows";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import { projectsQueryOptions } from "@/client/features/projects/projectQueries";
import {
  getDetailedSerpAnalysis,
  getSerpHeadings,
  getSerpKeywordOverview,
} from "@/serverFunctions/serp-analysis";
import { getLanguageCode, LOCATION_OPTIONS } from "@/shared/keyword-locations";
import { safeHostname, safeHttpUrl } from "@/shared/safe-url";
import type { SerpPageSearch } from "@/types/schemas/serp-analysis";
import { SerpSearchForm } from "./SerpSearchForm";
import { SerpResults } from "./SerpResults";
import { SerpKeywordOverview } from "./SerpKeywordOverview";

export function SerpAnalysisPage({
  projectId,
  search,
  onSearch,
}: {
  projectId: string;
  search: SerpPageSearch;
  onSearch: (search: SerpPageSearch) => void;
}) {
  const projects = useQuery(projectsQueryOptions());
  const project = projects.data?.find((item) => item.id === projectId);
  const locationCode = search.loc ?? project?.locationCode;
  const languageCode =
    search.lang ??
    (search.loc ? getLanguageCode(search.loc) : project?.languageCode);
  const keyword = search.q?.trim() ?? "";
  const query = useQuery({
    queryKey: [
      "detailedSerpAnalysis",
      projectId,
      keyword,
      locationCode,
      languageCode,
      search.locName,
    ],
    queryFn: () =>
      getDetailedSerpAnalysis({
        data: {
          projectId,
          keyword,
          locationCode,
          languageCode,
          locationName: search.locName,
        },
      }),
    enabled: !!keyword && !!locationCode && !!languageCode,
    staleTime: 12 * 60 * 60 * 1000,
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const overviewQuery = useQuery({
    queryKey: [
      "serpKeywordOverview",
      projectId,
      keyword,
      locationCode,
      languageCode,
    ],
    queryFn: () =>
      getSerpKeywordOverview({
        data: { projectId, keyword, locationCode, languageCode },
      }),
    enabled: !!keyword && !!locationCode && !!languageCode,
    staleTime: 24 * 60 * 60 * 1000,
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const metrics = new Map(
    query.data?.authority.map((item) => [item.url, item]),
  );
  const items = query.data?.items ?? [];
  const headingUrls = [
    ...new Set(
      items.map((item) => item.url).filter((url) => safeHttpUrl(url) !== null),
    ),
  ];
  const headingsQuery = useQuery({
    queryKey: ["serpHeadings", projectId, headingUrls],
    queryFn: () => getSerpHeadings({ data: { projectId, urls: headingUrls } }),
    enabled: headingUrls.length > 0,
    staleTime: 24 * 60 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const headings = new Map(headingsQuery.data?.map((item) => [item.url, item]));
  const projectHost = project?.domain
    ? safeHostname(
        project.domain.includes("://")
          ? project.domain
          : `https://${project.domain}`,
      )
    : null;
  const country = LOCATION_OPTIONS.find(
    (option) => option.code === locationCode,
  )?.label;

  return (
    <div className="overflow-auto p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <div>
          <h1 className="text-xl font-semibold">SERP Analysis</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Compare the top 10 organic results and the backlink strength of each
            ranking page.
          </p>
        </div>
        {locationCode && languageCode ? (
          <SerpSearchForm
            key={`${projectId}:${keyword}:${locationCode}:${languageCode}:${search.locName ?? ""}`}
            keyword={keyword}
            locationCode={locationCode}
            languageCode={languageCode}
            locationName={search.locName}
            busy={query.isFetching}
            onSearch={(next) => {
              if (
                next.q === keyword &&
                next.loc === locationCode &&
                next.lang === languageCode &&
                next.locName === search.locName
              )
                void query.refetch();
              else onSearch(next);
            }}
          />
        ) : (
          <p className="text-sm text-muted-foreground">Loading project…</p>
        )}
        {keyword ? (
          <SerpKeywordOverview
            overview={overviewQuery.data}
            country={country}
            loading={overviewQuery.isLoading}
          />
        ) : null}
        {overviewQuery.isError ? (
          <ErrorState
            variant="inline"
            message={`Keyword overview: ${getStandardErrorMessage(overviewQuery.error, "Could not load keyword metrics.")}`}
            action={
              <Button
                variant="outline"
                size="sm"
                pending={overviewQuery.isFetching}
                onClick={() => void overviewQuery.refetch()}
              >
                Retry overview
              </Button>
            }
          />
        ) : null}
        {projects.isError ? (
          <ErrorState
            message="Could not load the project."
            action={
              <Button variant="outline" onClick={() => void projects.refetch()}>
                Retry
              </Button>
            }
          />
        ) : null}
        {query.isError ? (
          <ErrorState
            message={getStandardErrorMessage(
              query.error,
              "Could not load search results.",
            )}
            action={
              <Button
                variant="outline"
                pending={query.isFetching}
                onClick={() => void query.refetch()}
              >
                Retry analysis
              </Button>
            }
          />
        ) : null}
        {query.isFetching ? (
          <div
            role="status"
            className="rounded-xl border p-8 text-center text-sm text-muted-foreground"
          >
            Analyzing search results and backlink strength…
          </div>
        ) : null}
        {query.data ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">{query.data.requestedKeyword}</h2>
                <p className="text-sm text-muted-foreground">
                  {search.locName ?? country} · {languageCode} · {items.length}{" "}
                  organic results
                </p>
              </div>
              {items.length ? (
                <ExportMenu
                  actions={["csv", "sheets"]}
                  onExport={(exportFormat) =>
                    void exportRows({
                      format: exportFormat,
                      feature: "serp_analysis",
                      headers: [
                        "Position",
                        "Title",
                        "URL",
                        "H1",
                        "Domain strength",
                        "Page strength",
                        "Page referring domains",
                        "Page backlinks",
                      ],
                      rows: items.map((item) => {
                        const m = metrics.get(item.url);
                        return [
                          item.rank,
                          item.title,
                          item.url,
                          headings.get(item.url)?.heading ?? "",
                          m?.domainStrength ?? "",
                          m?.pageStrength ?? "",
                          m?.referringDomains ?? "",
                          m?.backlinks ?? "",
                        ];
                      }),
                      filename: "serp-analysis",
                    })
                  }
                />
              ) : null}
            </div>
            {query.data.authorityError ? (
              <ErrorState
                variant="inline"
                message={`Search results loaded. ${getStandardErrorMessage(new Error(query.data.authorityError), "Authority metrics are unavailable. Check your DataForSEO Backlinks API access.")}`}
                action={
                  <Button
                    variant="outline"
                    pending={query.isFetching}
                    onClick={() => void query.refetch()}
                  >
                    Retry metrics
                  </Button>
                }
              />
            ) : null}
            {items.length ? (
              <SerpResults
                items={items}
                metrics={metrics}
                projectHost={projectHost}
                headings={headings}
                headingsLoading={headingsQuery.isLoading}
              />
            ) : (
              <p className="rounded-xl border p-8 text-center text-sm text-muted-foreground">
                No organic results found for this keyword and location.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Strength scores use DataForSEO Rank on a 0–100 scale. Referring
              domains and backlinks apply to the exact page. Search results are
              cached for 12 hours; keyword metrics for 24 hours; backlink
              metrics for 7 days. A dash means data is unavailable.
            </p>
          </>
        ) : !keyword ? (
          <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
            Enter a keyword and choose a country to analyze its search results.
          </div>
        ) : null}
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { serpPageSearchSchema } from "@/types/schemas/serp-analysis";
import { SerpAnalysisPage } from "@/client/features/serp-analysis/SerpAnalysisPage";

export const Route = createFileRoute("/_app/p/$projectId/serp-analysis")({
  validateSearch: serpPageSearchSchema,
  remountDeps: ({ params }) => params.projectId,
  component: SerpAnalysisRoute,
});

function SerpAnalysisRoute() {
  const { projectId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <SerpAnalysisPage
      projectId={projectId}
      search={search}
      onSearch={(next) => void navigate({ search: next })}
    />
  );
}

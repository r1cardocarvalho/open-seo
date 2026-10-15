import { createFileRoute } from "@tanstack/react-router";
import { CompactKeywordsTemplate } from "@/client/features/keyword-template/CompactKeywordsTemplate";

export const Route = createFileRoute("/_app/p/$projectId/keyword-template")({
  component: CompactKeywordsTemplateRoute,
});

function CompactKeywordsTemplateRoute() {
  const { projectId } = Route.useParams();
  return <CompactKeywordsTemplate projectId={projectId} />;
}

import { getSerpHeadings as getHeadings } from "@/server/features/keywords/services/research/serp-headings";
import { getSerpKeywordOverview as getOverview } from "@/server/features/keywords/services/research/serp-overview";
import { createServerFn } from "@tanstack/react-start";
import { requireProjectContext } from "@/serverFunctions/middleware";
import {
  serpAuthorityInputSchema,
  serpHeadingsInputSchema,
} from "@/types/schemas/serp-analysis";
import { resolveMarket } from "@/shared/keyword-locations";
import { getDetailedSerpAnalysis as analyze } from "@/server/features/keywords/services/research/serp-authority";

export const getDetailedSerpAnalysis = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(serpAuthorityInputSchema)
  .handler(({ data, context }) =>
    analyze(
      {
        ...data,
        ...resolveMarket(data, context.project),
        projectId: context.projectId,
      },
      context,
    ),
  );

export const getSerpKeywordOverview = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(serpAuthorityInputSchema)
  .handler(({ data, context }) =>
    getOverview(
      {
        ...data,
        ...resolveMarket(data, context.project),
        projectId: context.projectId,
      },
      context,
    ),
  );

export const getSerpHeadings = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(serpHeadingsInputSchema)
  .handler(({ data, context }) =>
    getHeadings({ ...data, projectId: context.projectId }, context),
  );

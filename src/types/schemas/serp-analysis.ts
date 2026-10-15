import { safeHttpUrl } from "@/shared/safe-url";
import { z } from "zod";
import { serpAnalysisSchema } from "./keywords";
import {
  isSupportedLocationCode,
  SERP_LANGUAGE_OPTIONS,
} from "@/shared/keyword-locations";

export const serpPageSearchSchema = z.object({
  q: z.string().trim().max(200).optional(),
  loc: z.number().int().refine(isSupportedLocationCode).optional(),
  lang: z
    .string()
    .refine((code) =>
      SERP_LANGUAGE_OPTIONS.some((option) => option.code === code),
    )
    .optional(),
  locName: z.string().trim().min(1).max(200).optional(),
});

export const serpAuthorityInputSchema = serpAnalysisSchema
  .omit({ depth: true })
  .extend({
    keyword: z.string().trim().min(1).max(200),
  });

export const serpAuthorityMetricsSchema = z.object({
  url: z.string(),
  domainStrength: z.number().nullable(),
  pageStrength: z.number().nullable(),
  referringDomains: z.number().nullable(),
  backlinks: z.number().nullable(),
  fetchedAt: z.string(),
});

export type SerpAuthorityMetrics = z.infer<typeof serpAuthorityMetricsSchema>;

export type SerpPageSearch = z.infer<typeof serpPageSearchSchema>;

export const serpHeadingsInputSchema = z.object({
  projectId: z.string().min(1),
  urls: z
    .array(
      z
        .string()
        .max(8192)
        .refine((url) => safeHttpUrl(url) !== null),
    )
    .min(1)
    .max(10),
});

export const serpPageHeadingSchema = z.object({
  url: z.string(),
  heading: z.string().nullable(),
  status: z.enum(["found", "missing", "unavailable"]),
});
export type SerpPageHeading = z.infer<typeof serpPageHeadingSchema>;

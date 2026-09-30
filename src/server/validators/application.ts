import { z } from "zod";
import { mongoIdSchema } from "./common.ts";
import type { ApplicationStage } from "../types/application-types.ts";

export const applicationStages: ApplicationStage[] = [
  "APPLIED",
  "SCREENING",
  "INTERVIEW",
  "OFFERED",
  "REJECTED",
  "WITHDRAWN",
];

export const applicationStageEnum = z.enum(
  ["APPLIED", "SCREENING", "INTERVIEW", "OFFERED", "REJECTED", "WITHDRAWN"],
  {
    errorMap: () => ({
      message: `Invalid stage. Allowed stages are: APPLIED, SCREENING, INTERVIEW, OFFERED, REJECTED, WITHDRAWN`,
    }),
  },
);

export const updateApplicationStageSchema = z.object({
  stage: applicationStageEnum,
});

export const applicationParamsSchema = z.object({
  id: mongoIdSchema,
});

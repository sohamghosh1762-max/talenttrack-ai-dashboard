import { createFileRoute } from "@tanstack/react-router";
import { UnauthorizedView } from "@/components/auth/UnauthorizedView";
import { z } from "zod";

const forbiddenSearchSchema = z.object({
  from: z.string().optional(),
  requiredRole: z.string().optional(),
});

export const Route = createFileRoute("/403")({
  validateSearch: forbiddenSearchSchema,
  head: () => ({
    meta: [
      { title: "Access Restricted (403) — TalentTrack AI" },
      {
        name: "description",
        content: "Access to this resource requires elevated platform permissions.",
      },
    ],
  }),
  component: ForbiddenPage,
});

function ForbiddenPage() {
  const { from, requiredRole } = Route.useSearch();

  return <UnauthorizedView attemptedPath={from} requiredRole={requiredRole} />;
}

import { createFileRoute } from "@tanstack/react-router";
import { UnauthorizedView } from "@/components/auth/UnauthorizedView";
import { z } from "zod";

const unauthorizedSearchSchema = z.object({
  from: z.string().optional(),
  requiredRole: z.string().optional(),
});

export const Route = createFileRoute("/unauthorized")({
  validateSearch: unauthorizedSearchSchema,
  head: () => ({
    meta: [
      { title: "Access Restricted (403) — TalentTrack AI" },
      {
        name: "description",
        content: "Access to this resource requires elevated platform permissions.",
      },
    ],
  }),
  component: UnauthorizedPage,
});

function UnauthorizedPage() {
  const { from, requiredRole } = Route.useSearch();

  return (
    <UnauthorizedView attemptedPath={from || "/admin"} requiredRole={requiredRole || "ADMIN"} />
  );
}

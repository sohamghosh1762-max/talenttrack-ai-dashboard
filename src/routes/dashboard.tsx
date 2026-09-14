import { createFileRoute } from "@tanstack/react-router";
import { TalentDashboard } from "@/components/talent-dashboard";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Recruiter Dashboard — TalentTrack AI" },
      {
        name: "description",
        content: "Track jobs, candidates, applications, interviews, and AI hiring insights.",
      },
    ],
  }),
  component: TalentDashboard,
});

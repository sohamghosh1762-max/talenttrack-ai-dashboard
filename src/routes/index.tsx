import { createFileRoute } from "@tanstack/react-router";
import { TalentDashboard } from "@/components/talent-dashboard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Recruiter Dashboard — TalentTrack AI" },
      { name: "description", content: "Track jobs, candidates, applications, interviews, and AI hiring insights." },
      { property: "og:title", content: "Recruiter Dashboard — TalentTrack AI" },
      { property: "og:description", content: "Track jobs, candidates, applications, interviews, and AI hiring insights." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TalentDashboard,
});

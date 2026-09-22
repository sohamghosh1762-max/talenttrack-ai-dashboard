import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "TalentTrack AI — Platform Administration" },
      {
        name: "description",
        content:
          "Enterprise administration dashboard to monitor users, recruiters, applicants, jobs, pipeline metrics, and system status across the TalentTrack AI platform.",
      },
    ],
  }),
  component: AdminLayout,
});

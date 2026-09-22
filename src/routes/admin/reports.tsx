import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({
    meta: [
      { title: "Platform Reports & Analytics — TalentTrack AI" },
      {
        name: "description",
        content: "Executive analytics, candidate sourcing breakdown, pipeline conversion, and compliance audit reports.",
      },
    ],
  }),
  component: AdminReportsPage,
});

function AdminReportsPage() {
  return <AdminLayout initialNav="Reports" />;
}

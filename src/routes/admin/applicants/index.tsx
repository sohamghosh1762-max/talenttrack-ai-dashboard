import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminApplicantsView } from "@/components/admin/AdminApplicantsView";

export const Route = createFileRoute("/admin/applicants/")({
  head: () => ({
    meta: [
      { title: "Applicants — TalentTrack AI" },
      {
        name: "description",
        content:
          "Manage candidate applicants, profile metadata, resume ATS records, and application status.",
      },
    ],
  }),
  component: AdminApplicantsIndexPage,
});

function AdminApplicantsIndexPage() {
  return (
    <AdminLayout initialNav="Applicants">
      <AdminApplicantsView />
    </AdminLayout>
  );
}

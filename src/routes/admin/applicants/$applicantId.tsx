import { createFileRoute, useParams } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminApplicantDetailView } from "@/components/admin/AdminApplicantDetailView";

export const Route = createFileRoute("/admin/applicants/$applicantId")({
  head: () => ({
    meta: [
      { title: "Applicant Profile Details — TalentTrack AI Admin" },
      {
        name: "description",
        content:
          "Detailed candidate applicant record, profile history, resume parsing status, ATS scoring, and job applications.",
      },
    ],
  }),
  component: AdminApplicantDetailPage,
});

function AdminApplicantDetailPage() {
  const { applicantId } = useParams({ from: "/admin/applicants/$applicantId" });

  return (
    <AdminLayout
      initialNav="Applicants"
      customTitle="Applicant Details"
      customSubtitle="Candidate profile, resume analysis, and application history."
    >
      <AdminApplicantDetailView applicantId={applicantId} />
    </AdminLayout>
  );
}

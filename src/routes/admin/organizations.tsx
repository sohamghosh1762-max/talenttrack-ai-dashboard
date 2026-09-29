import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";

export const Route = createFileRoute("/admin/organizations")({
  head: () => ({
    meta: [
      { title: "Organizations & Multi-Tenancy — TalentTrack AI Admin" },
      {
        name: "description",
        content:
          "Platform administration for enterprise organizations, tenants, member seats, and subscriptions.",
      },
    ],
  }),
  component: AdminOrganizationsPage,
});

function AdminOrganizationsPage() {
  return <AdminLayout initialNav="Organizations" />;
}

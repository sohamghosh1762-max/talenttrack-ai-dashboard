import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";

export const Route = createFileRoute("/admin/users")({
  head: () => ({
    meta: [
      { title: "Users — TalentTrack AI" },
      {
        name: "description",
        content: "Manage platform users, roles, and account statuses.",
      },
    ],
  }),
  component: AdminUsersPage,
});

function AdminUsersPage() {
  return <AdminLayout initialNav="Users" />;
}

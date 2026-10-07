import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({
    meta: [
      { title: "Admin Settings — TalentTrack AI" },
      {
        name: "description",
        content:
          "Configure system settings, authentication tolerances, notifications, file uploads, AI matching engine, security parameters, and preferences.",
      },
    ],
  }),
  component: AdminSettingsPage,
});

function AdminSettingsPage() {
  return <AdminLayout initialNav="Settings" />;
}

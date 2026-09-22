import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";

export const Route = createFileRoute("/admin/activity")({
  head: () => ({
    meta: [
      { title: "System Activity & Audit Logs — TalentTrack AI" },
      {
        name: "description",
        content: "Audit system activity, administrative actions, security logs, and user events.",
      },
    ],
  }),
  component: AdminActivityPage,
});

function AdminActivityPage() {
  return <AdminLayout initialNav="System Activity" />;
}

import { createFileRoute, redirect } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { authStorage } from "@/auth/auth-storage";

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
  beforeLoad: ({ location }) => {
    if (typeof window !== "undefined") {
      const user = authStorage.getCurrentUser();
      if (!user) {
        throw redirect({
          to: "/login",
          search: {
            redirect: location.pathname,
            role: "admin",
            intent: "admin",
          },
        });
      }
    }
  },
  component: AdminLayout,
});

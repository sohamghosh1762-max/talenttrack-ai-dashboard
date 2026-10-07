import { createFileRoute } from "@tanstack/react-router";
import { AccountTypeSelection } from "@/components/auth/AccountTypeSelection";
import { z } from "zod";

const accountTypeSearchSchema = z.object({
  mode: z.enum(["login", "signup"]).optional(),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/account-type")({
  validateSearch: accountTypeSearchSchema,
  head: () => ({
    meta: [
      { title: "Choose Account Type — TalentTrack AI" },
      {
        name: "description",
        content:
          "Select whether you are an Applicant looking for jobs or a Recruiter hiring talent.",
      },
    ],
  }),
  component: AccountTypePage,
});

function AccountTypePage() {
  const { mode = "login", redirect } = Route.useSearch();

  return <AccountTypeSelection mode={mode} redirectPath={redirect} />;
}

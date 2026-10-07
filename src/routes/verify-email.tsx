"use client";

import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { AlertCircle, CheckCircle2, Loader2, Users, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authService } from "@/auth/auth-service";

const verifySearchSchema = z.object({
  token: z.string().optional(),
});

export const Route = createFileRoute("/verify-email")({
  validateSearch: verifySearchSchema,
  head: () => ({
    meta: [
      { title: "Verify Email — TalentTrack AI" },
      { name: "description", content: "Verify your email address for TalentTrack AI." },
    ],
  }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const { token } = Route.useSearch();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    token ? "loading" : "error",
  );
  const [message, setMessage] = useState(
    token ? "Verifying your email..." : "Missing verification token.",
  );

  useEffect(() => {
    if (!token) return;

    let isMounted = true;
    async function verify() {
      const res = await authService.verifyEmail(token as string);
      if (!isMounted) return;

      if (res.success) {
        setStatus("success");
        setMessage(res.message);
      } else {
        setStatus("error");
        setMessage(res.message);
      }
    }

    verify();

    return () => {
      isMounted = false;
    };
  }, [token]);

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2.5 mb-6">
          <div className="relative grid size-9 place-items-center rounded-lg bg-brand-blue text-white">
            <Users className="size-5 text-white" />
            <Sparkles className="absolute -right-0.5 -top-0.5 size-3.5 text-sky-300" />
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground">TalentTrack AI</span>
        </Link>
      </div>

      <div className="mt-4 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-card py-8 px-4 shadow-sm border border-border sm:rounded-xl sm:px-10 text-center space-y-4">
          {status === "loading" && (
            <div className="py-6 space-y-3">
              <Loader2 className="size-8 mx-auto text-brand-blue animate-spin" />
              <h2 className="text-base font-bold text-foreground">Verifying Email Address</h2>
              <p className="text-xs text-muted-foreground">{message}</p>
            </div>
          )}

          {status === "success" && (
            <div className="py-4 space-y-3">
              <div className="flex size-12 mx-auto items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                <CheckCircle2 className="size-6" />
              </div>
              <h2 className="text-base font-bold text-foreground">Email Verified Successfully</h2>
              <p className="text-xs text-muted-foreground">{message}</p>
              <div className="pt-4">
                <Link to="/login">
                  <Button className="w-full bg-brand-blue text-primary-foreground text-xs font-semibold">
                    Continue to Sign In
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="py-4 space-y-3">
              <div className="flex size-12 mx-auto items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <AlertCircle className="size-6" />
              </div>
              <h2 className="text-base font-bold text-foreground">Verification Failed</h2>
              <p className="text-xs text-muted-foreground">{message}</p>
              <div className="pt-4 space-y-2">
                <Link to="/login">
                  <Button variant="outline" className="w-full text-xs">
                    Return to Sign In
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Lock, Mail, Users, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authService } from "@/auth/auth-service";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Forgot Password — TalentTrack AI" },
      { name: "description", content: "Reset your TalentTrack AI account password." },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    setStatusMessage("");

    try {
      const res = await authService.forgotPassword(email);
      setIsSent(true);
      setStatusMessage(res.message);
    } finally {
      setIsSubmitting(false);
    }
  };

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

        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
          Reset your password
        </h1>
        <p className="mt-2 text-xs text-muted-foreground sm:text-sm">
          Enter your registered email address and we will send you secure reset instructions.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-card py-8 px-4 shadow-sm border border-border sm:rounded-xl sm:px-10">
          {isSent ? (
            <div className="text-center space-y-4">
              <div className="flex size-12 mx-auto items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                <CheckCircle2 className="size-6" />
              </div>
              <h2 className="text-base font-bold text-foreground">Check your inbox</h2>
              <p className="text-xs text-muted-foreground">{statusMessage}</p>
              <div className="pt-4">
                <Link to="/login">
                  <Button variant="outline" className="w-full text-xs gap-1.5">
                    <ArrowLeft className="size-3.5" />
                    Back to Sign In
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-xs outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/30"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-10 bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground font-semibold text-xs transition-transform active:scale-[0.99] gap-1.5"
              >
                <Lock className="size-3.5" />
                {isSubmitting ? "Sending Reset Link..." : "Send Reset Link"}
              </Button>

              <div className="pt-2 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium"
                >
                  <ArrowLeft className="size-3.5" />
                  Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

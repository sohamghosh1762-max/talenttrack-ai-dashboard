import { ShieldAlert, ArrowLeft, LogIn, Lock, HelpCircle, Shield } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getResourceContext, getWorkspaceInfoForRole, normalizeRole } from "@/auth/route-access";

interface UnauthorizedViewProps {
  requiredRole?: string | undefined;
  attemptedPath?: string | undefined;
}

export function UnauthorizedView({
  requiredRole,
  attemptedPath = "/admin",
}: UnauthorizedViewProps) {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  const activeRole = role || user?.role || null;
  const normalizedUserRole = normalizeRole(activeRole);
  const resourceContext = getResourceContext(attemptedPath, requiredRole);
  const userWorkspace = getWorkspaceInfoForRole(activeRole);

  const handleLogout = async () => {
    await logout();
    navigate({ to: "/login", search: { redirect: attemptedPath } as Record<string, string> });
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-50/80 px-4 py-12 dark:bg-slate-950 font-sans">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        {/* Top Header Badge */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-5 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 ring-4 ring-rose-50 dark:ring-rose-950/30">
              <ShieldAlert className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                  {resourceContext.title}
                </h1>
                <Badge
                  variant="outline"
                  className="text-[10px] font-mono border-rose-200 text-rose-600 dark:border-rose-900 dark:text-rose-400"
                >
                  403 FORBIDDEN
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {resourceContext.subtitle}
              </p>
            </div>
          </div>
          <div className="hidden sm:flex size-8 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
            <Lock className="size-4" />
          </div>
        </div>

        {/* Diagnostic Information */}
        <div className="my-6 space-y-4">
          <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-4 dark:border-rose-950/40 dark:bg-rose-950/20 text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
              <span className="font-medium text-slate-500 dark:text-slate-400">
                Current Session Account:
              </span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {user?.name || "Anonymous"} ({user?.email || "No email"})
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
              <span className="font-medium text-slate-500 dark:text-slate-400">
                Current Assigned Role:
              </span>
              <span className="inline-flex items-center gap-1 rounded bg-slate-200/80 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-200 uppercase">
                {normalizedUserRole || "UNAUTHENTICATED"}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
              <span className="font-medium text-slate-500 dark:text-slate-400">
                Required Clearance:
              </span>
              <span className="inline-flex items-center gap-1 rounded bg-purple-100 px-2 py-0.5 font-mono text-[11px] font-bold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 uppercase">
                <Shield className="size-3" />
                {resourceContext.requiredRoleLabel}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
              <span className="font-medium text-slate-500 dark:text-slate-400">
                Requested Endpoint:
              </span>
              <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400 truncate max-w-[240px]">
                {attemptedPath}
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {resourceContext.description}
          </p>

          <div className="rounded-lg bg-amber-50/60 border border-amber-200/70 p-3 text-[11px] text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300 flex items-start gap-2">
            <HelpCircle className="size-4 shrink-0 mt-0.5 text-amber-600" />
            <div>
              <span className="font-semibold">Security & Audit Notice:</span>{" "}
              {resourceContext.securityNotice}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <Link to={userWorkspace.path}>
              <Button
                variant="default"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold gap-1.5 h-9"
              >
                <ArrowLeft className="size-3.5" />
                Return to {userWorkspace.name}
              </Button>
            </Link>

            <Link to="/">
              <Button
                variant="outline"
                className="w-full text-xs font-semibold gap-1.5 h-9 border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Return to Home
              </Button>
            </Link>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 underline cursor-pointer"
            >
              <LogIn className="size-3.5" />
              Sign in with a different account
            </button>

            <span className="text-xs text-slate-400">TalentTrack AI Security</span>
          </div>
        </div>
      </div>
    </div>
  );
}

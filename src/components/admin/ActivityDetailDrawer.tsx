import {
  ShieldCheck,
  Clock,
  User,
  Building2,
  Briefcase,
  FileText,
  Settings,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Hash,
  Globe,
} from "lucide-react";
import type { AuditLogRecord, AuditCategory } from "@/data/activityData";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ActivityDetailDrawerProps {
  log: AuditLogRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const categoryIcons: Record<AuditCategory, typeof ShieldCheck> = {
  user: User,
  job: Briefcase,
  application: FileText,
  company: Building2,
  system: Settings,
  security: ShieldCheck,
};

const categoryColors: Record<AuditCategory, string> = {
  user: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800",
  job: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800",
  application:
    "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800",
  company:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
  system:
    "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  security:
    "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
};

export function ActivityDetailDrawer({ log, open, onOpenChange }: ActivityDetailDrawerProps) {
  if (!log) return null;

  const CategoryIcon = categoryIcons[log.category] || ShieldCheck;

  const formattedDate = new Date(log.timestamp).toLocaleString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-6 space-y-6">
        <SheetHeader className="space-y-2 text-left border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center justify-between gap-2">
            <Badge
              variant="outline"
              className={`text-xs capitalize flex items-center gap-1.5 px-2.5 py-1 ${categoryColors[log.category]}`}
            >
              <CategoryIcon className="size-3.5" />
              {log.category} event
            </Badge>

            <Badge
              variant="outline"
              className={`text-xs font-semibold px-2.5 py-0.5 ${
                log.status === "Success"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300"
                  : log.status === "Warning"
                    ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300"
                    : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300"
              }`}
            >
              {log.status === "Success" ? (
                <CheckCircle2 className="size-3 mr-1 text-emerald-600" />
              ) : log.status === "Warning" ? (
                <AlertTriangle className="size-3 mr-1 text-amber-600" />
              ) : (
                <XCircle className="size-3 mr-1 text-rose-600" />
              )}
              {log.status}
            </Badge>
          </div>

          <SheetTitle className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug">
            {log.action}
          </SheetTitle>

          <SheetDescription className="text-xs text-slate-500 dark:text-slate-400">
            Recorded {log.timeAgo}
          </SheetDescription>
        </SheetHeader>

        {/* Narrative Description */}
        <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-3.5 text-xs text-slate-700 leading-relaxed dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300">
          <span className="font-semibold block text-slate-900 dark:text-slate-100 mb-1">
            Audit Narrative
          </span>
          {log.description}
        </div>

        {/* Actor & Target Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Actor Info */}
          <div className="rounded-lg border border-slate-200 p-3.5 space-y-1.5 bg-white dark:border-slate-800 dark:bg-slate-900">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Triggered By (Actor)
            </span>
            <div className="font-bold text-slate-900 dark:text-slate-100 truncate">
              {log.actorName}
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant="secondary" className="text-[10px] font-semibold">
                {log.actorRole}
              </Badge>
              {log.actorEmail && (
                <span className="text-slate-400 truncate text-[11px]">{log.actorEmail}</span>
              )}
            </div>
          </div>

          {/* Target Info */}
          <div className="rounded-lg border border-slate-200 p-3.5 space-y-1.5 bg-white dark:border-slate-800 dark:bg-slate-900">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Target Entity
            </span>
            <div className="font-bold text-slate-900 dark:text-slate-100 truncate">
              {log.targetName}
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-[10px] font-mono">
                {log.targetType}
              </Badge>
              <span className="text-slate-400 text-[10px] font-mono">ID: {log.targetId}</span>
            </div>
          </div>
        </div>

        {/* Log Metadata Parameters */}
        {log.details && (
          <div className="space-y-2 text-xs">
            <span className="font-semibold text-slate-900 dark:text-slate-100 block">
              Event Parameters & Attributes
            </span>
            <div className="rounded-lg border border-slate-200 bg-slate-900 p-3 font-mono text-[11px] text-emerald-400 overflow-x-auto dark:border-slate-800">
              <pre>{JSON.stringify(log.details, null, 2)}</pre>
            </div>
          </div>
        )}

        {/* Technical Audit Properties */}
        <div className="rounded-lg border border-slate-200/80 p-3.5 space-y-2 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-500">
              <Hash className="size-3.5" /> Log Record ID
            </span>
            <span className="font-mono text-slate-900 font-semibold dark:text-slate-200">
              {log.id}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-500">
              <Clock className="size-3.5" /> ISO Timestamp
            </span>
            <span className="font-mono text-slate-900 text-[11px] dark:text-slate-200">
              {formattedDate}
            </span>
          </div>

          {log.ipAddress && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-500">
                <Globe className="size-3.5" /> Network IP Address
              </span>
              <span className="font-mono text-slate-900 dark:text-slate-200">{log.ipAddress}</span>
            </div>
          )}
        </div>

        {/* Cryptographic Compliance Banner */}
        <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3 text-blue-900 text-xs flex items-center gap-2 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300">
          <ShieldCheck className="size-5 text-blue-600 shrink-0" />
          <p className="text-[11px] leading-tight">
            <strong>Immutable Audit Log:</strong> Cryptographically timestamped and sealed according
            to SOC2 and platform compliance policies.
          </p>
        </div>

        <div className="pt-2 flex justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Close Audit Entry
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

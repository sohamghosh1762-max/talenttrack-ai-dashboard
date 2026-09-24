import { ShieldCheck, CheckCircle2, FileText, Award, Lock, Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface ComplianceReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeframe: string;
}

export function ComplianceReportModal({
  open,
  onOpenChange,
  timeframe,
}: ComplianceReportModalProps) {
  const handleDownloadCertificate = () => {
    toast.success("Compliance Audit Certificate generated successfully", {
      description: `Downloaded audit statement for period: ${timeframe}`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-6 space-y-5">
        <DialogHeader className="space-y-2 text-left border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                AI & Hiring Compliance Audit Report
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                SOC2 Type II, EEOC, and Algorithmic Bias Neutrality Audit ({timeframe})
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Audit Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3.5 dark:border-emerald-900/50 dark:bg-emerald-950/30">
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-600 dark:text-slate-400 font-medium">
                AI Bias Neutrality
              </span>
              <Award className="size-4 text-emerald-600" />
            </div>
            <strong className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
              99.4%
            </strong>
            <span className="text-[10.5px] text-emerald-600 block mt-0.5">
              0.00% statistical demographic skew
            </span>
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3.5 dark:border-blue-900/50 dark:bg-blue-950/30">
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-600 dark:text-slate-400 font-medium">
                EEOC Compliance
              </span>
              <CheckCircle2 className="size-4 text-blue-600" />
            </div>
            <strong className="text-xl font-bold text-blue-700 dark:text-blue-300">Verified</strong>
            <span className="text-[10.5px] text-blue-600 block mt-0.5">
              Full fair-hiring standard match
            </span>
          </div>
        </div>

        {/* Audit Evidence Items */}
        <div className="space-y-2.5 text-xs">
          <span className="font-semibold text-slate-900 dark:text-slate-100 block">
            Compliance Evidence Statements
          </span>

          <div className="space-y-2">
            <div className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/40">
              <Lock className="size-4 text-slate-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                  Data Security & Privacy (AES-256)
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                  All candidate resumes and PII encryption keys pass quarterly SOC2 security audits.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/40">
              <FileText className="size-4 text-slate-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                  Automated Audit Trail Logging
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                  100% of administrative user status modifications are recorded with cryptographic
                  timestamps.
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <Badge
            variant="outline"
            className="text-[10px] font-mono text-emerald-600 border-emerald-300"
          >
            Audit Status: PASSED
          </Badge>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Close
            </Button>
            <Button
              size="sm"
              onClick={handleDownloadCertificate}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5"
            >
              <Download className="size-3.5" />
              Download Statement
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

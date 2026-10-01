"use client";

import { Briefcase, UserRound } from "lucide-react";
import type { UserRole } from "@/auth/auth-types";

interface RoleSelectorProps {
  value: UserRole;
  onChange: (role: UserRole) => void;
}

export function RoleSelector({ value, onChange }: RoleSelectorProps) {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-3 gap-3"
      role="radiogroup"
      aria-label="Account Role Selection"
    >
      {/* Recruiter Option */}
      <button
        type="button"
        role="radio"
        aria-checked={value === "recruiter"}
        onClick={() => onChange("recruiter")}
        className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 ${
          value === "recruiter"
            ? "border-brand-blue bg-surface-blue text-foreground shadow-xs ring-1 ring-brand-blue"
            : "border-border bg-card hover:bg-muted/40 text-muted-foreground"
        }`}
      >
        <div
          className={`grid size-9 place-items-center rounded-lg shrink-0 ${
            value === "recruiter"
              ? "bg-brand-blue text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}
        >
          <Briefcase className="size-4.5" />
        </div>
        <div>
          <strong
            className={`block text-xs font-bold ${
              value === "recruiter" ? "text-foreground" : "text-foreground/80"
            }`}
          >
            Recruiter
          </strong>
          <span className="text-[10px] leading-tight text-muted-foreground block mt-0.5">
            Manage hiring pipelines.
          </span>
        </div>
      </button>

      {/* Hiring Manager Option */}
      <button
        type="button"
        role="radio"
        aria-checked={value === "hiring_manager"}
        onClick={() => onChange("hiring_manager")}
        className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 ${
          value === "hiring_manager"
            ? "border-brand-blue bg-surface-blue text-foreground shadow-xs ring-1 ring-brand-blue"
            : "border-border bg-card hover:bg-muted/40 text-muted-foreground"
        }`}
      >
        <div
          className={`grid size-9 place-items-center rounded-lg shrink-0 ${
            value === "hiring_manager"
              ? "bg-brand-blue text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}
        >
          <Briefcase className="size-4.5" />
        </div>
        <div>
          <strong
            className={`block text-xs font-bold ${
              value === "hiring_manager" ? "text-foreground" : "text-foreground/80"
            }`}
          >
            Hiring Manager
          </strong>
          <span className="text-[10px] leading-tight text-muted-foreground block mt-0.5">
            Review candidates & decisions.
          </span>
        </div>
      </button>

      {/* Applicant Option */}
      <button
        type="button"
        role="radio"
        aria-checked={value === "applicant"}
        onClick={() => onChange("applicant")}
        className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 ${
          value === "applicant"
            ? "border-brand-blue bg-surface-blue text-foreground shadow-xs ring-1 ring-brand-blue"
            : "border-border bg-card hover:bg-muted/40 text-muted-foreground"
        }`}
      >
        <div
          className={`grid size-9 place-items-center rounded-lg shrink-0 ${
            value === "applicant"
              ? "bg-brand-blue text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}
        >
          <UserRound className="size-4.5" />
        </div>
        <div>
          <strong
            className={`block text-xs font-bold ${
              value === "applicant" ? "text-foreground" : "text-foreground/80"
            }`}
          >
            Applicant
          </strong>
          <span className="text-[10px] leading-tight text-muted-foreground block mt-0.5">
            Apply & track applications.
          </span>
        </div>
      </button>
    </div>
  );
}

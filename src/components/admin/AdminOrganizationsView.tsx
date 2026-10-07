"use client";

import { useState } from "react";
import {
  Building2,
  Calendar,
  CheckCircle2,
  Filter,
  MoreVertical,
  Plus,
  Search,
  Shield,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface Organization {
  id: string;
  name: string;
  domain: string;
  plan: "Enterprise" | "Growth" | "Starter";
  status: "Active" | "Pending Verification" | "Suspended";
  membersCount: number;
  jobsCount: number;
  applicationsCount: number;
  createdAt: string;
}

export const mockOrganizations: Organization[] = [
  {
    id: "org-1",
    name: "TalentTrack Technologies Inc.",
    domain: "talenttrack.ai",
    plan: "Enterprise",
    status: "Active",
    membersCount: 18,
    jobsCount: 12,
    applicationsCount: 248,
    createdAt: "Jan 15, 2025",
  },
  {
    id: "org-2",
    name: "CloudScale Systems",
    domain: "cloudscale.io",
    plan: "Enterprise",
    status: "Active",
    membersCount: 32,
    jobsCount: 24,
    applicationsCount: 512,
    createdAt: "Feb 02, 2025",
  },
  {
    id: "org-3",
    name: "Nexus AI Labs",
    domain: "nexusai.tech",
    plan: "Growth",
    status: "Active",
    membersCount: 8,
    jobsCount: 6,
    applicationsCount: 94,
    createdAt: "Mar 10, 2025",
  },
  {
    id: "org-4",
    name: "Innovate Global Corp",
    domain: "innovateglobal.com",
    plan: "Growth",
    status: "Pending Verification",
    membersCount: 4,
    jobsCount: 2,
    applicationsCount: 16,
    createdAt: "Sep 20, 2025",
  },
  {
    id: "org-5",
    name: "Apex HyperScale",
    domain: "apexscale.net",
    plan: "Starter",
    status: "Suspended",
    membersCount: 2,
    jobsCount: 0,
    applicationsCount: 3,
    createdAt: "Jun 12, 2025",
  },
];

export function AdminOrganizationsView() {
  const [orgs, setOrgs] = useState<Organization[]>(mockOrganizations);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("All");

  const filteredOrgs = orgs.filter((org) => {
    const matchesSearch =
      org.name.toLowerCase().includes(search.toLowerCase()) ||
      org.domain.toLowerCase().includes(search.toLowerCase());
    const matchesPlan = planFilter === "All" || org.plan === planFilter;
    return matchesSearch && matchesPlan;
  });

  return (
    <div className="space-y-4">
      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          <span className="text-xs text-slate-500 block">Total Tenants</span>
          <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {orgs.length}
          </span>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          <span className="text-xs text-slate-500 block">Active Enterprise</span>
          <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {orgs.filter((o) => o.plan === "Enterprise" && o.status === "Active").length}
          </span>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          <span className="text-xs text-slate-500 block">Total Recruiter Seats</span>
          <span className="text-2xl font-bold text-emerald-600">
            {orgs.reduce((acc, curr) => acc + curr.membersCount, 0)}
          </span>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          <span className="text-xs text-slate-500 block">Pending Verification</span>
          <span className="text-2xl font-bold text-amber-600">
            {orgs.filter((o) => o.status === "Pending Verification").length}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tenant organization by name or domain..."
            className="h-9 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none focus:border-blue-600 dark:border-slate-800 dark:bg-slate-950"
          />
        </div>

        <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50/70 p-1 text-xs dark:border-slate-800 dark:bg-slate-900">
          <Filter className="size-3.5 text-slate-400 ml-1" />
          {["All", "Enterprise", "Growth", "Starter"].map((plan) => (
            <button
              key={plan}
              type="button"
              onClick={() => setPlanFilter(plan)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                planFilter === plan
                  ? "bg-white text-blue-600 shadow-xs dark:bg-slate-800 dark:text-blue-400"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
              }`}
            >
              {plan}
            </button>
          ))}
        </div>
      </div>

      {/* Organizations Table */}
      <div className="rounded-xl border border-slate-200/80 bg-white overflow-hidden shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse text-left text-xs">
            <thead className="bg-slate-50 text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Organization</th>
                <th className="px-3 py-3">Plan / Tier</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Recruiters</th>
                <th className="px-3 py-3">Active Jobs</th>
                <th className="px-3 py-3">Applications</th>
                <th className="px-3 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredOrgs.map((org) => (
                <tr
                  key={org.id}
                  className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="grid size-8 place-items-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 font-bold shrink-0">
                        <Building2 className="size-4" />
                      </div>
                      <div>
                        <strong className="block text-xs font-semibold text-slate-900 dark:text-slate-100">
                          {org.name}
                        </strong>
                        <span className="text-[11px] text-slate-400 font-mono">{org.domain}</span>
                      </div>
                    </div>
                  </td>

                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        org.plan === "Enterprise"
                          ? "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300"
                          : org.plan === "Growth"
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                            : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {org.plan}
                    </span>
                  </td>

                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        org.status === "Active"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                          : org.status === "Pending Verification"
                            ? "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                            : "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
                      }`}
                    >
                      {org.status}
                    </span>
                  </td>

                  <td className="px-3 py-3 font-semibold text-slate-700 dark:text-slate-300">
                    <span className="flex items-center gap-1">
                      <Users className="size-3 text-slate-400" />
                      {org.membersCount}
                    </span>
                  </td>

                  <td className="px-3 py-3 font-semibold text-slate-700 dark:text-slate-300">
                    {org.jobsCount}
                  </td>

                  <td className="px-3 py-3 font-bold text-blue-600 dark:text-blue-400">
                    {org.applicationsCount}
                  </td>

                  <td className="px-3 py-3 text-slate-400 text-[11px] whitespace-nowrap">
                    {org.createdAt}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-7">
                          <MoreVertical className="size-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="cursor-pointer">
                          View Tenant Details
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer">
                          Manage Seat Licenses
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="cursor-pointer text-rose-600 focus:text-rose-600"
                          onSelect={() => {
                            setOrgs(
                              orgs.map((o) =>
                                o.id === org.id
                                  ? {
                                      ...o,
                                      status: o.status === "Active" ? "Suspended" : "Active",
                                    }
                                  : o,
                              ),
                            );
                          }}
                        >
                          {org.status === "Active"
                            ? "Suspend Organization"
                            : "Activate Organization"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useRecruiterAnalytics } from "@/hooks/api/useAnalytics";

const seriesConfig = [
  {
    key: "applications",
    label: "Applications",
    color: "var(--brand-blue)",
    dotColor: "var(--brand-blue)",
  },
  {
    key: "shortlisted",
    label: "Shortlisted",
    color: "var(--brand-green)",
    dotColor: "var(--brand-green)",
  },
  {
    key: "interviewed",
    label: "Interviewed",
    color: "var(--brand-purple)",
    dotColor: "var(--brand-purple)",
  },
  {
    key: "offered",
    label: "Offered",
    color: "var(--brand-orange)",
    dotColor: "var(--brand-orange)",
  },
];

interface ApplicationOverviewProps {
  dateRange?: string;
  jobId?: string;
}

export function ApplicationOverview({ dateRange = "30d", jobId }: ApplicationOverviewProps) {
  const { data: analytics, isLoading } = useRecruiterAnalytics({ range: dateRange, jobId });

  const chartData = analytics?.applicationTrends || [];

  return (
    <section className="dashboard-card flex flex-col h-[286px] min-w-0 overflow-hidden p-3.5">
      <div className="flex items-center justify-between pb-1">
        <h2 className="text-[13.5px] font-bold text-foreground">Application Overview</h2>
        <div className="flex flex-wrap items-center gap-3 text-[9.5px] font-medium text-muted-foreground">
          {seriesConfig.map(({ label, color }) => (
            <span key={label} className="flex items-center gap-1.5">
              <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <span>{label}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="flex-1 w-full min-h-0 pt-2">
        {isLoading ? (
          <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
            Loading application trends...
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
            No application trend data available for this range.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 8, right: 15, left: -20, bottom: 0 }}
            >
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9.5, fill: "var(--muted-foreground)" }}
                axisLine={{ stroke: "var(--border)" }}
                tickLine={false}
              />
              <YAxis
                domain={[0, "auto"]}
                tick={{ fontSize: 9.5, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 11,
                  borderRadius: 8,
                  backgroundColor: "var(--color-card)",
                  borderColor: "var(--color-border)",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
                labelStyle={{ fontWeight: "bold", marginBottom: 4 }}
              />
              <Line
                type="monotone"
                dataKey="applications"
                stroke="var(--brand-blue)"
                strokeWidth={2.2}
                dot={{ r: 3, fill: "var(--brand-blue)" }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="shortlisted"
                stroke="var(--brand-green)"
                strokeWidth={2.2}
                dot={{ r: 3, fill: "var(--brand-green)" }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="interviewed"
                stroke="var(--brand-purple)"
                strokeWidth={2.2}
                dot={{ r: 3, fill: "var(--brand-purple)" }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="offered"
                stroke="var(--brand-orange)"
                strokeWidth={2.2}
                dot={{ r: 3, fill: "var(--brand-orange)" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}


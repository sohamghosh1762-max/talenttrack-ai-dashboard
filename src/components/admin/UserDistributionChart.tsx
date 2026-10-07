import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import type { UserDistributionSegment } from "@/data/adminTypes";
import { userDistributionData } from "@/data/adminData";

interface UserDistributionChartProps {
  data?: UserDistributionSegment[];
}

interface CustomDonutTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: UserDistributionSegment;
  }>;
}

function CustomDonutTooltip({ active, payload }: CustomDonutTooltipProps) {
  if (active && payload && payload.length > 0 && payload[0]) {
    const item = payload[0].payload;
    if (!item) return null;
    return (
      <div className="rounded-lg border border-slate-200/90 bg-white/95 p-2.5 shadow-md backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/95">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ backgroundColor: item.color }} />
          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
            {item.name}
          </span>
        </div>
        <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
          <span className="font-bold">{item.count.toLocaleString()}</span> users ({item.percentage}
          %)
        </div>
      </div>
    );
  }
  return null;
}

export function UserDistributionChart({ data = userDistributionData }: UserDistributionChartProps) {
  const totalCount = data.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-slate-800 dark:bg-slate-900/90 flex flex-col justify-between">
      {/* Header */}
      <div>
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
          User Distribution
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Composition across platform account roles
        </p>
      </div>

      {/* Donut Chart with Centered Metric */}
      <div className="relative my-2 flex items-center justify-center">
        <div className="h-[200px] w-full max-w-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip content={<CustomDonutTooltip />} />
              <Pie
                data={data}
                dataKey="count"
                nameKey="name"
                innerRadius={58}
                outerRadius={84}
                paddingAngle={3}
                stroke="#ffffff"
                strokeWidth={2}
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Center label inside donut */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            {totalCount.toLocaleString()}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Total Users
          </span>
        </div>
      </div>

      {/* Legend & Breakdown */}
      <div className="space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
        {data.map((item) => (
          <div key={item.name} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
              <span className="font-medium text-slate-700 dark:text-slate-300">{item.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {item.count.toLocaleString()}
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 w-10 text-right">
                {item.percentage}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

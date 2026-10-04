import { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { GrowthDataPoint, TimeframeRange } from "@/data/adminTypes";
import { growthChartDataByTimeframe } from "@/data/adminData";

interface PlatformGrowthChartProps {
  initialTimeframe?: TimeframeRange | undefined;
  onTimeframeChange?: ((timeframe: TimeframeRange) => void) | undefined;
  growthDataByTimeframe?: Record<TimeframeRange, GrowthDataPoint[]> | undefined;
  data?: GrowthDataPoint[] | undefined;
}

const timeframes: TimeframeRange[] = ["7 Days", "30 Days", "3 Months", "12 Months"];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  label?: string;
}

function CustomGrowthTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-slate-200/90 bg-white/95 p-3 shadow-lg backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/95">
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">{label}</p>
        <div className="space-y-1 text-xs">
          {payload.map((entry) => (
            <div key={entry.name} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <span className="size-2 rounded-full" style={{ backgroundColor: entry.color }} />
                {entry.name}:
              </span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {entry.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

export function PlatformGrowthChart({
  initialTimeframe = "7 Days",
  onTimeframeChange,
  growthDataByTimeframe,
  data,
}: PlatformGrowthChartProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeRange>(initialTimeframe);

  const handleSelectTimeframe = (tf: TimeframeRange) => {
    setSelectedTimeframe(tf);
    onTimeframeChange?.(tf);
  };

  const chartData: GrowthDataPoint[] =
    (growthDataByTimeframe && growthDataByTimeframe[selectedTimeframe]) ||
    data ||
    growthChartDataByTimeframe[selectedTimeframe] ||
    [];

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-slate-800 dark:bg-slate-900/90 flex flex-col justify-between">
      {/* Chart Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Platform Growth
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            User and recruitment activity over time
          </p>
        </div>

        {/* Timeframe Controls */}
        <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900 self-start sm:self-auto">
          {timeframes.map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => handleSelectTimeframe(tf)}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                selectedTimeframe === tf
                  ? "bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white font-semibold"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Body */}
      <div className="h-[280px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#e2e8f0"
              strokeOpacity={0.7}
            />
            <XAxis
              dataKey="period"
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "#e2e8f0" }}
              dy={5}
            />
            <YAxis
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v)}
            />
            <Tooltip content={<CustomGrowthTooltip />} />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ paddingBottom: 12, fontSize: 11 }}
            />
            <Line
              type="monotone"
              name="Users"
              dataKey="users"
              stroke="#2563eb" // Blue
              strokeWidth={2}
              dot={{ r: 3, fill: "#2563eb", strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
            <Line
              type="monotone"
              name="Jobs"
              dataKey="jobs"
              stroke="#7c3aed" // Violet/Purple
              strokeWidth={2}
              dot={{ r: 3, fill: "#7c3aed", strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
            <Line
              type="monotone"
              name="Applications"
              dataKey="applications"
              stroke="#059669" // Emerald
              strokeWidth={2}
              dot={{ r: 3, fill: "#059669", strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

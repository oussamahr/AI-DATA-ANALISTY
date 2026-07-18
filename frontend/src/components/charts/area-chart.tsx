import {
  Area,
  AreaChart as RechartsAreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_COLORS, chartTheme } from "@/components/charts/theme";

interface AreaChartProps {
  data: { name: string; value: number }[];
  height?: number;
  label?: string;
}

export function AreaChart({ data, height = 280, label = "Value" }: AreaChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsAreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.2} />
            <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
        <XAxis dataKey="name" tick={{ fill: chartTheme.axis, fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: chartTheme.axis, fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: chartTheme.tooltip.background,
            border: `1px solid ${chartTheme.tooltip.border}`,
            borderRadius: "12px",
            fontSize: "13px",
          }}
        />
        <Area type="monotone" dataKey="value" stroke={CHART_COLORS.primary} fill="url(#areaGradient)" strokeWidth={2} name={label} />
      </RechartsAreaChart>
    </ResponsiveContainer>
  );
}

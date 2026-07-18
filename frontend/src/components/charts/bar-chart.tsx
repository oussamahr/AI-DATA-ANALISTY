import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BarChartData } from "@/types";
import { CHART_COLORS, chartTheme } from "@/components/charts/theme";

interface BarChartProps {
  data: BarChartData;
  height?: number;
}

export function BarChart({ data, height = 320 }: BarChartProps) {
  const chartData = data.labels.map((label, i) => ({
    name: label,
    value: Number(data.datasets[0]?.data[i] ?? 0),
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
        <Bar dataKey="value" fill={CHART_COLORS.primary} radius={[6, 6, 0, 0]} name={data.datasets[0]?.label ?? "Value"} />
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}

import {
  CartesianGrid,
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { LineData } from "@/types";
import { CHART_COLORS, chartTheme } from "@/components/charts/theme";

interface LineChartProps {
  data: LineData;
  height?: number;
}

export function LineChart({ data, height = 320 }: LineChartProps) {
  const allX = new Set<string | number>();
  data.series.forEach((s) => s.data.forEach((d) => allX.add(d.x)));
  const chartData = Array.from(allX).map((x) => {
    const point: Record<string, string | number> = { name: String(x) };
    data.series.forEach((s) => {
      const found = s.data.find((d) => d.x === x);
      point[s.label] = found?.y ?? 0;
    });
    return point;
  });

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
        {data.series.map((s, i) => (
          <Line
            key={s.label}
            type="monotone"
            dataKey={s.label}
            stroke={CHART_COLORS.palette[i % CHART_COLORS.palette.length]}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}

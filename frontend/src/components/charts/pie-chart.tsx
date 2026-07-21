import { Cell, Pie, PieChart as RechartsPieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { PieData } from "@/types";
import { CHART_COLORS, chartTheme } from "@/components/charts/theme";

interface PieChartProps {
  data: PieData;
  height?: number;
  donut?: boolean;
}

export function PieChart({ data, height = 280, donut = false }: PieChartProps) {
  const chartData = data.slices.map((slice) => ({
    name: slice.label,
    value: slice.value,
    percent: slice.percent,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsPieChart>
        <Tooltip
          contentStyle={{
            backgroundColor: chartTheme.tooltip.background,
            border: `1px solid ${chartTheme.tooltip.border}`,
            borderRadius: "12px",
            fontSize: "13px",
          }}
          formatter={(value: any, name: any, item: any) => [`${value} (${item?.payload?.percent}%)`, name]}
        />
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={donut ? 60 : 0}
          outerRadius={90}
          paddingAngle={2}
        >
          {chartData.map((_, index) => (
            <Cell key={index} fill={CHART_COLORS.palette[index % CHART_COLORS.palette.length]} />
          ))}
        </Pie>
      </RechartsPieChart>
    </ResponsiveContainer>
  );
}

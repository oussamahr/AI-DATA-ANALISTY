import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useDatasetStore } from "@/stores/datasetStore";
import { GlassCard } from "@/components/common/GlassCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  PieChart,
  TrendingUp,
  Activity,
  Grid3X3,
  Box,
  Minus,
} from "lucide-react";

interface ChartData {
  labels: string[];
  datasets: { label: string; data: number[] }[];
}

interface ChartResponse {
  chart_type: string;
  title: string;
  data: ChartData;
}

const chartTypes = [
  { type: "preview", label: "Auto Preview", icon: PieChart, description: "AI-detects the best chart type" },
  { type: "bar", label: "Bar Chart", icon: BarChart3, description: "Compare categories and values" },
  { type: "histogram", label: "Histogram", icon: Activity, description: "Show distribution of a variable" },
  { type: "scatter", label: "Scatter Plot", icon: TrendingUp, description: "Reveal correlations" },
  { type: "line", label: "Line Chart", icon: Minus, description: "Track trends over time" },
  { type: "pie", label: "Pie Chart", icon: PieChart, description: "Show proportions" },
  { type: "heatmap", label: "Heatmap", icon: Grid3X3, description: "Visualize correlation matrices" },
  { type: "box", label: "Box Plot", icon: Box, description: "Display spread and outliers" },
];

export function VisualizationsPage() {
  const { datasets, fetchDatasets } = useDatasetStore();
  const [selectedDatasetId, setSelectedDatasetId] = useState("");
  const [chartType, setChartType] = useState("preview");
  const [chartData, setChartData] = useState<ChartResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchDatasets();
  }, [fetchDatasets]);

  const generateChart = async (type: string) => {
    if (!selectedDatasetId) return;
    setChartType(type);
    setIsLoading(true);
    try {
      if (type === "preview") {
        const res = await api.get<ChartResponse>(
          `/visualizations/preview/${selectedDatasetId}`
        );
        setChartData(res.data);
      } else {
        const res = await api.post<ChartResponse>(
          `/visualizations/${type}`,
          { dataset_id: selectedDatasetId }
        );
        setChartData(res.data);
      }
    } catch {
      setChartData(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-blur-in">
      <div>
        <h1 className="page-heading">Visualizations</h1>
        <p className="page-subheading mt-1">
          Generate charts and visualizations from your datasets
        </p>
      </div>

      <GlassCard elevation="strong">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-teal-glow border border-teal/20 flex items-center justify-center">
            <BarChart3 className="h-4 w-4 text-teal" />
          </div>
          <p className="section-heading">Generate Chart</p>
        </div>

        <div className="space-y-4">
          <Select
            value={selectedDatasetId}
            onValueChange={setSelectedDatasetId}
          >
            <SelectTrigger className="h-10 rounded-[var(--radius-sm)] bg-glass-bg border-glass-border text-ink text-[13px] focus:border-teal focus:ring-1 focus:ring-teal">
              <SelectValue placeholder="Select a dataset..." />
            </SelectTrigger>
            <SelectContent className="glass-strong border-glass-border text-ink">
              {datasets.map((ds) => (
                <SelectItem key={ds.id} value={ds.id}>
                  {ds.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {chartTypes.map(({ type, label, icon: Icon, description }) => (
              <button
                key={type}
                onClick={() => generateChart(type)}
                disabled={!selectedDatasetId || isLoading}
                className={`group flex flex-col items-start gap-2.5 p-3.5 rounded-[var(--radius-md)] border text-left transition-all duration-200 ease-out hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none ${
                  chartType === type
                    ? "bg-teal-glow border-teal/30 text-ink"
                    : "bg-glass-bg border-glass-border text-ink-dim hover:border-glass-border-strong hover:bg-glass-bg-strong"
                }`}
              >
                <div className={`w-7 h-7 rounded-[var(--radius-sm)] flex items-center justify-center ${
                  chartType === type
                    ? "bg-teal/20 border border-teal/30"
                    : "bg-glass-bg-strong border border-glass-border group-hover:border-glass-border-strong"
                }`}>
                  <Icon className={`h-3.5 w-3.5 ${chartType === type ? "text-teal" : "text-ink-faint group-hover:text-ink-dim"}`} />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-ink">{label}</p>
                  <p className="text-[11px] text-ink-faint mt-0.5">{description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </GlassCard>

      {isLoading && (
        <GlassCard elevation="default" className="text-center py-10">
          <div className="h-6 w-6 border-2 border-glass-border-strong border-t-teal rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[13px] text-ink-dim">Generating chart...</p>
        </GlassCard>
      )}

      {chartData && !isLoading && (
        <GlassCard elevation="default">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-semibold text-ink">
              {chartData.title}
            </h3>
            <Badge
              variant="secondary"
              className="font-mono text-[10px] uppercase"
            >
              {chartData.chart_type}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {chartData.data.labels?.map((label, i) => (
              <div
                key={label}
                className="flex items-center justify-between p-2.5 rounded-[var(--radius-sm)] bg-glass-bg border border-glass-border"
              >
                <span className="text-[13px] text-ink-dim">{label}</span>
                <span className="text-[13px] font-mono font-medium text-ink">
                  {chartData.data.datasets[0]?.data[i]?.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-ink-faint mt-4 font-mono">
            Data rendered as table. Chart rendering integration pending.
          </p>
        </GlassCard>
      )}

      {!chartData && !isLoading && (
        <GlassCard elevation="default" className="text-center py-14">
          <BarChart3 className="h-10 w-10 mx-auto mb-3 text-ink-faint opacity-20" />
          <h3 className="text-[15px] font-semibold text-ink mb-1">
            No chart generated
          </h3>
          <p className="text-[13px] text-ink-dim">
            Select a dataset and chart type above to generate a visualization.
          </p>
        </GlassCard>
      )}
    </div>
  );
}

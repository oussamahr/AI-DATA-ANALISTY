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
  { type: "preview", label: "Auto Preview", icon: PieChart, description: "AI-detects the best chart type for your data" },
  { type: "bar", label: "Bar Chart", icon: BarChart3, description: "Compare categories and values" },
  { type: "histogram", label: "Histogram", icon: Activity, description: "Show distribution of a single variable" },
  { type: "scatter", label: "Scatter Plot", icon: TrendingUp, description: "Reveal correlations between two variables" },
  { type: "line", label: "Line Chart", icon: Minus, description: "Track trends over time or sequence" },
  { type: "pie", label: "Pie Chart", icon: PieChart, description: "Show proportions of a whole" },
  { type: "heatmap", label: "Heatmap", icon: Grid3X3, description: "Visualize correlation matrices" },
  { type: "box", label: "Box Plot", icon: Box, description: "Display spread, median, and outliers" },
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
    <div className="space-y-8 animate-fade-blur-in">
      <div>
        <h1 className="font-display text-[32px] leading-tight font-bold text-ink">
          Visualizations
        </h1>
        <p className="text-sm text-ink-dim mt-1.5">
          Generate charts and visualizations from your datasets
        </p>
      </div>

      <GlassCard elevation="strong">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-[var(--radius-sm)] bg-teal-glow border border-teal/20 flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-teal" />
          </div>
          <h2 className="text-sm font-semibold text-ink-dim uppercase tracking-wider">
            Generate Chart
          </h2>
        </div>

        <div className="space-y-5">
          <Select
            value={selectedDatasetId}
            onValueChange={setSelectedDatasetId}
          >
            <SelectTrigger className="h-11 rounded-full bg-glass-bg border-glass-border text-ink focus:border-teal focus:ring-1 focus:ring-teal">
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

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {chartTypes.map(({ type, label, icon: Icon, description }) => (
              <button
                key={type}
                onClick={() => generateChart(type)}
                disabled={!selectedDatasetId || isLoading}
                className={`group flex flex-col items-start gap-3 p-4 rounded-[var(--radius-md)] border text-left transition-all duration-200 ease-out hover:-translate-y-[2px] active:translate-y-0 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none ${
                  chartType === type
                    ? "bg-teal-glow border-teal/30 text-ink"
                    : "bg-glass-bg border-glass-border text-ink-dim hover:border-glass-border-strong hover:bg-glass-bg-strong"
                }`}
              >
                <div className={`w-9 h-9 rounded-[var(--radius-sm)] flex items-center justify-center ${
                  chartType === type
                    ? "bg-teal/20 border border-teal/30"
                    : "bg-glass-bg-strong border border-glass-border group-hover:border-glass-border-strong"
                }`}>
                  <Icon className={`h-4 w-4 ${chartType === type ? "text-teal" : "text-ink-faint group-hover:text-ink-dim"}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-ink">{label}</p>
                  <p className="text-xs text-ink-faint mt-0.5">{description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </GlassCard>

      {isLoading && (
        <GlassCard elevation="default" className="text-center py-12">
          <div className="h-8 w-8 border-2 border-glass-border-strong border-t-teal rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-ink-dim">Generating chart...</p>
        </GlassCard>
      )}

      {chartData && !isLoading && (
        <GlassCard elevation="default">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display text-base font-bold text-ink">
              {chartData.title}
            </h3>
            <Badge
              variant="secondary"
              className="bg-glass-bg-strong text-ink-dim border border-glass-border font-mono text-[10px] uppercase"
            >
              {chartData.chart_type}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {chartData.data.labels?.map((label, i) => (
              <div
                key={label}
                className="flex items-center justify-between p-3 rounded-[var(--radius-sm)] bg-glass-bg border border-glass-border"
              >
                <span className="text-sm text-ink-dim">{label}</span>
                <span className="text-sm font-mono font-medium text-ink">
                  {chartData.data.datasets[0]?.data[i]?.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-ink-faint mt-5 font-mono">
            Data rendered as table. Chart rendering integration pending.
          </p>
        </GlassCard>
      )}

      {!chartData && !isLoading && (
        <GlassCard elevation="default" className="text-center py-16">
          <BarChart3 className="h-14 w-14 mx-auto mb-4 text-ink-faint opacity-25" />
          <h3 className="font-display text-lg font-bold text-ink mb-2">
            No chart generated
          </h3>
          <p className="text-sm text-ink-dim">
            Select a dataset and chart type above to generate a visualization.
          </p>
        </GlassCard>
      )}
    </div>
  );
}

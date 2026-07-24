import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  LineChart as LineChartIcon,
  Loader2,
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  Activity,
  Download,
  Copy,
  RefreshCw,
  Save,
  Share2,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { PageSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { BarChart } from "@/components/charts/bar-chart";
import { LineChart } from "@/components/charts/line-chart";
import { PieChart } from "@/components/charts/pie-chart";
import { HeatmapPlaceholder } from "@/components/charts/heatmap-placeholder";
import { useDatasets } from "@/hooks/use-api";
import { api } from "@/services/api";
import { getErrorMessage } from "@/utils/cn";
import type { BarChartData, LineData, PieData } from "@/types";

type ChartType = "bar" | "line" | "pie" | "donut" | "heatmap";

interface ChartHistoryItem {
  id: string;
  type: ChartType;
  title: string;
  timestamp: Date;
}

const chartTypeConfig = [
  { value: "bar", label: "Bar Chart", icon: BarChart3, color: "#00D4D4", desc: "Compare categories" },
  { value: "line", label: "Line Chart", icon: TrendingUp, color: "#1FA7A0", desc: "Show trends over time" },
  { value: "pie", label: "Pie Chart", icon: PieChartIcon, color: "#35C98A", desc: "Show proportions" },
  { value: "donut", label: "Donut Chart", icon: PieChartIcon, color: "#00E5D4", desc: "Show proportions (ring)" },
  { value: "heatmap", label: "Heatmap", icon: Activity, color: "#00D4D4", desc: "Show density patterns" },
];

export function VisualizationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get("dataset") ?? "";
  const { data: datasetsData, isLoading } = useDatasets(1, 100);

  const [columns, setColumns] = useState<string[]>([]);
  const [column, setColumn] = useState("");
  const [xColumn, setXColumn] = useState("");
  const [yColumn, setYColumn] = useState("");
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [chartData, setChartData] = useState<BarChartData | LineData | PieData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chartHistory, setChartHistory] = useState<ChartHistoryItem[]>([]);

  useEffect(() => {
    if (!selectedId) return;
    api.getProfile(selectedId)
      .then((p) => setColumns(p.columns.map((c) => c.column_name)))
      .catch(async () => {
        try {
          const preview = await api.getDatasetPreview(selectedId);
          setColumns(Array.from({ length: preview.column_count }, (_, i) => `Column ${i + 1}`));
        } catch {
          setColumns([]);
        }
      });
  }, [selectedId]);

  const renderChart = async () => {
    if (!selectedId) return;
    setLoading(true);
    setError(null);
    try {
      if (chartType === "bar") {
        const data = await api.renderBarChart(selectedId, column || columns[0] || "");
        setChartData(data);
      } else if (chartType === "line") {
        const data = await api.renderLine(
          selectedId,
          xColumn || columns[0] || "",
          yColumn || columns[1] || columns[0] || ""
        );
        setChartData(data);
      } else if (chartType === "pie" || chartType === "donut") {
        const data = await api.renderPieChart(selectedId, column || columns[0] || "");
        setChartData(data);
      } else {
        setChartData(null);
      }

      // Add to history
      const config = chartTypeConfig.find((c) => c.value === chartType);
      setChartHistory((prev) => [
        {
          id: Date.now().toString(),
          type: chartType,
          title: `${config?.label || chartType} - ${column || xColumn || columns[0] || "data"}`,
          timestamp: new Date(),
        },
        ...prev.slice(0, 9),
      ]);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const exportChart = () => {
    if (!chartData) return;
    const dataStr = JSON.stringify(chartData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chart-${chartType}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyChartData = async () => {
    if (!chartData) return;
    await navigator.clipboard.writeText(JSON.stringify(chartData, null, 2));
  };

  const selectedChartConfig = chartTypeConfig.find((c) => c.value === chartType);

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="page-container space-y-6">
      <div>
        <h1 className="page-title">Visualizations</h1>
        <p className="page-subtitle">Create beautiful charts from your datasets</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Chart Builder */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Chart Builder</CardTitle>
              <CardDescription>Configure and render your chart</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Dataset Selection */}
              <div className="space-y-2">
                <Label>Dataset</Label>
                <Select value={selectedId} onValueChange={(v) => setSearchParams({ dataset: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select dataset" />
                  </SelectTrigger>
                  <SelectContent>
                    {(datasetsData?.items ?? []).map((ds) => (
                      <SelectItem key={ds.id} value={ds.id}>
                        <div className="flex flex-col">
                          <span>{ds.name}</span>
                          <span className="text-xs text-muted">{ds.row_count ?? 0} rows</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Chart Type Selection */}
              <div className="space-y-2">
                <Label>Chart Type</Label>
                <Select value={chartType} onValueChange={(v) => setChartType(v as ChartType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {chartTypeConfig.map((config) => {
                      const Icon = config.icon;
                      return (
                        <SelectItem key={config.value} value={config.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4" style={{ color: config.color }} />
                            <div className="flex flex-col">
                              <span>{config.label}</span>
                              <span className="text-xs text-muted">{config.desc}</span>
                            </div>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Column Selection for Bar/Pie/Donut */}
              {(chartType === "bar" || chartType === "pie" || chartType === "donut") && (
                <div className="space-y-2">
                  <Label>Column</Label>
                  <Select value={column} onValueChange={setColumn}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* X/Y Column Selection for Line */}
              {chartType === "line" && (
                <>
                  <div className="space-y-2">
                    <Label>X Column</Label>
                    <Select value={xColumn} onValueChange={setXColumn}>
                      <SelectTrigger>
                        <SelectValue placeholder="X axis" />
                      </SelectTrigger>
                      <SelectContent>
                        {columns.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Y Column</Label>
                    <Select value={yColumn} onValueChange={setYColumn}>
                      <SelectTrigger>
                        <SelectValue placeholder="Y axis" />
                      </SelectTrigger>
                      <SelectContent>
                        {columns.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {/* Render Button */}
              <Button
                className="w-full"
                onClick={renderChart}
                disabled={!selectedId || loading}
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin mr-2" />
                ) : (
                  <BarChart3 className="size-4 mr-2" />
                )}
                Render Chart
              </Button>

              {/* Export Actions */}
              {chartData && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={exportChart}>
                    <Download className="size-3 mr-1" />
                    Export
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" onClick={copyChartData}>
                    <Copy className="size-3 mr-1" />
                    Copy
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chart History */}
          {chartHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Charts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {chartHistory.map((item) => {
                  const config = chartTypeConfig.find((c) => c.value === item.type);
                  const Icon = config?.icon || BarChart3;
                  return (
                    <motion.div
                      key={item.id}
                      className="flex items-center gap-2 rounded-lg border border-border/60 p-2 text-sm"
                      whileHover={{ backgroundColor: "rgba(254,250,239,0.05)" }}
                    >
                      <Icon className="w-4 h-4" style={{ color: config?.color }} />
                      <div className="flex-1 truncate">{item.title}</div>
                      <Badge variant="outline" className="text-xs">
                        {item.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </Badge>
                    </motion.div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Chart Preview */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Preview</CardTitle>
                {selectedChartConfig && (
                  <CardDescription>
                    {selectedChartConfig.label} · {selectedChartConfig.desc}
                  </CardDescription>
                )}
              </div>
              {chartData && (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={exportChart}>
                    <Save className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={copyChartData}>
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedId ? (
              <EmptyState
                icon={LineChartIcon}
                title="Select a dataset"
                description="Choose a dataset and chart type to visualize your data."
              />
            ) : error ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-xl border border-danger/20 bg-danger/5 p-4 text-center"
              >
                <p className="text-sm text-danger">{error}</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => setError(null)}>
                  Dismiss
                </Button>
              </motion.div>
            ) : chartType === "heatmap" ? (
              <HeatmapPlaceholder title="Correlation Heatmap" />
            ) : chartData && "labels" in chartData ? (
              <BarChart data={chartData} />
            ) : chartData && "series" in chartData ? (
              <LineChart data={chartData} />
            ) : chartData && "slices" in chartData ? (
              <PieChart data={chartData} donut={chartType === "donut"} />
            ) : (
              <div className="py-12 text-center">
                <BarChart3 className="w-12 h-12 mx-auto text-muted/30 mb-3" />
                <p className="text-sm text-muted">Configure options and click Render Chart</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

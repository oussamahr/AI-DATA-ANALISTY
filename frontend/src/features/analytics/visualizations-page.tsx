import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { LineChart as LineChartIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { PageSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { BarChart } from "@/components/charts/bar-chart";
import { LineChart } from "@/components/charts/line-chart";
import { PieChart } from "@/components/charts/pie-chart";
import { HeatmapPlaceholder } from "@/components/charts/heatmap-placeholder";
import { useDatasets } from "@/hooks/use-api";
import { api } from "@/services/api";
import { getErrorMessage } from "@/utils/cn";
import type { BarChartData, LineData, PieData } from "@/types";

type ChartType = "bar" | "line" | "pie" | "donut" | "heatmap";

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
        const data = await api.renderLine(selectedId, xColumn || columns[0] || "", yColumn || columns[1] || columns[0] || "");
        setChartData(data);
      } else if (chartType === "pie" || chartType === "donut") {
        const data = await api.renderPieChart(selectedId, column || columns[0] || "");
        setChartData(data);
      } else {
        setChartData(null);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="page-container space-y-6">
      <div>
        <h1 className="page-title">Visualizations</h1>
        <p className="page-subtitle">Create beautiful charts from your datasets</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Chart Builder</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Dataset</Label>
              <Select value={selectedId} onValueChange={(v) => setSearchParams({ dataset: v })}>
                <SelectTrigger><SelectValue placeholder="Select dataset" /></SelectTrigger>
                <SelectContent>
                  {(datasetsData?.items ?? []).map((ds) => (
                    <SelectItem key={ds.id} value={ds.id}>{ds.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Chart Type</Label>
              <Select value={chartType} onValueChange={(v) => setChartType(v as ChartType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bar">Bar Chart</SelectItem>
                  <SelectItem value="line">Line Chart</SelectItem>
                  <SelectItem value="pie">Pie Chart</SelectItem>
                  <SelectItem value="donut">Donut Chart</SelectItem>
                  <SelectItem value="heatmap">Heatmap</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(chartType === "bar" || chartType === "pie" || chartType === "donut") && (
              <div className="space-y-2">
                <Label>Column</Label>
                <Select value={column} onValueChange={setColumn}>
                  <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                  <SelectContent>
                    {columns.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {chartType === "line" && (
              <>
                <div className="space-y-2">
                  <Label>X Column</Label>
                  <Select value={xColumn} onValueChange={setXColumn}>
                    <SelectTrigger><SelectValue placeholder="X axis" /></SelectTrigger>
                    <SelectContent>
                      {columns.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Y Column</Label>
                  <Select value={yColumn} onValueChange={setYColumn}>
                    <SelectTrigger><SelectValue placeholder="Y axis" /></SelectTrigger>
                    <SelectContent>
                      {columns.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <Button className="w-full" onClick={renderChart} disabled={!selectedId || loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : "Render Chart"}
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader><CardTitle>Preview</CardTitle></CardHeader>
          <CardContent>
            {!selectedId ? (
              <EmptyState icon={LineChartIcon} title="Select a dataset" description="Choose a dataset and chart type to visualize your data." />
            ) : error ? (
              <p className="py-12 text-center text-sm text-danger">{error}</p>
            ) : chartType === "heatmap" ? (
              <HeatmapPlaceholder title="Correlation Heatmap" />
            ) : chartData && "labels" in chartData ? (
              <BarChart data={chartData} />
            ) : chartData && "series" in chartData ? (
              <LineChart data={chartData} />
            ) : chartData && "slices" in chartData ? (
              <PieChart data={chartData} donut={chartType === "donut"} />
            ) : (
              <p className="py-12 text-center text-sm text-muted">Configure options and click Render Chart</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

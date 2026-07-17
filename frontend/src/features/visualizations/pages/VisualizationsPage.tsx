import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDatasets } from "@/features/datasets/hooks";
import { useQuery } from "@tanstack/react-query";
import { vizApi } from "../api";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, ScatterChart, Scatter, PieChart, Pie, Cell } from "recharts";
import { formatApiError } from "@/lib/api-error";

const COLORS = ["hsl(var(--primary))", "hsl(var(--primary) / 0.7)", "hsl(var(--primary) / 0.5)", "#8884d8", "#82ca9d", "#ffc658", "#ff7f50"];

export function VisualizationsPage() {
  const [params] = useSearchParams();
  const [datasetId, setDatasetId] = useState<string>(params.get("dataset") || "");
  const [column, setColumn] = useState("");
  const [xColumn, setXColumn] = useState("");
  const [yColumn, setYColumn] = useState("");

  const { data: datasets } = useDatasets(1, 100);

  const barQuery = useQuery({
    queryKey: ["viz", "bar", datasetId, column],
    queryFn: () => vizApi.bar(datasetId, column, 20),
    enabled: !!datasetId && !!column,
  });

  const histQuery = useQuery({
    queryKey: ["viz", "hist", datasetId, column],
    queryFn: () => vizApi.histogram(datasetId, column, 20),
    enabled: !!datasetId && !!column,
  });

  const scatterQuery = useQuery({
    queryKey: ["viz", "scatter", datasetId, xColumn, yColumn],
    queryFn: () => vizApi.scatter(datasetId, xColumn, yColumn, 500),
    enabled: !!datasetId && !!xColumn && !!yColumn,
  });

  const pieQuery = useQuery({
    queryKey: ["viz", "pie", datasetId, column],
    queryFn: () => vizApi.pie(datasetId, column, 10),
    enabled: !!datasetId && !!column,
  });

  const previewQuery = useQuery({
    queryKey: ["viz", "preview", datasetId],
    queryFn: () => vizApi.preview(datasetId),
    enabled: !!datasetId,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Visualizations" description="Server-side chart data, client-rendered with Recharts. Row limits and timeouts enforced backend." />

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Dataset & Columns</CardTitle><CardDescription>All queries are tenant-scoped and respect PII redaction settings</CardDescription></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label>Dataset</Label>
            <Select value={datasetId} onValueChange={setDatasetId}>
              <SelectTrigger><SelectValue placeholder="Select dataset" /></SelectTrigger>
              <SelectContent>{datasets?.items.map(ds => <SelectItem key={ds.id} value={ds.id}>{ds.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Column (bar/hist/pie)</Label>
            <Input value={column} onChange={e => setColumn(e.target.value)} placeholder="e.g. revenue, category" />
          </div>
          <div className="space-y-2">
            <Label>X column (scatter/line)</Label>
            <Input value={xColumn} onChange={e => setXColumn(e.target.value)} placeholder="e.g. date, x" />
          </div>
          <div className="space-y-2">
            <Label>Y column</Label>
            <Input value={yColumn} onChange={e => setYColumn(e.target.value)} placeholder="e.g. value, y" />
          </div>
        </CardContent>
      </Card>

      {!datasetId ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground text-sm">Select a dataset to visualize</CardContent></Card>
      ) : (
        <Tabs defaultValue="preview" className="w-full">
          <TabsList className="w-full justify-start overflow-auto">
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="bar">Bar</TabsTrigger>
            <TabsTrigger value="hist">Histogram</TabsTrigger>
            <TabsTrigger value="scatter">Scatter</TabsTrigger>
            <TabsTrigger value="pie">Pie</TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="mt-4">
            {previewQuery.isLoading ? <LoadingSpinner /> : previewQuery.error ? (
              <Card><CardContent className="py-8 text-sm text-muted-foreground">{formatApiError(previewQuery.error).userMessage}</CardContent></Card>
            ) : previewQuery.data ? (
              <div className="space-y-2">
                <Card><CardHeader><CardTitle className="text-base">{previewQuery.data.dataset_name}</CardTitle><CardDescription>{previewQuery.data.row_count.toLocaleString()} rows • {previewQuery.data.column_count} columns</CardDescription></CardHeader></Card>
                <div className="text-xs text-muted-foreground">Auto-generated preview charts from backend sampling</div>
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value="bar" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Bar Chart: {column || "—"}</CardTitle></CardHeader>
              <CardContent>
                {barQuery.isLoading ? <LoadingSpinner /> : barQuery.error ? <p className="text-sm text-destructive">{formatApiError(barQuery.error).userMessage}</p> : barQuery.data ? (
                  <div className="h-[360px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barQuery.data.labels.map((l, i) => ({ name: l, value: barQuery.data.datasets[0]?.data[i] }))}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <ReTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4,4,0,0] as any} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : <p className="text-sm text-muted-foreground">Enter column and run query</p>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hist" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Histogram: {column || "—"}</CardTitle></CardHeader>
              <CardContent>
                {histQuery.isLoading ? <LoadingSpinner /> : histQuery.error ? <p className="text-sm text-destructive">{formatApiError(histQuery.error).userMessage}</p> : histQuery.data ? (
                  <div className="h-[360px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={histQuery.data.bins.map((b: any) => ({ range: `${b.bin_start?.toFixed?.(1) ?? b.bin_start}-${b.bin_end?.toFixed?.(1) ?? b.bin_end}`, count: b.count }))}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="range" tick={{ fontSize: 10 }} interval={2} />
                        <YAxis />
                        <ReTooltip />
                        <Bar dataKey="count" fill="hsl(var(--primary))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : <p className="text-sm text-muted-foreground">Enter numeric column</p>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scatter" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Scatter: {xColumn} vs {yColumn}</CardTitle></CardHeader>
              <CardContent>
                {scatterQuery.isLoading ? <LoadingSpinner /> : scatterQuery.error ? <p className="text-sm text-destructive">{formatApiError(scatterQuery.error).userMessage}</p> : scatterQuery.data ? (
                  <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart>
                        <CartesianGrid stroke="hsl(var(--border))" />
                        <XAxis dataKey="x" name={scatterQuery.data.x_column} />
                        <YAxis dataKey="y" name={scatterQuery.data.y_column} />
                        <ReTooltip />
                        <Scatter data={scatterQuery.data.points.map(p => ({ x: p.x, y: p.y }))} fill="hsl(var(--primary))" />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                ) : <p className="text-sm text-muted-foreground">Provide X and Y numeric columns (limit 1000 points)</p>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pie" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Pie: {column || "—"}</CardTitle></CardHeader>
              <CardContent>
                {pieQuery.isLoading ? <LoadingSpinner /> : pieQuery.error ? <p className="text-sm text-destructive">{formatApiError(pieQuery.error).userMessage}</p> : pieQuery.data ? (
                  <div className="h-[380px] w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieQuery.data.slices} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={120} label={(props: any) => `${props.label}: ${((props.percent || 0)*100).toFixed(0)}%`}>
                          {pieQuery.data.slices.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                        </Pie>
                        <ReTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : <p className="text-sm text-muted-foreground">Categorical column distribution</p>}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

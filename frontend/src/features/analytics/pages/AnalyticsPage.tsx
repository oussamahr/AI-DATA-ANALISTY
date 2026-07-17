import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDatasets } from "@/features/datasets/hooks";
import { useProfile, useRunProfile, useRunCorrelation, useAiInsights, useRunAiInsights, useAnalysisRuns } from "../hooks";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Activity, BarChart2, Brain, Play, Database, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { formatApiError } from "@/lib/api-error";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function AnalyticsPage() {
  const [params] = useSearchParams();
  const initialDataset = params.get("dataset") || "";
  const [selectedDataset, setSelectedDataset] = useState<string>(initialDataset);

  const { data: datasets } = useDatasets(1, 100);
  const { data: profile, isLoading: profileLoading, error: profileError } = useProfile(selectedDataset, !!selectedDataset);
  const { data: insights, isLoading: insightsLoading } = useAiInsights(selectedDataset);
  const { data: runs } = useAnalysisRuns(selectedDataset);

  const runProfile = useRunProfile();
  const runCorrelation = useRunCorrelation();
  const runInsights = useRunAiInsights();

  const handleProfile = async () => {
    if (!selectedDataset) { toast.error("Select a dataset first"); return; }
    try {
      await runProfile.mutateAsync({ datasetId: selectedDataset });
      toast.success("Profile generated");
    } catch (e) { toast.error(formatApiError(e).userMessage); }
  };

  const handleCorrelate = async () => {
    if (!selectedDataset) return;
    try {
      await runCorrelation.mutateAsync(selectedDataset);
      toast.success("Correlation analysis complete");
    } catch (e) { toast.error(formatApiError(e).userMessage); }
  };

  const handleInsights = async () => {
    if (!selectedDataset) return;
    try {
      await runInsights.mutateAsync(selectedDataset);
      toast.success("AI insights generated");
    } catch (e) { toast.error(formatApiError(e).userMessage); }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" description="Profile, correlations, and AI insights. All operations tenant-scoped and audit-logged." />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Database className="h-4 w-4" /> Select dataset</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Select value={selectedDataset} onValueChange={setSelectedDataset}>
            <SelectTrigger className="w-full max-w-md"><SelectValue placeholder="Choose dataset to analyze" /></SelectTrigger>
            <SelectContent>
              {datasets?.items.map((ds) => <SelectItem key={ds.id} value={ds.id}>{ds.name} • {ds.row_count ?? "?"} rows</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {!selectedDataset ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">Select a dataset to start analysis</CardContent></Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center mb-2"><Activity className="h-4 w-4 text-primary" /></div>
                <CardTitle className="text-sm">Data Profiling</CardTitle>
                <CardDescription className="text-xs">Nulls, uniques, types, stats</CardDescription>
              </CardHeader>
              <CardContent><Button className="w-full" size="sm" onClick={handleProfile} disabled={runProfile.isPending}>{runProfile.isPending ? <LoadingSpinner /> : <><Play className="mr-2 h-3 w-3" /> Run Profile</>}</Button></CardContent>
            </Card>

            <Card className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-8 w-8 rounded bg-secondary flex items-center justify-center mb-2"><BarChart2 className="h-4 w-4" /></div>
                <CardTitle className="text-sm">Correlation</CardTitle>
                <CardDescription className="text-xs">Numeric relationships</CardDescription>
              </CardHeader>
              <CardContent><Button className="w-full" size="sm" variant="secondary" onClick={handleCorrelate} disabled={runCorrelation.isPending}>{runCorrelation.isPending ? <LoadingSpinner /> : <><Play className="mr-2 h-3 w-3" /> Analyze</>}</Button></CardContent>
            </Card>

            <Card className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-8 w-8 rounded bg-amber-500/10 flex items-center justify-center mb-2"><Brain className="h-4 w-4 text-amber-600" /></div>
                <CardTitle className="text-sm">AI Insights</CardTitle>
                <CardDescription className="text-xs">LLM-generated observations</CardDescription>
              </CardHeader>
              <CardContent><Button className="w-full" size="sm" variant="outline" onClick={handleInsights} disabled={runInsights.isPending}>{runInsights.isPending ? <LoadingSpinner /> : <><Play className="mr-2 h-3 w-3" /> Generate</>}</Button></CardContent>
            </Card>
          </div>

          <Tabs defaultValue="profile" className="w-full">
            <TabsList><TabsTrigger value="profile">Profile</TabsTrigger><TabsTrigger value="insights">AI Insights</TabsTrigger><TabsTrigger value="runs">History</TabsTrigger></TabsList>

            <TabsContent value="profile" className="space-y-4 mt-4">
              {profileLoading ? <LoadingSpinner text="Loading profile..." /> : profileError ? (
                <Card><CardContent className="py-12 text-center"><AlertTriangle className="h-8 w-8 mx-auto text-muted-foreground mb-2" /><p className="text-sm text-muted-foreground">No profile yet. Run profiling above.</p></CardContent></Card>
              ) : profile ? (
                <Card>
                  <CardHeader><CardTitle className="text-base">{profile.dataset_name} • {profile.row_count.toLocaleString()} rows • {profile.column_count} columns</CardTitle><CardDescription>Generated {new Date(profile.generated_at).toLocaleString()}</CardDescription></CardHeader>
                  <CardContent className="overflow-auto">
                    <Table>
                      <TableHeader><TableRow><TableHead>Column</TableHead><TableHead>Type</TableHead><TableHead>Null %</TableHead><TableHead>Unique %</TableHead><TableHead>Mean</TableHead><TableHead>Top Values</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {profile.columns.map((col) => (
                          <TableRow key={col.column_name}>
                            <TableCell className="font-medium">{col.column_name}</TableCell>
                            <TableCell><Badge variant="outline" className="text-[11px]">{col.dtype}</Badge></TableCell>
                            <TableCell>{col.null_percent}%</TableCell>
                            <TableCell>{col.unique_percent}%</TableCell>
                            <TableCell>{col.mean?.toFixed(2) ?? "—"}</TableCell>
                            <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">{col.top_values?.slice(0,2).map((v: any) => v.value ?? v.count ?? JSON.stringify(v)).join(", ") || "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ) : null}
            </TabsContent>

            <TabsContent value="insights" className="space-y-4 mt-4">
              {insightsLoading ? <LoadingSpinner /> : !insights ? (
                <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">No AI insights yet. Generate above.</CardContent></Card>
              ) : (
                <div className="space-y-4">
                  <Card><CardHeader><CardTitle className="text-base">Summary</CardTitle></CardHeader><CardContent><p className="text-sm leading-relaxed">{insights.summary}</p></CardContent></Card>
                  <div className="grid gap-3">
                    {insights.insights.map((ins, idx) => (
                      <Card key={idx}><CardHeader className="pb-2"><div className="flex items-start justify-between gap-2"><CardTitle className="text-sm">{ins.title}</CardTitle><Badge variant={ins.severity === "high" ? "destructive" : ins.severity === "medium" ? "warning" : "secondary"}>{ins.severity}</Badge></div><CardDescription className="text-xs">{ins.type}</CardDescription></CardHeader><CardContent><p className="text-sm">{ins.description}</p>{ins.recommendation && <p className="text-xs mt-2 text-muted-foreground">💡 {ins.recommendation}</p>}</CardContent></Card>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="runs" className="mt-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Analysis history</CardTitle></CardHeader>
                <CardContent>
                  {!runs || runs.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">No runs yet</p> : (
                    <Table><TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Started</TableHead><TableHead>Completed</TableHead></TableRow></TableHeader><TableBody>{runs.map((r) => <TableRow key={r.id}><TableCell><Badge variant="outline">{r.analysis_type}</Badge></TableCell><TableCell><Badge variant={r.status === "completed" ? "success" : r.status === "failed" ? "destructive" : "secondary"}>{r.status}</Badge></TableCell><TableCell className="text-xs">{new Date(r.started_at).toLocaleString()}</TableCell><TableCell className="text-xs">{r.completed_at ? new Date(r.completed_at).toLocaleString() : "—"}</TableCell></TableRow>)}</TableBody></Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

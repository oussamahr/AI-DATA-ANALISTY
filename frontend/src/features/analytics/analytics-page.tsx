import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, Sparkles, TrendingUp, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useDatasets } from "@/hooks/use-api";
import { api } from "@/services/api";
import { getErrorMessage } from "@/utils/cn";
import type { AIInsightResponse, AnalysisReport, CorrelationResponse, DatasetProfileResponse } from "@/types";

export function AnalyticsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get("dataset") ?? "";
  const { data: datasetsData, isLoading } = useDatasets(1, 100);

  const [profile, setProfile] = useState<DatasetProfileResponse | null>(null);
  const [correlations, setCorrelations] = useState<CorrelationResponse | null>(null);
  const [insights, setInsights] = useState<AIInsightResponse | null>(null);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runAction = async (action: "profile" | "correlate" | "insights" | "analyze") => {
    if (!selectedId) return;
    setLoading(action);
    setError(null);
    try {
      if (action === "profile") {
        const r = await api.profileDataset(selectedId);
        if ("columns" in r) setProfile(r);
      } else if (action === "correlate") {
        const r = await api.correlateDataset(selectedId);
        if ("correlations" in r) setCorrelations(r);
      } else if (action === "insights") {
        const r = await api.generateInsights(selectedId);
        if ("insights" in r) setInsights(r);
      } else {
        const r = await api.analyzeDataset(selectedId);
        if ("sections" in r) setReport(r);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(null);
    }
  };

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="page-container space-y-6">
      <div>
        <h1 className="page-title">Analytics</h1>
        <p className="page-subtitle">Profile, correlate, and generate AI insights from your data</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Dataset</CardTitle>
          <CardDescription>Choose a dataset to run analytics on</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedId} onValueChange={(v) => setSearchParams({ dataset: v })}>
            <SelectTrigger className="max-w-md">
              <SelectValue placeholder="Select a dataset" />
            </SelectTrigger>
            <SelectContent>
              {(datasetsData?.items ?? []).map((ds) => (
                <SelectItem key={ds.id} value={ds.id}>{ds.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {!selectedId ? (
        <EmptyState
          icon={TrendingUp}
          title="Select a dataset"
          description="Choose a dataset above to start running analytics."
        />
      ) : (
        <>
          {error && (
            <div className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { key: "profile" as const, label: "Profile Data", icon: TrendingUp },
              { key: "correlate" as const, label: "Correlations", icon: Zap },
              { key: "insights" as const, label: "AI Insights", icon: Sparkles },
              { key: "analyze" as const, label: "Full Analysis", icon: TrendingUp },
            ].map((action) => (
              <Button
                key={action.key}
                variant="outline"
                className="h-auto flex-col gap-2 py-6"
                onClick={() => runAction(action.key)}
                disabled={loading !== null}
              >
                {loading === action.key ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <action.icon className="size-5 text-primary" />
                )}
                {action.label}
              </Button>
            ))}
          </div>

          {profile && (
            <Card>
              <CardHeader><CardTitle>Profile Summary</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted">
                  {profile.row_count} rows · {profile.column_count} columns · Generated {new Date(profile.generated_at).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          )}

          {correlations && correlations.correlations.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Top Correlations</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {correlations.correlations.slice(0, 8).map((c, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-border/60 px-4 py-2">
                    <span className="text-sm">{c.column_1} ↔ {c.column_2}</span>
                    <Badge variant={Math.abs(c.correlation) > 0.7 ? "success" : "secondary"}>
                      {c.correlation.toFixed(3)}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {insights && (
            <Card>
              <CardHeader>
                <CardTitle>AI Insights</CardTitle>
                <CardDescription>{insights.summary}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {insights.insights.map((item, i) => (
                  <div key={i} className="rounded-xl border border-border/60 p-4">
                    <div className="flex items-center gap-2">
                      <Badge variant={item.severity === "high" ? "danger" : item.severity === "medium" ? "warning" : "secondary"}>
                        {item.severity}
                      </Badge>
                      <span className="font-medium text-foreground">{item.title}</span>
                    </div>
                    <p className="mt-2 text-sm text-muted">{item.description}</p>
                    {item.recommendation && (
                      <p className="mt-2 text-sm text-primary">{item.recommendation}</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {report && (
            <Card>
              <CardHeader><CardTitle>Analysis Report</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {report.sections.map((section, i) => (
                  <div key={i} className="rounded-xl border border-border/60 p-4">
                    <h3 className="font-medium text-foreground">{section.title}</h3>
                    <div className="mt-3 max-h-80 overflow-auto rounded-lg bg-muted/30 p-3">
                      {typeof section.content === "string" ? (
                        <p className="whitespace-pre-wrap break-words text-sm text-muted">{section.content}</p>
                      ) : (
                        <pre className="max-w-full whitespace-pre-wrap break-words text-xs leading-6 text-muted">
                          {JSON.stringify(section.content, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

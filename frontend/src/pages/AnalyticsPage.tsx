import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useDatasetStore } from "@/stores/datasetStore";
import type { AnalysisRun } from "@/types/api";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/common/GlassCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Play, RefreshCw, Zap } from "lucide-react";

export function AnalyticsPage() {
  const [selectedDatasetId, setSelectedDatasetId] = useState("");
  const [runs, setRuns] = useState<AnalysisRun[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const { datasets, fetchDatasets } = useDatasetStore();

  useEffect(() => {
    fetchDatasets();
  }, [fetchDatasets]);

  const fetchRuns = async () => {
    try {
      const res = await api.get<{ items: AnalysisRun[] }>("/analytics/runs");
      setRuns(res.data.items);
    } catch {}
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const runProfile = async () => {
    if (!selectedDatasetId) return;
    setIsRunning(true);
    try {
      await api.post(`/analytics/profile/${selectedDatasetId}`);
      await fetchRuns();
    } catch {
    } finally {
      setIsRunning(false);
    }
  };

  const runCorrelate = async () => {
    if (!selectedDatasetId) return;
    setIsRunning(true);
    try {
      await api.post(`/analytics/correlate/${selectedDatasetId}`);
      await fetchRuns();
    } catch {
    } finally {
      setIsRunning(false);
    }
  };

  const runAnalysis = async () => {
    if (!selectedDatasetId) return;
    setIsRunning(true);
    try {
      await api.post(`/analytics/analyze/${selectedDatasetId}`);
      await fetchRuns();
    } catch {
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-blur-in">
      <div>
        <h1 className="font-display text-[32px] leading-tight font-bold text-ink">
          Analytics
        </h1>
        <p className="text-sm text-ink-dim mt-1.5">
          Profile, correlate, and analyze your datasets
        </p>
      </div>

      <GlassCard elevation="strong">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-[var(--radius-sm)] bg-teal-glow border border-teal/20 flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-teal" />
          </div>
          <h2 className="text-sm font-semibold text-ink-dim uppercase tracking-wider">
            Run Analysis
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

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={runProfile}
              disabled={!selectedDatasetId || isRunning}
              className="gap-2.5 rounded-full border-glass-border text-ink-dim hover:text-ink hover:border-teal"
            >
              <Play className="h-4 w-4" />
              Profile
            </Button>
            <Button
              variant="outline"
              onClick={runCorrelate}
              disabled={!selectedDatasetId || isRunning}
              className="gap-2.5 rounded-full border-glass-border text-ink-dim hover:text-ink hover:border-teal"
            >
              <RefreshCw className="h-4 w-4" />
              Correlate
            </Button>
            <Button
              onClick={runAnalysis}
              disabled={!selectedDatasetId || isRunning}
              className="gap-2.5 rounded-full bg-teal hover:bg-teal/90 text-void font-medium transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_26px_rgba(45,212,191,0.5)]"
            >
              <Zap className="h-4 w-4" />
              {isRunning ? "Running..." : "Full Analysis"}
            </Button>
          </div>
        </div>
      </GlassCard>

      <div>
        <h2 className="text-sm font-semibold text-ink-dim uppercase tracking-wider mb-5">
          Analysis Runs
        </h2>
        {runs.length === 0 ? (
          <GlassCard elevation="default" className="text-center py-16">
            <BarChart3 className="h-14 w-14 mx-auto mb-4 text-ink-faint opacity-25" />
            <p className="text-sm text-ink-dim">
              No analysis runs yet. Select a dataset above to run analysis.
            </p>
          </GlassCard>
        ) : (
          <div className="space-y-3 stagger-children">
            {runs.map((run) => (
              <GlassCard key={run.id} elevation="default" animate={false}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-[var(--radius-sm)] bg-teal-glow border border-teal/20 flex items-center justify-center">
                      <BarChart3 className="h-4 w-4 text-teal" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ink">
                        {run.run_type}
                      </p>
                      <p className="text-xs text-ink-faint font-mono mt-0.5">
                        {new Date(run.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className={`font-mono text-[10px] uppercase border ${
                      run.status === "completed"
                        ? "bg-surface-success text-green-400 border-surface-success-border"
                        : run.status === "failed"
                        ? "bg-surface-error text-red-400 border-surface-error-border"
                        : "bg-void-2 text-ink-dim border-border"
                    }`}
                  >
                    {run.status}
                  </Badge>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useDatasetStore } from "@/stores/datasetStore";
import type { AnalysisRun } from "@/types/api";
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
import Ferrofluid from "@/components/visuals/Ferrofluid";

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
      const res = await api.get<AnalysisRun[] | { items: AnalysisRun[] }>("/analytics/runs");
      setRuns(Array.isArray(res.data) ? res.data : res.data.items ?? []);
    } catch {
      setRuns([]);
    }
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
    <div className="space-y-6 animate-fade-blur-in">
      <section className="relative overflow-hidden rounded-[28px] border border-glass-border bg-[#050b14] shadow-[0_26px_90px_rgba(0,0,0,0.38)]">
        <div className="absolute inset-0 opacity-95">
          <Ferrofluid
            colors={["#5EEAD4", "#A78BFA", "#E0F2FE", "#F59E0B"]}
            speed={0.45}
            scale={1.45}
            turbulence={1.15}
            fluidity={0.12}
            rimWidth={0.23}
            sharpness={2.8}
            shimmer={1.2}
            glow={2.3}
            flowDirection="down"
            opacity={0.95}
            mouseInteraction
            mouseStrength={1.1}
            mouseRadius={0.34}
            className="opacity-90"
          />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.22),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(139,127,245,0.18),transparent_42%),linear-gradient(180deg,rgba(3,7,18,0.2),rgba(3,7,18,0.82))]" />
        <div className="relative z-10 grid gap-6 p-6 md:p-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div className="max-w-2xl">
            <p className="font-mono text-[11px] tracking-[0.32em] uppercase text-ink-faint mb-3">
              Signal workspace
            </p>
            <h1 className="font-display text-[30px] md:text-[38px] leading-[1] font-bold text-ink max-w-[10ch]">
              Analytics that feels alive.
            </h1>
            <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-ink-dim">
              Profile, correlate, and analyze your datasets from a single control plane.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {["Live analysis", "Fluid visualization", "Magnetic cursor"].map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full border border-glass-border bg-white/6 px-3 py-1 text-[11px] font-mono uppercase tracking-wider text-ink-dim backdrop-blur-md"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {[
              { label: "Datasets", value: datasets.length.toString(), accent: "teal" },
              { label: "Runs", value: runs.length.toString(), accent: "violet" },
              { label: "State", value: isRunning ? "Active" : "Idle", accent: "amber" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-[22px] border border-glass-border bg-black/20 p-4 backdrop-blur-xl"
              >
                <p className="text-[10px] uppercase tracking-[0.28em] text-ink-faint">
                  {item.label}
                </p>
                <p className="mt-1.5 font-display text-[20px] font-semibold text-ink">
                  {item.value}
                </p>
                <div
                  className={`mt-2.5 h-1 rounded-full ${
                    item.accent === "teal"
                      ? "bg-teal-glow"
                      : item.accent === "violet"
                      ? "bg-violet-glow"
                      : "bg-amber-glow"
                  }`}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <GlassCard elevation="strong">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-teal-glow border border-teal/20 flex items-center justify-center">
            <BarChart3 className="h-4 w-4 text-teal" />
          </div>
          <p className="section-heading">Run Analysis</p>
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

          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={runProfile}
              disabled={!selectedDatasetId || isRunning}
              className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-glass-border bg-glass-bg px-4 py-2 text-[13px] font-medium text-ink-dim hover:text-ink hover:border-teal transition-all disabled:opacity-40 disabled:pointer-events-none"
            >
              <Play className="h-3.5 w-3.5" />
              Profile
            </button>
            <button
              onClick={runCorrelate}
              disabled={!selectedDatasetId || isRunning}
              className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-glass-border bg-glass-bg px-4 py-2 text-[13px] font-medium text-ink-dim hover:text-ink hover:border-teal transition-all disabled:opacity-40 disabled:pointer-events-none"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Correlate
            </button>
            <button
              onClick={runAnalysis}
              disabled={!selectedDatasetId || isRunning}
              className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-teal hover:bg-teal/90 text-void px-4 py-2 text-[13px] font-medium transition-all disabled:opacity-40 disabled:pointer-events-none"
            >
              <Zap className="h-3.5 w-3.5" />
              {isRunning ? "Running..." : "Full Analysis"}
            </button>
          </div>
        </div>
      </GlassCard>

      <section>
        <p className="section-heading mb-4">Analysis Runs</p>
        {runs.length === 0 ? (
          <GlassCard elevation="default" className="text-center py-14">
            <BarChart3 className="h-10 w-10 mx-auto mb-3 text-ink-faint opacity-20" />
            <p className="text-[13px] text-ink-dim">
              No analysis runs yet. Select a dataset above to get started.
            </p>
          </GlassCard>
        ) : (
          <div className="space-y-3 stagger-children">
            {runs.map((run) => (
              <GlassCard key={run.id} elevation="default" animate={false}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-teal-glow border border-teal/20 flex items-center justify-center">
                      <BarChart3 className="h-3.5 w-3.5 text-teal" />
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-ink">
                        {run.run_type}
                      </p>
                      <p className="text-[11px] text-ink-faint font-mono mt-0.5">
                        {new Date(run.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={run.status === "completed" ? "success" : run.status === "failed" ? "destructive" : "secondary"}
                    className="font-mono text-[10px] uppercase"
                  >
                    {run.status}
                  </Badge>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

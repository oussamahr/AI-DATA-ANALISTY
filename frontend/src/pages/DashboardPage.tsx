import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { useDatasetStore } from "@/stores/datasetStore";
import type { LLMQuery } from "@/types/api";
import { formatBytes } from "@/lib/utils";
import { Ferrofluid } from "@/components/effects/Ferrofluid";
import { SpecularButton } from "@/components/effects/SpecularButton";
import { Send, FileSpreadsheet, ArrowRight } from "lucide-react";

type ConsoleState = "idle" | "thinking" | "answer";

export function DashboardPage() {
  const { datasets, fetchDatasets } = useDatasetStore();
  const [consoleState, setConsoleState] = useState<ConsoleState>("idle");
  const [prompt, setPrompt] = useState("");
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("");
  const [history, setHistory] = useState<LLMQuery[]>([]);

  const prefersReducedMotion = useMemo(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  useEffect(() => {
    fetchDatasets();
    fetchHistory();
  }, [fetchDatasets]);

  const fetchHistory = async () => {
    try {
      const res = await api.get<LLMQuery[] | { items: LLMQuery[] }>("/llm/history");
      setHistory(Array.isArray(res.data) ? res.data : res.data.items ?? []);
    } catch {
      setHistory([]);
    }
  };

  const handleQuery = async () => {
    if (!prompt.trim()) return;
    setConsoleState("thinking");
    try {
      await api.post("/llm/query", {
        prompt: prompt.trim(),
        dataset_id: selectedDatasetId || undefined,
      });
      setPrompt("");
      await fetchHistory();
      setConsoleState("answer");
      setTimeout(() => setConsoleState("idle"), 3000);
    } catch {
      setConsoleState("idle");
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-10rem)]">
      {/* ── Viewport Ferrofluid background ─────────────────────── */}
      <div
        className="absolute inset-0 z-0 pointer-events-none overflow-hidden
                   max-sm:opacity-50 sm:opacity-70"
        aria-hidden="true"
      >
        <Ferrofluid
          colors={["#2DD4BF", "#8B7FF5", "#0D1526"]}
          backgroundColor="#090E1A"
          speed={0.25}
          scale={1.4}
          turbulence={0.6}
          fluidity={0.15}
          rimWidth={0.18}
          sharpness={2.5}
          shimmer={0.8}
          glow={1.2}
          flowDirection="down"
          opacity={0.85}
          mouseInteraction={!prefersReducedMotion}
          paused={prefersReducedMotion}
        />
      </div>

      {/* ── Dark glass overlay ─────────────────────────────────── */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none
                   bg-void/30 backdrop-blur-[2px]
                   max-sm:bg-void/55 max-sm:backdrop-blur-[3px]
                   sm:bg-void/35 sm:backdrop-blur-[3px]"
        aria-hidden="true"
      />

      {/* ── Dashboard content ──────────────────────────────────── */}
      <div className="relative z-10 space-y-6 animate-fade-blur-in">
        {/* Console */}
        <section>
          <div
            className="console-frame relative rounded-[calc(var(--radius-lg)+4px)] overflow-hidden"
            data-state={consoleState}
          >
            <div className="console-border" />
            <div className="console relative z-1 glass-strong p-6">
              <div className="shimmer-overlay" data-active={consoleState === "thinking"} />

              <p className="section-heading mb-4">Ask your data</p>

              <div className="flex gap-3 mb-4">
                <select
                  value={selectedDatasetId}
                  onChange={(e) => setSelectedDatasetId(e.target.value)}
                  className="h-8 rounded-[var(--radius-sm)] border border-glass-border bg-glass-bg px-3 text-[12px] font-mono text-ink-dim focus:outline-none focus:border-teal appearance-none cursor-pointer"
                  aria-label="Select dataset"
                >
                  <option value="">All datasets</option>
                  {datasets.map((ds) => (
                    <option key={ds.id} value={ds.id}>
                      {ds.name}
                    </option>
                  ))}
                </select>
              </div>

              <p className="query-text font-body text-[18px] leading-relaxed text-ink min-h-[56px] mb-5">
                {prompt || (
                  <span className="text-ink-faint">
                    What were Q3 sales by region, and how does that compare to Q2?
                    <span className="cursor" />
                  </span>
                )}
              </p>

              <div className="console-footer flex items-center justify-between pt-4 border-t border-glass-border">
                <div className="flex gap-1.5">
                  {(["idle", "thinking", "answer"] as const).map((state) => (
                    <button
                      key={state}
                      onClick={() => setConsoleState(state)}
                      className={`font-mono text-[11px] tracking-wide bg-transparent border border-glass-border text-ink-faint px-3 py-1.5 rounded-[var(--radius-sm)] cursor-pointer transition-all ${
                        consoleState === state
                          ? "bg-glass-bg-strong border-teal text-ink"
                          : "hover:text-ink hover:border-glass-border-strong"
                      }`}
                    >
                      {state.charAt(0).toUpperCase() + state.slice(1)}
                    </button>
                  ))}
                </div>

                <SpecularButton
                  onClick={handleQuery}
                  disabled={!prompt.trim() || consoleState === "thinking"}
                  size="lg"
                  radius={999}
                  followMouse={!prefersReducedMotion}
                  autoAnimate={false}
                  aria-label="Run query"
                  className="!h-[40px] !w-[40px] !px-0 !p-0"
                >
                  <Send className="w-4 h-4" />
                </SpecularButton>
              </div>
            </div>
          </div>

          {/* Results bento */}
          <div
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 transition-all duration-500"
            style={{
              maxHeight: consoleState === "answer" ? "400px" : "0",
              opacity: consoleState === "answer" ? 1 : 0,
              overflow: "hidden",
            }}
          >
            <div className="glass rounded-[var(--radius-lg)] p-5 transition-all duration-500"
              style={{
                opacity: consoleState === "answer" ? 1 : 0,
                transform: consoleState === "answer" ? "none" : "translateY(10px) scale(0.98)",
                filter: consoleState === "answer" ? "blur(0)" : "blur(6px)",
                transitionDelay: "0.05s",
              }}
            >
              <p className="section-heading mb-3">Revenue by region</p>
              <div className="flex items-end gap-2 h-[80px]">
                {[60, 88, 42, 70, 35].map((h, i) => (
                  <span
                    key={i}
                    className="flex-1 rounded-t-sm opacity-80"
                    style={{
                      height: `${h}%`,
                      background: `linear-gradient(180deg, var(--color-teal), rgba(45,212,191,0.2))`,
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="glass rounded-[var(--radius-lg)] p-5 transition-all duration-500"
              style={{
                opacity: consoleState === "answer" ? 1 : 0,
                transform: consoleState === "answer" ? "none" : "translateY(10px) scale(0.98)",
                filter: consoleState === "answer" ? "blur(0)" : "blur(6px)",
                transitionDelay: "0.15s",
              }}
            >
              <p className="section-heading mb-3">Q3 revenue</p>
              <div className="font-mono text-[28px] font-medium text-ink mt-2 mb-2">$482,190</div>
              <span className="inline-flex items-center gap-1 font-mono text-[12px] text-teal bg-teal-glow px-2 py-0.5 rounded-full">
                ▲ 12.4% vs Q2
              </span>
            </div>

            <div className="glass rounded-[var(--radius-lg)] p-5 transition-all duration-500"
              style={{
                opacity: consoleState === "answer" ? 1 : 0,
                transform: consoleState === "answer" ? "none" : "translateY(10px) scale(0.98)",
                filter: consoleState === "answer" ? "blur(0)" : "blur(6px)",
                transitionDelay: "0.25s",
              }}
            >
              <p className="section-heading mb-3">Top region</p>
              <div className="space-y-0">
                {[
                  { region: "EMEA", value: "$168,204" },
                  { region: "NA", value: "$151,880" },
                  { region: "APAC", value: "$98,410" },
                ].map((item, i, arr) => (
                  <div
                    key={item.region}
                    className="flex justify-between text-[13px] py-2 text-ink-dim"
                    style={{ borderBottom: i < arr.length - 1 ? "1px solid var(--color-glass-border)" : "none" }}
                  >
                    <span>{item.region}</span>
                    <span className="font-mono text-ink">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Quick access */}
        <section>
          <p className="section-heading mb-3">
            Quick access
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              to="/datasets"
              className="glass rounded-[var(--radius-lg)] p-5 card-lift group"
            >
              <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-teal-glow border border-teal/20 flex items-center justify-center mb-3">
                <FileSpreadsheet className="h-4 w-4 text-teal" />
              </div>
              <h3 className="text-[14px] font-semibold text-ink mb-0.5 group-hover:text-teal transition-colors">Datasets</h3>
              <p className="text-[12px] text-ink-faint flex items-center gap-1">
                {datasets.length} connected sources
                <ArrowRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </p>
            </Link>

            <Link
              to="/llm"
              className="glass rounded-[var(--radius-lg)] p-5 card-lift group"
            >
              <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-violet-glow border border-violet/20 flex items-center justify-center mb-3">
                <Send className="h-4 w-4 text-violet" />
              </div>
              <h3 className="text-[14px] font-semibold text-ink mb-0.5 group-hover:text-violet transition-colors">Saved queries</h3>
              <p className="text-[12px] text-ink-faint flex items-center gap-1">
                {history.length} reusable questions
                <ArrowRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </p>
            </Link>

            <Link
              to="/analytics"
              className="glass rounded-[var(--radius-lg)] p-5 card-lift group"
            >
              <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-amber-glow border border-amber/20 flex items-center justify-center mb-3">
                <FileSpreadsheet className="h-4 w-4 text-amber" />
              </div>
              <h3 className="text-[14px] font-semibold text-ink mb-0.5 group-hover:text-amber transition-colors">Scheduled reports</h3>
              <p className="text-[12px] text-ink-faint flex items-center gap-1">
                8 running weekly
                <ArrowRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </p>
            </Link>
          </div>
        </section>

        {/* Recent datasets */}
        {datasets.length > 0 && (
          <section>
            <p className="section-heading mb-3">
              Recent datasets
            </p>
            <div className="space-y-2">
              {datasets.slice(0, 5).map((ds) => (
                <Link
                  key={ds.id}
                  to="/datasets"
                  className="flex items-center justify-between p-3 rounded-[var(--radius-md)] bg-glass-bg border border-glass-border card-lift group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-[var(--radius-sm)] bg-teal-glow border border-teal/20 flex items-center justify-center">
                      <FileSpreadsheet className="h-4 w-4 text-teal" />
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-ink group-hover:text-teal transition-colors">
                        {ds.name}
                      </p>
                      <p className="text-[11px] text-ink-faint font-mono mt-0.5">
                        {formatBytes(ds.file_size_bytes)}
                        {ds.row_count ? ` · ${ds.row_count.toLocaleString()} rows` : ""}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-ink-faint opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

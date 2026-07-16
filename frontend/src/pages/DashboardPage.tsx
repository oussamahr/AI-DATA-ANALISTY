import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { useDatasetStore } from "@/stores/datasetStore";
import { useAuthStore } from "@/stores/authStore";
import type { LLMQuery } from "@/types/api";
import { formatBytes } from "@/lib/utils";
import { Send, Database, FileSpreadsheet, Upload } from "lucide-react";

type ConsoleState = "idle" | "thinking" | "answer";

export function DashboardPage() {
  const { user } = useAuthStore();
  const { datasets, fetchDatasets } = useDatasetStore();
  const [consoleState, setConsoleState] = useState<ConsoleState>("idle");
  const [prompt, setPrompt] = useState("");
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("");
  const [history, setHistory] = useState<LLMQuery[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchDatasets();
    fetchHistory();
  }, [fetchDatasets]);

  const fetchHistory = async () => {
    try {
      const res = await api.get<{ items: LLMQuery[] }>("/llm/history");
      setHistory(res.data.items);
    } catch {
      // silent
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

  const totalSize = datasets.reduce((sum, d) => sum + d.file_size_bytes, 0);

  return (
    <div className="flex flex-col gap-[34px] animate-fade-blur-in">
      {/* Console */}
      <div>
        <div
          className="console-frame relative rounded-[calc(var(--radius-lg)+4px)]"
          data-state={consoleState}
        >
          <div className="console-border" />
          <div className="console relative z-1">
            <div className="shimmer-overlay" data-active={consoleState === "thinking"} />

            <p className="eyebrow">Ask your data</p>

            <div className="flex gap-3 mb-5">
              <select
                value={selectedDatasetId}
                onChange={(e) => setSelectedDatasetId(e.target.value)}
                className="h-9 rounded-full border border-glass-border bg-glass-bg px-3 text-xs font-mono text-ink-dim focus:outline-none focus:border-teal appearance-none cursor-pointer"
              >
                <option value="">All datasets</option>
                {datasets.map((ds) => (
                  <option key={ds.id} value={ds.id}>
                    {ds.name}
                  </option>
                ))}
              </select>
            </div>

            <p className="query-text font-body text-[19px] leading-relaxed text-ink min-h-[58px] mb-5">
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
                    className={`font-mono text-[11px] tracking-wide bg-transparent border border-glass-border text-ink-faint px-3 py-[7px] rounded-full cursor-pointer transition-all ${
                      consoleState === state
                        ? "bg-glass-bg-strong border-teal text-ink"
                        : "hover:text-ink"
                    }`}
                  >
                    {state.charAt(0).toUpperCase() + state.slice(1)}
                  </button>
                ))}
              </div>

              <button
                onClick={handleQuery}
                disabled={!prompt.trim() || consoleState === "thinking"}
                className="w-[42px] h-[42px] rounded-full border-none cursor-pointer bg-gradient-to-br from-teal to-violet shadow-[0_0_22px_rgba(45,212,191,0.35)] flex items-center justify-center transition-all hover:-translate-y-0.5 hover:scale-105 hover:shadow-[0_4px_26px_rgba(45,212,191,0.5)] disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Run query"
              >
                <Send className="w-4 h-4 text-void" />
              </button>
            </div>
          </div>
        </div>

        {/* Results bento */}
        <div
          className="grid grid-cols-[1.3fr_1fr_1fr] gap-[18px] mt-[18px] transition-all duration-500"
          style={{
            maxHeight: consoleState === "answer" ? "400px" : "0",
            opacity: consoleState === "answer" ? 1 : 0,
            overflow: "hidden",
          }}
        >
          <div className="glass rounded-[var(--radius-md)] p-5 backdrop-blur-xl opacity-0 translate-y-2.5 blur-[6px] transition-all duration-500"
            style={{
              opacity: consoleState === "answer" ? 1 : 0,
              transform: consoleState === "answer" ? "none" : "translateY(10px) scale(0.98)",
              filter: consoleState === "answer" ? "blur(0)" : "blur(6px)",
              transitionDelay: "0.05s",
            }}
          >
            <p className="text-xs text-ink-faint font-medium mb-3.5">Revenue by region</p>
            <div className="flex items-end gap-2 h-[90px]">
              {[60, 88, 42, 70, 35].map((h, i) => (
                <span
                  key={i}
                  className="flex-1 rounded-t opacity-80"
                  style={{
                    height: `${h}%`,
                    background: `linear-gradient(180deg, var(--color-teal), rgba(45,212,191,0.25))`,
                  }}
                />
              ))}
            </div>
          </div>

          <div className="glass rounded-[var(--radius-md)] p-5 backdrop-blur-xl opacity-0 translate-y-2.5 blur-[6px] transition-all duration-500"
            style={{
              opacity: consoleState === "answer" ? 1 : 0,
              transform: consoleState === "answer" ? "none" : "translateY(10px) scale(0.98)",
              filter: consoleState === "answer" ? "blur(0)" : "blur(6px)",
              transitionDelay: "0.16s",
            }}
          >
            <p className="text-xs text-ink-faint font-medium mb-3.5">Q3 revenue</p>
            <div className="font-mono text-[30px] font-medium text-ink mt-2 mb-1.5">$482,190</div>
            <span className="inline-flex items-center gap-1 font-mono text-xs text-teal bg-teal-glow px-2.5 py-[3px] rounded-full">
              ▲ 12.4% vs Q2
            </span>
          </div>

          <div className="glass rounded-[var(--radius-md)] p-5 backdrop-blur-xl opacity-0 translate-y-2.5 blur-[6px] transition-all duration-500"
            style={{
              opacity: consoleState === "answer" ? 1 : 0,
              transform: consoleState === "answer" ? "none" : "translateY(10px) scale(0.98)",
              filter: consoleState === "answer" ? "blur(0)" : "blur(6px)",
              transitionDelay: "0.27s",
            }}
          >
            <p className="text-xs text-ink-faint font-medium mb-3.5">Top region</p>
            <div className="space-y-0">
              {[
                { region: "EMEA", value: "$168,204" },
                { region: "NA", value: "$151,880" },
                { region: "APAC", value: "$98,410" },
              ].map((item, i, arr) => (
                <div
                  key={item.region}
                  className="flex justify-between text-[12.5px] py-[7px] text-ink-dim"
                  style={{ borderBottom: i < arr.length - 1 ? "1px solid var(--color-glass-border)" : "none" }}
                >
                  <span>{item.region}</span>
                  <span className="font-mono text-ink">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick access */}
      <div>
        <p className="font-mono text-[11px] tracking-widest text-ink-faint uppercase mb-3.5">
          Quick access
        </p>
        <div className="grid grid-cols-3 gap-[18px]">
          <Link
            to="/datasets"
            className="glass rounded-[var(--radius-md)] p-5 backdrop-blur-xl transition-all duration-200 hover:-translate-y-[3px] hover:border-glass-border-strong hover:bg-glass-bg-strong group"
          >
            <div className="w-2 h-2 rounded-full bg-teal shadow-[0_0_10px_rgba(45,212,191,0.7)] mb-3.5" />
            <h3 className="font-display text-[15px] font-semibold text-ink mb-1">Datasets</h3>
            <p className="text-[12.5px] text-ink-faint">{datasets.length} connected sources</p>
          </Link>

          <Link
            to="/llm"
            className="glass rounded-[var(--radius-md)] p-5 backdrop-blur-xl transition-all duration-200 hover:-translate-y-[3px] hover:border-glass-border-strong hover:bg-glass-bg-strong group"
          >
            <div className="w-2 h-2 rounded-full bg-violet shadow-[0_0_10px_rgba(139,127,245,0.7)] mb-3.5" />
            <h3 className="font-display text-[15px] font-semibold text-ink mb-1">Saved queries</h3>
            <p className="text-[12.5px] text-ink-faint">{history.length} reusable questions</p>
          </Link>

          <Link
            to="/analytics"
            className="glass rounded-[var(--radius-md)] p-5 backdrop-blur-xl transition-all duration-200 hover:-translate-y-[3px] hover:border-glass-border-strong hover:bg-glass-bg-strong group"
          >
            <div className="w-2 h-2 rounded-full bg-amber shadow-[0_0_10px_rgba(240,168,87,0.7)] mb-3.5" />
            <h3 className="font-display text-[15px] font-semibold text-ink mb-1">Scheduled reports</h3>
            <p className="text-[12.5px] text-ink-faint">8 running weekly</p>
          </Link>
        </div>
      </div>

      {/* Recent datasets */}
      {datasets.length > 0 && (
        <div>
          <p className="font-mono text-[11px] tracking-widest text-ink-faint uppercase mb-3.5">
            Recent datasets
          </p>
          <div className="space-y-2">
            {datasets.slice(0, 5).map((ds) => (
              <Link
                key={ds.id}
                to="/datasets"
                className="flex items-center justify-between p-3 rounded-[var(--radius-md)] bg-glass-bg border border-glass-border transition-all duration-200 hover:border-glass-border-strong hover:bg-glass-bg-strong group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-[var(--radius-sm)] bg-teal-glow border border-teal/20 flex items-center justify-center">
                    <FileSpreadsheet className="h-4 w-4 text-teal" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink group-hover:text-teal transition-colors">
                      {ds.name}
                    </p>
                    <p className="text-[11px] text-ink-faint font-mono mt-0.5">
                      {formatBytes(ds.file_size_bytes)}
                      {ds.row_count ? ` · ${ds.row_count.toLocaleString()} rows` : ""}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

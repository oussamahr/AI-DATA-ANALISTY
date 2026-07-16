import { useEffect, useState, useRef } from "react";
import api from "@/lib/api";
import { useDatasetStore } from "@/stores/datasetStore";
import type { LLMQuery } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Send, Clock, CheckCircle, XCircle, Sparkles } from "lucide-react";

type ConsoleState = "idle" | "thinking" | "answer";

export function LLMPage() {
  const [prompt, setPrompt] = useState("");
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("");
  const [consoleState, setConsoleState] = useState<ConsoleState>("idle");
  const [history, setHistory] = useState<LLMQuery[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { datasets, fetchDatasets } = useDatasetStore();

  useEffect(() => {
    fetchDatasets();
    fetchHistory();
  }, [fetchDatasets]);

  const fetchHistory = async () => {
    try {
      const res = await api.get<{ items: LLMQuery[] }>("/llm/history");
      setHistory(res.data.items);
    } catch {}
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
      setTimeout(() => setConsoleState("idle"), 2000);
    } catch {
      setConsoleState("idle");
    }
  };

  return (
    <div className="space-y-8 animate-fade-blur-in">
      <div>
        <h1 className="font-display text-[32px] leading-tight font-bold text-ink">
          AI Query
        </h1>
        <p className="text-sm text-ink-dim mt-1.5">
          Ask questions about your data using natural language
        </p>
      </div>

      <div
        className="console-frame relative rounded-[calc(var(--radius-lg)+4px)]"
        data-state={consoleState}
      >
        <div className="console-border" />
        <div className="console relative z-1 glass-strong p-8">
          <div className="shimmer-overlay" data-active={consoleState === "thinking"} />

          <div className="relative z-10 space-y-5">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-[var(--radius-sm)] bg-teal-glow border border-teal/20 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-teal" />
              </div>
              <h2 className="text-sm font-semibold text-ink-dim uppercase tracking-wider">
                New Query
              </h2>
              {consoleState === "thinking" && (
                <span className="ml-auto flex items-center gap-1.5 text-sm text-teal font-mono">
                  <span className="h-2 w-2 rounded-full bg-teal animate-glow-pulse" />
                  Thinking...
                </span>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-ink-dim font-mono">
                Dataset (optional)
              </Label>
              <Select
                value={selectedDatasetId}
                onValueChange={setSelectedDatasetId}
              >
                <SelectTrigger className="h-11 rounded-full bg-glass-bg border-glass-border text-ink text-sm focus:border-teal focus:ring-1 focus:ring-teal">
                  <SelectValue placeholder="Select a dataset to query..." />
                </SelectTrigger>
                <SelectContent className="glass-strong border-glass-border text-ink">
                  {datasets.map((ds) => (
                    <SelectItem key={ds.id} value={ds.id}>
                      {ds.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3">
              <textarea
                ref={textareaRef}
                placeholder="e.g. What is the average age of customers?"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleQuery();
                  }
                }}
                disabled={consoleState === "thinking"}
                rows={2}
                className="flex-1 rounded-[var(--radius-md)] border border-glass-border bg-glass-bg text-ink placeholder:text-ink-faint p-4 text-sm resize-none focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal font-body"
                aria-label="Ask a question about your data"
              />
              <Button
                onClick={handleQuery}
                disabled={!prompt.trim() || consoleState === "thinking"}
                className="self-end gap-2.5 rounded-full h-11 bg-teal hover:bg-teal/90 text-void font-medium transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_26px_rgba(45,212,191,0.5)]"
              >
                <Send className="h-4 w-4" />
                {consoleState === "thinking" ? "..." : "Ask"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-ink-dim uppercase tracking-wider mb-5">
          Query History
        </h2>
        {history.length === 0 ? (
          <div className="text-center py-16 text-ink-dim">
            <Sparkles className="h-14 w-14 mx-auto mb-4 text-ink-faint opacity-25" />
            <p className="text-sm">
              No queries yet. Ask a question above to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-4 stagger-children">
            {history.map((q) => (
              <div
                key={q.id}
                className="glass rounded-[var(--radius-md)] p-5 hover:border-glass-border-strong transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink mb-2">
                      {q.prompt}
                    </p>
                    <p className="text-sm text-ink-dim whitespace-pre-wrap leading-relaxed">
                      {q.response}
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <Badge
                      variant="secondary"
                      className={`font-mono text-[10px] uppercase border ${
                        q.success
                          ? "bg-surface-success text-green-400 border-surface-success-border"
                          : "bg-surface-error text-red-400 border-surface-error-border"
                      }`}
                    >
                      {q.success ? (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      ) : (
                        <XCircle className="h-3 w-3 mr-1" />
                      )}
                      {q.success ? "OK" : "Failed"}
                    </Badge>
                    <span className="text-[11px] text-ink-faint flex items-center gap-1 font-mono">
                      <Clock className="h-3 w-3" />
                      {(q.duration_ms / 1000).toFixed(1)}s
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

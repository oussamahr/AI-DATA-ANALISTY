import { useEffect, useState, useRef, useMemo } from "react";
import api from "@/lib/api-client";
import { useDatasetStore } from "@/stores/datasetStore";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import type { LLMQuery } from "@/types/api";
import { Label } from "@/components/ui/label";
import { SpecularButton } from "@/components/effects/SpecularButton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Send, Clock, CheckCircle, XCircle, Sparkles, AlertCircle } from "lucide-react";

type ConsoleState = "idle" | "thinking" | "answer";

export function LLMPage() {
  const [prompt, setPrompt] = useState("");
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("");
  const [consoleState, setConsoleState] = useState<ConsoleState>("idle");
  const [history, setHistory] = useState<LLMQuery[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [errorRequestId, setErrorRequestId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { datasets, fetchDatasets } = useDatasetStore();
  const { handleError } = useErrorHandler();

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
      setError(null);
    } catch (err) {
      const apiError = handleError(err);
      setError(apiError.userMessage);
      setErrorRequestId(apiError.requestId || null);
      setHistory([]);
    }
  };

  const handleQuery = async () => {
    if (!prompt.trim()) return;
    setConsoleState("thinking");
    setError(null);
    setErrorRequestId(null);
    try {
      await api.post("/llm/query", {
        prompt: prompt.trim(),
        dataset_id: selectedDatasetId || undefined,
      });
      setPrompt("");
      await fetchHistory();
      setConsoleState("answer");
      setTimeout(() => setConsoleState("idle"), 2000);
    } catch (err) {
      const apiError = handleError(err);
      setError(apiError.userMessage);
      setErrorRequestId(apiError.requestId || null);
      setConsoleState("idle");
    }
  };

  return (
    <div className="space-y-6 animate-fade-blur-in">
      <div>
        <h1 className="page-heading">AI Query</h1>
        <p className="page-subheading mt-1">
          Ask questions about your data using natural language
        </p>
      </div>

      {error && (
        <div className="rounded-[var(--radius-md)] p-4 border border-surface-error-border bg-surface-error" role="alert">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-[13px] text-red-300 font-medium">{error}</p>
              {errorRequestId && (
                <p className="text-[11px] text-red-200/60 mt-1 font-mono">
                  Request ID: {errorRequestId}
                </p>
              )}
            </div>
            <button
              onClick={() => {
                setError(null);
                setErrorRequestId(null);
              }}
              className="text-red-300 hover:text-red-200 transition-colors p-1"
              aria-label="Dismiss error"
            >
              <AlertCircle className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div
        className="console-frame relative rounded-[calc(var(--radius-lg)+4px)]"
        data-state={consoleState}
      >
        <div className="console-border" />
        <div className="console relative z-1 glass-strong p-6">
          <div className="shimmer-overlay" data-active={consoleState === "thinking"} />

          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-teal-glow border border-teal/20 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-teal" />
              </div>
              <h2 className="section-heading">
                New Query
              </h2>
              {consoleState === "thinking" && (
                <span className="ml-auto flex items-center gap-1.5 text-[13px] text-teal font-mono">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal animate-glow-pulse" />
                  Thinking...
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-[12px] text-ink-dim font-mono">
                Dataset (optional)
              </Label>
              <Select
                value={selectedDatasetId}
                onValueChange={setSelectedDatasetId}
              >
                <SelectTrigger className="h-10 rounded-[var(--radius-sm)] bg-glass-bg border-glass-border text-ink text-[13px] focus:border-teal focus:ring-1 focus:ring-teal">
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
                className="flex-1 rounded-[var(--radius-md)] border border-glass-border bg-glass-bg text-ink placeholder:text-ink-faint p-3 text-[13px] resize-none focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal font-body"
                aria-label="Ask a question about your data"
              />
              <SpecularButton
                onClick={handleQuery}
                disabled={!prompt.trim() || consoleState === "thinking"}
                size="lg"
                radius={12}
                followMouse={!prefersReducedMotion}
                autoAnimate={false}
                className="self-end"
              >
                <Send className="h-4 w-4" />
                {consoleState === "thinking" ? "..." : "Ask"}
              </SpecularButton>
            </div>
          </div>
        </div>
      </div>

      <section>
        <p className="section-heading mb-4">
          Query History
        </p>
        {history?.length === 0 ? (
          <div className="text-center py-14 text-ink-dim">
            <Sparkles className="h-10 w-10 mx-auto mb-3 text-ink-faint opacity-20" />
            <p className="text-[13px]">
              No queries yet. Ask a question above to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-3 stagger-children">
            {history.map((q) => (
              <div
                key={q.id}
                className="glass rounded-[var(--radius-md)] p-4 hover:border-glass-border-strong transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-ink mb-1.5">
                      {q.prompt}
                    </p>
                    <p className="text-[13px] text-ink-dim whitespace-pre-wrap leading-relaxed">
                      {q.response || "(No response)"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant={q.success ? "success" : "destructive"}
                      className="font-mono text-[10px] uppercase"
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
      </section>
    </div>
  );
}

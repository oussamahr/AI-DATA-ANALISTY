"use client";

/**
 * AI Chat page — token-streaming redesign.
 *
 * Architecture summary:
 *
 *   ┌──────────────────┐   sendMessage()   ┌─────────────────────┐
 *   │  ChatPage (UI)   │ ────────────────▶ │  useChatStream hook │
 *   └──────────────────┘                   └──────────┬──────────┘
 *           ▲                                          │ for-await
 *           │ subscribes                               ▼
 *           │                                ┌─────────────────────┐
 *   ┌───────┴────────┐   appendTokens        │   api.streamChat    │  ──SSE──▶  Backend
 *   │  useChatStore  │ ◀──────(rAF batch)────│  (ReadableStream)   │
 *   └───────┬────────┘                       └─────────────────────┘
 *           │
 *           ▼
 *   ┌──────────────────┐    memoized blocks
 *   │ MarkdownRenderer │    stable keys       (no flicker)
 *   └──────────────────┘
 *
 * Performance contract:
 *   - At most 1 React render per animation frame, even at 200 tok/s.
 *   - Only the streaming message re-renders. Earlier messages do not.
 *   - Auto-scroll only when the user is pinned. Detached → button shows.
 *   - Cancel via Stop button tears down the stream in <16ms.
 */

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  Send,
  Copy,
  RotateCcw,
  Trash2,
  Download,
  Sparkles,
  BarChart,
  AlertTriangle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { ScrollToBottomButton, StopButton } from "@/components/ui/stream-controls";
import { useDatasets } from "@/hooks/use-api";
import { useChatStream } from "@/hooks/use-chat-stream";
import { useChatScroll } from "@/hooks/use-chat-scroll";
import { useChatStore, type ChatMessage } from "@/store/chat";

interface SuggestedPrompt {
  label: string;
  prompt: (datasetName: string) => string;
}

const SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  {
    label: "Overview & Summary",
    prompt: (name) => `Give me a comprehensive overview of the ${name} dataset. What are the key columns, data quality issues, and initial insights?`,
  },
  {
    label: "Key Trends",
    prompt: (name) => `What are the main trends and patterns in the ${name} dataset? Identify any seasonality or growth/decline patterns.`,
  },
  {
    label: "Top Performers",
    prompt: (name) => `What are the top 10 items by value in the ${name} dataset? Show me the highest performing categories, products, or regions.`,
  },
  {
    label: "Anomalies & Outliers",
    prompt: (name) => `Detect any anomalies, outliers, or unusual patterns in the ${name} dataset. Are there any potential data quality issues or fraud signals?`,
  },
  {
    label: "Correlations",
    prompt: (name) => `What are the strongest correlations in the ${name} dataset? Which variables are most related to each other?`,
  },
  {
    label: "Data Quality Report",
    prompt: (name) => `Assess the data quality of the ${name} dataset. What are the missing values, duplicates, and inconsistencies?`,
  },
  {
    label: "Forecasting",
    prompt: (name) => `Can you forecast future values for the ${name} dataset? Identify the best time series column and target metric.`,
  },
  {
    label: "Visualization Ideas",
    prompt: (name) => `Recommend the best visualizations for the ${name} dataset. What charts would work well for exploration vs presentation?`,
  },
  {
    label: "SQL Generation",
    prompt: (name) => `Generate a SQL query to find the top 5 categories by total revenue in the ${name} dataset.`,
  },
  {
    label: "Python Analysis",
    prompt: (name) => `Generate Python code to perform exploratory data analysis on the ${name} dataset with visualizations.`,
  },
];

export function ChatPage() {
  const { data: datasetsData } = useDatasets(1, 100);
  const messages = useChatStore((s) => s.messages);
  const conversationId = useChatStore((s) => s.conversationId);
  const status = useChatStore((s) => s.status);
  const errorMessage = useChatStore((s) => s.errorMessage);
  const reset = useChatStore((s) => s.reset);

  const [prompt, setPrompt] = useState("");
  const [datasetId, setDatasetId] = useState<string>("none");
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [copyOk, setCopyOk] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { beginStream, cancel } = useChatStream();
  const isStreaming = status === "streaming" || status === "connecting";

  const {
    containerRef,
    detached,
    scrollToBottom,
  } = useChatScroll({ threshold: 64 });

  // -------------------------------------------------------------------------
  // Auto-grow textarea
  // -------------------------------------------------------------------------
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [prompt]);

  // -------------------------------------------------------------------------
  // Auto-scroll on new content
  // -------------------------------------------------------------------------
  //
  // We don't need an explicit effect here: `useChatScroll` installs a
  // ResizeObserver on the scroll container that auto-scrolls whenever
  // the content height grows *and* the user is pinned. That covers:
  //   - new tokens being appended,
  //   - new messages being added,
  //   - markdown re-rendering with more text height.
  // So just relying on that one observer is enough.

  // -------------------------------------------------------------------------
  // Send / cancel
  // -------------------------------------------------------------------------
  const sendMessageWithContent = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return;
      if (datasetId === "none") return;
      beginStream({ datasetId, content, conversationId });
      setPrompt("");
      setShowSuggestions(false);
    },
    [beginStream, conversationId, datasetId, isStreaming]
  );

  const sendMessage = useCallback(() => {
    void sendMessageWithContent(prompt);
  }, [prompt, sendMessageWithContent]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    } else if (e.key === "Escape" && isStreaming) {
      e.preventDefault();
      cancel();
    }
  };

  // -------------------------------------------------------------------------
  // Message actions
  // -------------------------------------------------------------------------
  const copyMessage = useCallback(async (id: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopyOk(id);
      setTimeout(() => setCopyOk((v) => (v === id ? null : v)), 1200);
    } catch {
      /* noop */
    }
  }, []);

  const regenerateMessage = useCallback(
    async (messageIndex: number) => {
      if (messageIndex <= 0 || isStreaming) return;
      const target = messages[messageIndex];
      if (!target || target.role !== "assistant") return;
      // Find the most recent user message prior to this assistant.
      let userIdx = -1;
      for (let i = messageIndex - 1; i >= 0; i -= 1) {
        if (messages[i]?.role === "user") {
          userIdx = i;
          break;
        }
      }
      if (userIdx === -1) return;
      const userMsg = messages[userIdx];
      if (!userMsg) return;
      // Drop everything from the user message onward and re-send.
      const keep = messages.slice(0, userIdx);
      useChatStore.setState({ messages: keep });
      await sendMessageWithContent(userMsg.content);
    },
    [isStreaming, messages, sendMessageWithContent]
  );

  const exportConversation = useCallback(() => {
    const exportData = {
      datasetId,
      datasetName: datasetsData?.items?.find((d) => d.id === datasetId)?.name ?? "Unknown",
      exportedAt: new Date().toISOString(),
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        model: m.model,
        provider: m.provider,
      })),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `conversation-${datasetId}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [datasetId, datasetsData, messages]);

  const selectedDataset = useMemo(
    () => datasetsData?.items?.find((d) => d.id === datasetId),
    [datasetsData, datasetId]
  );

  return (
    <TooltipProvider>
      <div className="page-container flex flex-1 min-h-0 flex-col gap-4 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="page-title">AI Chat</h1>
            <p className="page-subtitle">Ask questions about your data in natural language</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {messages.length > 0 && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={exportConversation}
                      className="gap-1"
                    >
                      <Download className="size-4" />
                      <span className="hidden sm:inline">Export</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Export conversation as JSON</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        reset();
                        setShowSuggestions(true);
                      }}
                      className="gap-1"
                    >
                      <Trash2 className="size-4" />
                      <span className="hidden sm:inline">New Chat</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Start a new conversation</TooltipContent>
                </Tooltip>
              </>
            )}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 overflow-hidden flex-col gap-4 lg:flex-row">
          <Card className="flex min-h-0 flex-1 flex-col">
            <CardContent className="flex min-h-0 flex-1 flex-col p-0">
              {/* Scroll container */}
              <div className="relative flex-1 min-h-0">
                <div
                  ref={containerRef}
                  className="absolute inset-0 overflow-y-auto px-6 py-4"
                  // `overflow-anchor: none` prevents the browser from doing
                  // its own auto-scroll. We do it ourselves in rAF so we
                  // can gate it on `pinned`.
                  style={{ overflowAnchor: "none" }}
                >
                  <div className="space-y-4 pb-4">
                    {messages.length === 0 && (
                      <EmptyState
                        datasetName={selectedDataset?.name}
                        showSuggestions={showSuggestions}
                        onPick={(p) => setPrompt(p)}
                      />
                    )}

                    {messages.map((msg, idx) => (
                      <MessageBubble
                        key={msg.id}
                        message={msg}
                        copyOk={copyOk === msg.id}
                        onCopy={() => copyMessage(msg.id, msg.content)}
                        onRegenerate={() => regenerateMessage(idx)}
                      />
                    ))}
                    {/* Bottom sentinel so the scroll height is always
                        reachable even when the last message is short. */}
                    <div aria-hidden="true" className="h-px w-full" />
                  </div>
                </div>
                <ScrollToBottomButton
                  visible={detached}
                  onClick={() => scrollToBottom("smooth")}
                />
              </div>

              {/* Composer */}
              <div className="border-t border-border p-4">
                {errorMessage && !isStreaming ? (
                  <div className="mb-3 flex items-center gap-2 rounded-lg bg-danger/10 p-3 text-sm text-danger">
                    <AlertTriangle className="size-4 shrink-0" />
                    <span className="flex-1">{errorMessage}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => useChatStore.getState().setError(null)}
                    >
                      Dismiss
                    </Button>
                  </div>
                ) : null}

                <div className="flex gap-2 items-end">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-full text-muted-foreground hover:text-foreground"
                        onClick={() => setShowSuggestions((v) => !v)}
                        disabled={messages.length > 0}
                      >
                        <Sparkles
                          className={`size-5 ${showSuggestions ? "text-primary" : ""}`}
                        />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Toggle suggested prompts</TooltipContent>
                  </Tooltip>
                  <Textarea
                    ref={textareaRef}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={
                      datasetId === "none"
                        ? "Select a dataset first..."
                        : "Ask a question about your data…  (Enter to send, Shift+Enter for newline, Esc to stop)"
                    }
                    rows={1}
                    className="min-h-[44px] max-h-[200px] resize-none flex-1"
                    onKeyDown={handleKeyDown}
                    disabled={datasetId === "none"}
                  />
                  {isStreaming ? (
                    <StopButton />
                  ) : (
                    <Button
                      size="icon"
                      className="shrink-0 h-11 w-11 rounded-full"
                      onClick={sendMessage}
                      disabled={!prompt.trim() || datasetId === "none"}
                      aria-label="Send message"
                    >
                      <Send className="size-5" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="w-full shrink-0 overflow-hidden lg:w-80">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <BarChart className="size-5" />
                Dataset Context
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Dataset</Label>
                <Select value={datasetId} onValueChange={setDatasetId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a dataset" />
                  </SelectTrigger>
                  <SelectContent>
                    {(datasetsData?.items ?? []).map((ds) => (
                      <SelectItem key={ds.id} value={ds.id}>
                        <div>
                          <div className="font-medium truncate">{ds.name}</div>
                          <div className="text-xs text-muted flex items-center gap-2">
                            <span>{ds.row_count?.toLocaleString()} rows</span>
                            <Separator orientation="vertical" className="h-3" />
                            <span>{(ds as { column_count?: number }).column_count ?? "N/A"} cols</span>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedDataset && (
                <div className="rounded-lg bg-muted/30 p-3 space-y-2">
                  <p className="text-xs text-muted">
                    The AI has full context including: column types, statistics, correlations,
                    outliers, distributions, and data quality scores.
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-background/50 p-2 rounded">
                      <div className="text-muted">Rows</div>
                      <div className="font-semibold">
                        {selectedDataset.row_count?.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-background/50 p-2 rounded">
                      <div className="text-muted">Columns</div>
                      <div className="font-semibold">
                        {(selectedDataset as { column_count?: number }).column_count ?? "N/A"}
                      </div>
                    </div>
                    <div className="bg-background/50 p-2 rounded">
                      <div className="text-muted">Size</div>
                      <div className="font-semibold">
                        {(selectedDataset.file_size_bytes / 1024 / 1024).toFixed(1)} MB
                      </div>
                    </div>
                    <div className="bg-background/50 p-2 rounded">
                      <div className="text-muted">Type</div>
                      <div className="font-semibold capitalize">
                        {selectedDataset.mime_type?.split("/").pop()?.toUpperCase() ?? "—"}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <p className="text-xs text-muted">
                {datasetId === "none"
                  ? "Select a dataset to enable AI chat with full context."
                  : "The AI will analyze your dataset and use its context to answer your questions."}
              </p>

              {conversationId && (
                <div className="flex items-center gap-2 text-xs text-muted">
                  <Badge variant="outline" className="text-xs">
                    Active conversation
                  </Badge>
                  <span className="font-mono">{conversationId.slice(0, 8)}…</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}

// ---------------------------------------------------------------------------
// Message bubble — extracted so each message can be independently memoized.
// ---------------------------------------------------------------------------

interface MessageBubbleProps {
  message: ChatMessage;
  copyOk: boolean;
  onCopy: () => void;
  onRegenerate: () => void;
}

const MessageBubble = memo(function MessageBubble({
  message,
  copyOk,
  onCopy,
  onRegenerate,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-primary text-white"
            : "border border-border bg-muted-surface/50 text-foreground"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap text-sm">{message.content}</p>
        ) : (
          <>
            {/* KEY PIECE: the streaming renderer. While the message is
                still streaming, `isStreaming` is true and the renderer:
                  - shows the blinking cursor at the end,
                  - keeps the trailing code block un-highlighted to avoid
                    flicker.
                When `isStreaming` flips to false, Shiki runs once on the
                closed code blocks. */}
            <MarkdownRenderer
              content={message.content}
              isStreaming={Boolean(message.isStreaming)}
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {(message.model || message.provider) && !message.isStreaming ? (
                <div className="flex flex-wrap gap-1">
                  {message.model && (
                    <Badge variant="secondary" className="text-xs">
                      {message.model}
                    </Badge>
                  )}
                  {message.provider && (
                    <Badge variant="outline" className="text-xs">
                      {message.provider}
                    </Badge>
                  )}
                </div>
              ) : null}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <span className="sr-only">Message actions</span>
                    <svg
                      className="size-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="1" />
                      <circle cx="19" cy="12" r="1" />
                      <circle cx="5" cy="12" r="1" />
                    </svg>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[160px]">
                  <DropdownMenuItem
                    onClick={onCopy}
                    className="flex items-center gap-2"
                  >
                    {copyOk ? <Copy className="size-4 text-success" /> : <Copy className="size-4" />}
                    {copyOk ? "Copied" : "Copy"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={onRegenerate}
                    className="flex items-center gap-2"
                  >
                    <RotateCcw className="size-4" />
                    Regenerate
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </>
        )}
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Empty state with suggested prompts
// ---------------------------------------------------------------------------

function EmptyState({
  datasetName,
  showSuggestions,
  onPick,
}: {
  datasetName?: string;
  showSuggestions: boolean;
  onPick: (p: string) => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center py-16">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-accent/30">
        <Bot className="size-8 text-primary" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-foreground">
        {datasetName ? `Analyzing ${datasetName}` : "How can I help?"}
      </h3>
      <p className="mt-2 max-w-sm text-sm text-muted">
        {datasetName
          ? `Ask about trends, anomalies, or insights in ${datasetName}.`
          : "Select a dataset and start asking questions about your data."}
      </p>
      {datasetName && showSuggestions && (
        <div className="mt-6 w-full max-w-md">
          <p className="text-xs text-muted mb-3 text-left">Suggested prompts:</p>
          <div className="grid grid-cols-1 gap-2">
            {SUGGESTED_PROMPTS.slice(0, 6).map((s, idx) => (
              <button
                key={idx}
                className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary hover:bg-primary/20 text-left transition-colors"
                onClick={() => onPick(s.prompt(datasetName))}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

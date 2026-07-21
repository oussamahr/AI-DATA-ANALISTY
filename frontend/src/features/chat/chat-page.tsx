"use client";

import { useState, useCallback, useRef, useEffect, memo } from "react";
import {
  Bot,
  Send,
  Copy,
  RotateCcw,
  Trash2,
  Download,
  Sparkles,
  BarChart,
  Square,
  ChevronDown,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useDatasets } from "@/hooks/use-api";
import { api } from "@/services/api";
import { getErrorMessage } from "@/utils/cn";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { StreamingCursor } from "@/components/ui/typing-indicator";
import { useChatScroll } from "@/hooks/use-chat-scroll";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  model?: string;
  provider?: string;
  isStreaming?: boolean;
}

interface SuggestedPrompt {
  label: string;
  prompt: (datasetName: string) => string;
}

const SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  {
    label: "Overview & Summary",
    prompt: (name) => `Give me a comprehensive overview of the ${name} dataset. What are the key columns, data quality issues, and initial insights?`
  },
  {
    label: "Key Trends",
    prompt: (name) => `What are the main trends and patterns in the ${name} dataset? Identify any seasonality or growth/decline patterns.`
  },
  {
    label: "Top Performers",
    prompt: (name) => `What are the top 10 items by value in the ${name} dataset? Show me the highest performing categories, products, or regions.`
  },
  {
    label: "Anomalies & Outliers",
    prompt: (name) => `Detect any anomalies, outliers, or unusual patterns in the ${name} dataset. Are there any potential data quality issues or fraud signals?`
  },
  {
    label: "Correlations",
    prompt: (name) => `What are the strongest correlations in the ${name} dataset? Which variables are most related to each other?`
  },
  {
    label: "Data Quality Report",
    prompt: (name) => `Assess the data quality of the ${name} dataset. What are the missing values, duplicates, and inconsistencies?`
  },
  {
    label: "Forecasting",
    prompt: (name) => `Can you forecast future values for the ${name} dataset? Identify the best time series column and target metric.`
  },
  {
    label: "Visualization Ideas",
    prompt: (name) => `Recommend the best visualizations for the ${name} dataset. What charts would work well for exploration vs presentation?`
  },
  {
    label: "SQL Generation",
    prompt: (name) => `Generate a SQL query to find the top 5 categories by total revenue in the ${name} dataset.`
  },
  {
    label: "Python Analysis",
    prompt: (name) => `Generate Python code to perform exploratory data analysis on the ${name} dataset with visualizations.`
  },
];

// ─── Memoized Chat Message ──────────────────────────────────────────

interface ChatMessageProps {
  message: Message;
  index?: number;
  onCopy: (content: string) => void;
  onRegenerate?: (index: number) => void;
  isLastStreaming?: boolean;
}

const ChatMessage = memo(function ChatMessage({
  message,
  index,
  onCopy,
  onRegenerate,
  isLastStreaming = false,
}: ChatMessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          message.role === "user"
            ? "bg-primary text-white"
            : "border border-border bg-muted-surface/50 text-foreground"
        }`}
      >
        {message.role === "assistant" ? (
          <>
            <div className="min-h-[1em]">
              <MarkdownRenderer content={message.content} />
              {isLastStreaming && <StreamingCursor />}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {(message.model || message.provider) && (
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
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground">
                    <span className="sr-only">Message actions</span>
                    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="1" />
                      <circle cx="19" cy="12" r="1" />
                      <circle cx="5" cy="12" r="1" />
                    </svg>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[160px]">
                  <DropdownMenuItem
                    onClick={() => onCopy(message.content)}
                    className="flex items-center gap-2"
                  >
                    <Copy className="size-4" />
                    Copy
                  </DropdownMenuItem>
                  {!isLastStreaming && onRegenerate !== undefined && index !== undefined && (
                    <DropdownMenuItem
                      onClick={() => onRegenerate(index)}
                      className="flex items-center gap-2"
                    >
                      <RotateCcw className="size-4" />
                      Regenerate
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </>
        ) : (
          <p className="whitespace-pre-wrap text-sm">{message.content}</p>
        )}
      </div>
    </motion.div>
  );
});

// ─── Chat Page ──────────────────────────────────────────────────────

export function ChatPage() {
  const { data: datasetsData } = useDatasets(1, 100);
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingMsg, setStreamingMsg] = useState<Message | null>(null);
  const [prompt, setPrompt] = useState("");
  const [datasetId, setDatasetId] = useState<string>("none");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Mutable ref for streaming state — never causes re-renders
  const streamingRef = useRef({
    msgId: "",
    buffer: "",
    fullContent: "",
    model: undefined as string | undefined,
    provider: undefined as string | undefined,
    convId: undefined as string | undefined,
    rAFId: 0,
    isCancelled: false,
  });

  // ── Smart scroll ──────────────────────────────────────────────────
  const { containerRef, showScrollButton, scrollToBottom } = useChatScroll([
    messages.length,
    streamingMsg?.content,
    isStreaming,
  ]);

  // ── Cleanup rAF on unmount ────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (streamingRef.current.rAFId) {
        cancelAnimationFrame(streamingRef.current.rAFId);
      }
    };
  }, []);

  // ── Batched streaming update ──────────────────────────────────────
  // Flushes the token buffer to React state once per animation frame.
  // This prevents a React render cycle on every single token.
  const flushToState = useCallback(() => {
    const s = streamingRef.current;
    if (s.buffer && !s.isCancelled) {
      setStreamingMsg((prev) => ({
        id: s.msgId,
        role: "assistant",
        content: (prev?.content || "") + s.buffer,
        isStreaming: true,
        model: s.model,
        provider: s.provider,
      }));
      s.buffer = "";
    }
    s.rAFId = 0;
  }, []);

  // Appends a token to the buffer and schedules a flush via rAF.
  // The fullContent ref is updated synchronously so the final message
  // is always complete regardless of buffer state.
  const addToken = useCallback(
    (token: string) => {
      const s = streamingRef.current;
      s.fullContent += token;
      s.buffer += token;
      if (!s.rAFId) {
        s.rAFId = requestAnimationFrame(flushToState);
      }
    },
    [flushToState],
  );

  // ── Cancel streaming ──────────────────────────────────────────────
  const cancelStream = useCallback(() => {
    const s = streamingRef.current;
    s.isCancelled = true;
    if (s.rAFId) {
      cancelAnimationFrame(s.rAFId);
      s.rAFId = 0;
    }
    // Keep whatever was generated so far
    setStreamingMsg(null);
    if (s.fullContent) {
      setMessages((prev) => [
        ...prev,
        {
          id: s.msgId,
          role: "assistant" as const,
          content: s.fullContent,
          isStreaming: false,
          model: s.model,
          provider: s.provider,
        },
      ]);
    }
    abortControllerRef.current?.abort();
    setIsStreaming(false);
    abortControllerRef.current = null;
  }, []);

  // ── Send message with streaming ───────────────────────────────────
  const sendMessageWithContent = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return;
      if (datasetId === "none") {
        setError("Please select a dataset to chat about");
        return;
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: content.trim(),
      };

      const assistantMsgId = crypto.randomUUID();

      // Reset streaming state
      const s = streamingRef.current;
      s.msgId = assistantMsgId;
      s.buffer = "";
      s.fullContent = "";
      s.model = undefined;
      s.provider = undefined;
      s.convId = undefined;
      s.rAFId = 0;
      s.isCancelled = false;

      // Add user message + placeholder assistant message
      setMessages((prev) => [...prev, userMsg]);
      setStreamingMsg({
        id: assistantMsgId,
        role: "assistant",
        content: "",
        isStreaming: true,
      });
      setIsStreaming(true);
      setShowSuggestions(false);
      setError(null);

      let receivedConversationId: string | undefined;
      let receivedModel: string | undefined;
      let receivedProvider: string | undefined;

      try {
        const stream = api.streamChatAboutDataset(
          datasetId,
          userMsg.content,
          conversationId || undefined,
          controller.signal,
        );

        for await (const chunk of stream) {
          if (controller.signal.aborted || streamingRef.current.isCancelled) break;

          if (chunk.conversation_id && !receivedConversationId) {
            receivedConversationId = chunk.conversation_id;
          }
          if (chunk.model) receivedModel = chunk.model;
          if (chunk.provider) receivedProvider = chunk.provider;

          if (chunk.content) {
            addToken(chunk.content);
          }
          if (chunk.done) break;
        }

        // ── Finalize ──────────────────────────────────────────────
        const finalS = streamingRef.current;
        if (!finalS.isCancelled) {
          if (finalS.rAFId) {
            cancelAnimationFrame(finalS.rAFId);
            finalS.rAFId = 0;
          }

          // Apply any remaining buffered tokens
          if (finalS.buffer) {
            setStreamingMsg((prev) => ({
              id: finalS.msgId,
              role: "assistant",
              content: (prev?.content || "") + finalS.buffer,
              isStreaming: false,
              model: receivedModel || finalS.model,
              provider: receivedProvider || finalS.provider,
            }));
            finalS.buffer = "";
          }

          // Move the streaming message into the completed messages list
          setStreamingMsg(null);
          setMessages((prev) => [
            ...prev,
            {
              id: finalS.msgId,
              role: "assistant",
              content: finalS.fullContent,
              isStreaming: false,
              model: receivedModel || finalS.model,
              provider: receivedProvider || finalS.provider,
            },
          ]);

          if (!conversationId && receivedConversationId) {
            setConversationId(receivedConversationId);
          }
        }
      } catch (err) {
        // ── Error handling ────────────────────────────────────────
        // On network interruption or server error, we keep whatever
        // content was generated so the user doesn't lose their response.
        if (!streamingRef.current.isCancelled) {
          const errS = streamingRef.current;
          if (errS.rAFId) {
            cancelAnimationFrame(errS.rAFId);
            errS.rAFId = 0;
          }
          setStreamingMsg(null);

          if (errS.fullContent) {
            setMessages((prev) => [
              ...prev,
              {
                id: errS.msgId,
                role: "assistant",
                content: errS.fullContent,
                isStreaming: false,
                model: errS.model,
                provider: errS.provider,
              },
            ]);
          }

          setError(`Stream interrupted: ${getErrorMessage(err)}`);
        }
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [datasetId, conversationId, isStreaming, addToken],
  );

  // ── Refs for stable callbacks ──────────────────────────────────────

  const regenerateMessage = useCallback(
    async (messageIndex: number) => {
      if (messageIndex === 0 || messageIndex >= messages.length) return;
      const targetMsg = messages[messageIndex];
      if (targetMsg.role !== "assistant") return;

      const userMsgIndex = messages.findIndex((m, i) =>
        i < messageIndex && m.role === "user" &&
        messages.slice(i + 1, messageIndex).every((m) => m.role === "assistant"),
      );
      if (userMsgIndex === -1) return;

      const userMsg = messages[userMsgIndex];
      setMessages((prev) => prev.slice(0, userMsgIndex + 1));
      await sendMessageWithContent(userMsg.content);
    },
    [messages, sendMessageWithContent],
  );

  // Stable function refs so memoised ChatMessage doesn't re-render
  const copyMessage = useCallback(async (content: string) => {
    await navigator.clipboard.writeText(content);
  }, []);

  const regenerateRef = useRef(regenerateMessage);
  regenerateRef.current = regenerateMessage;

  const handleRegenerate = useCallback((index: number) => {
    regenerateRef.current(index);
  }, []);

  // ── Utilities ─────────────────────────────────────────────────────

  const sendMessage = useCallback(async () => {
    await sendMessageWithContent(prompt);
  }, [sendMessageWithContent, prompt]);

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [prompt]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearConversation = () => {
    setMessages([]);
    setStreamingMsg(null);
    setConversationId(null);
    setShowSuggestions(true);
  };

  const exportConversation = () => {
    const allMessages = streamingMsg
      ? [...messages, streamingMsg]
      : messages;

    const exportData = {
      datasetId,
      datasetName: datasetsData?.items?.find((d) => d.id === datasetId)?.name || "Unknown",
      exportedAt: new Date().toISOString(),
      messages: allMessages.map((m) => ({
        role: m.role,
        content: m.content,
        model: m.model,
        provider: m.provider,
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `conversation-${datasetId}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedDataset = datasetsData?.items?.find((d) => d.id === datasetId);

  // ── Render ────────────────────────────────────────────────────────

  return (
    <TooltipProvider>
      <div className="page-container flex flex-1 min-h-0 flex-col gap-4 overflow-hidden">
         <div className="flex flex-col shrink-0 sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="page-title">AI Chat</h1>
            <p className="page-subtitle">Ask questions about your data in natural language</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(messages.length > 0 || streamingMsg) && (
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
                      onClick={clearConversation}
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
              {/* ── Messages Area ─────────────────────────────────────── */}
              <div
                ref={containerRef}
                className="relative flex-1 min-h-0 space-y-4 overflow-y-auto p-6"
              >
                {messages.length === 0 && !streamingMsg ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <div className="flex size-16 items-center justify-center rounded-2xl bg-accent/30">
                      <Bot className="size-8 text-primary" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-foreground">
                      {selectedDataset ? `Analyzing ${selectedDataset.name}` : "How can I help?"}
                    </h3>
                    <p className="mt-2 max-w-sm text-sm text-muted">
                      {selectedDataset
                        ? `Ask about trends, anomalies, or insights in ${selectedDataset.name}.`
                        : "Select a dataset and start asking questions about your data."}
                    </p>

                    {selectedDataset && showSuggestions && (
                      <div className="mt-6 w-full max-w-md">
                        <p className="text-xs text-muted mb-3 text-left">Suggested prompts:</p>
                        <div className="grid grid-cols-1 gap-2">
                          {SUGGESTED_PROMPTS.slice(0, 6).map((suggestion, idx) => (
                            <button
                              key={idx}
                              className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary hover:bg-primary/20 text-left transition-colors"
                              onClick={() => setPrompt(suggestion.prompt(selectedDataset.name))}
                            >
                              {suggestion.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {messages.map((msg, idx) => (
                      <ChatMessage
                        key={msg.id}
                        message={msg}
                        index={idx}
                        onCopy={copyMessage}
                        onRegenerate={handleRegenerate}
                        isLastStreaming={false}
                      />
                    ))}
                    {streamingMsg && (
                      <ChatMessage
                        key={streamingMsg.id}
                        message={streamingMsg}
                        onCopy={copyMessage}
                        isLastStreaming={true}
                      />
                    )}
                  </>
                )}

                {/* ── Scroll-to-bottom button ───────────────────────── */}
                {showScrollButton && (
                  <div className="sticky bottom-0 flex justify-center pointer-events-none">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="pointer-events-auto shadow-lg rounded-full gap-1.5"
                      onClick={scrollToBottom}
                    >
                      <ChevronDown className="size-4" />
                      Scroll to bottom
                    </Button>
                  </div>
                )}

                <div className="h-0" />
              </div>

              {/* ── Input Area ────────────────────────────────────────── */}
              <div className="border-t border-border p-4">
                {error && (
                  <div className="mb-3 flex items-center gap-2 rounded-lg bg-danger/10 p-3 text-sm text-danger">
                    <span className="flex-1">{error}</span>
                    <Button variant="ghost" size="icon" onClick={() => setError(null)}>
                      <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </Button>
                  </div>
                )}
                <div className="flex gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-full text-muted-foreground hover:text-foreground"
                        onClick={() => setShowSuggestions(!showSuggestions)}
                        disabled={messages.length > 0 || !!streamingMsg}
                      >
                        {showSuggestions ? <Sparkles className="size-5 text-primary" /> : <Sparkles className="size-5" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Toggle suggested prompts</TooltipContent>
                  </Tooltip>
                  <Textarea
                    ref={textareaRef}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={datasetId === "none" ? "Select a dataset first..." : "Ask a question about your data..."}
                    rows={2}
                    className="min-h-[60px] max-h-[200px] resize-none flex-1"
                    onKeyDown={handleKeyDown}
                    disabled={isStreaming || datasetId === "none"}
                  />
                  <Button
                    size="icon"
                    className="shrink-0 self-end h-10 w-10 rounded-full"
                    onClick={isStreaming ? cancelStream : sendMessage}
                    disabled={!isStreaming && (!prompt.trim() || datasetId === "none")}
                    aria-label={isStreaming ? "Stop generating" : "Send message"}
                  >
                    {isStreaming ? (
                      <Square className="size-5 fill-current" />
                    ) : (
                      <Send className="size-5" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Sidebar ───────────────────────────────────────────────── */}
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
                            <span>{ds.column_count || "N/A"} cols</span>
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
                    The AI has full context including: column types, statistics, correlations, outliers, distributions, and data quality scores.
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-background/50 p-2 rounded">
                      <div className="text-muted">Rows</div>
                      <div className="font-semibold">{selectedDataset.row_count?.toLocaleString()}</div>
                    </div>
                    <div className="bg-background/50 p-2 rounded">
                      <div className="text-muted">Columns</div>
                      <div className="font-semibold">{selectedDataset.column_count || "N/A"}</div>
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
                  <Badge variant="outline" className="text-xs">Active conversation</Badge>
                  <span className="font-mono">{conversationId.slice(0, 8)}...</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}

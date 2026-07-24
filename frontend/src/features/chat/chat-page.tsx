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
  ThumbsUp,
  ThumbsDown,
  Clock,
  MessageSquare,
  Share2,
  Edit3,
  Check,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { useDatasets } from "@/hooks/use-api";
import { api } from "@/services/api";
import { getErrorMessage } from "@/utils/cn";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { StreamingCursor, ThinkingBubble } from "@/components/ui/typing-indicator";
import { useChatScroll } from "@/hooks/use-chat-scroll";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  model?: string;
  provider?: string;
  isStreaming?: boolean;
  isClarifying?: boolean;
  timestamp?: Date;
  tokens?: { prompt: number; completion: number };
  reaction?: "up" | "down";
}

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

// ─── Memoized Chat Message ──────────────────────────────────────────

interface ChatMessageProps {
  message: Message;
  index?: number;
  onCopy: (content: string) => void;
  onRegenerate?: (index: number) => void;
  onReaction: (messageId: string, reaction: "up" | "down") => void;
  isLastStreaming?: boolean;
}

const ChatMessage = memo(function ChatMessage({
  message,
  index,
  onCopy,
  onRegenerate,
  onReaction,
  isLastStreaming = false,
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy(message.content);
  };

  const handleReaction = (reaction: "up" | "down") => {
    onReaction(message.id, reaction);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`group relative max-w-[85%] px-4 py-3 ${
          message.role === "user"
            ? "rounded-2xl bg-primary text-foreground"
            : isLastStreaming
              ? "text-foreground"
              : message.isClarifying
                ? "rounded-2xl border-2 border-accent/30 bg-accent/5 text-foreground"
                : "rounded-2xl border border-border bg-muted-surface/50 text-foreground"
        }`}
      >
        {message.role === "assistant" ? (
          <>
            <div className="min-h-[1em]">
              {isLastStreaming && message.content === "" ? (
                // Waiting for the first token: rounded thinking bubble with animated dots
                <ThinkingBubble />
              ) : (
                <MarkdownRenderer content={message.content} isStreaming={isLastStreaming} />
              )}
            </div>
            {message.isClarifying && !isLastStreaming && (
              <div className="mt-2 flex items-center gap-2 text-xs text-accent">
                <span>❓</span>
                <span>Clarifying question — your next response will help me assist you better</span>
              </div>
            )}
            {!isLastStreaming && (
              <div className="mt-2 flex flex-wrap items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
                {message.timestamp && (
                  <div className="flex items-center gap-1 text-xs text-muted">
                    <Clock className="w-3 h-3" />
                    {formatTime(message.timestamp)}
                  </div>
                )}
                {message.tokens && (
                  <div className="flex items-center gap-1 text-xs text-muted">
                    <span>{message.tokens.prompt + message.tokens.completion} tokens</span>
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
                    <DropdownMenuItem onClick={handleCopy} className="flex items-center gap-2">
                      <Copy className="size-4" />
                      {copied ? "Copied!" : "Copy"}
                    </DropdownMenuItem>
                    {onRegenerate !== undefined && index !== undefined && (
                      <DropdownMenuItem
                        onClick={() => onRegenerate(index)}
                        className="flex items-center gap-2"
                      >
                        <RotateCcw className="size-4" />
                        Regenerate
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => handleReaction("up")}
                      className="flex items-center gap-2"
                    >
                      <ThumbsUp className="size-4" />
                      Helpful
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleReaction("down")}
                      className="flex items-center gap-2"
                    >
                      <ThumbsDown className="size-4" />
                      Not helpful
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </>
        ) : (
          <p className="whitespace-pre-wrap text-sm">{message.content}</p>
        )}

        {/* Reaction indicator for assistant messages */}
        {!isLastStreaming && message.role === "assistant" && message.reaction && (
          <div className="absolute -bottom-2 right-2 bg-surface border border-border rounded-full px-1.5 py-0.5">
            {message.reaction === "up" ? (
              <ThumbsUp className="w-3 h-3 text-accent" />
            ) : (
              <ThumbsDown className="w-3 h-3 text-danger" />
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
});

// ─── Quick Reply Buttons ────────────────────────────────────────────

const QUICK_REPLIES = [
  "Can you elaborate on that?",
  "Show me the SQL for this",
  "What are the limitations?",
  "Give me a summary",
];

function QuickReplies({ onQuickReply }: { onQuickReply: (text: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="mb-4 flex flex-wrap gap-2"
    >
      {QUICK_REPLIES.map((reply) => (
        <Button
          key={reply}
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={() => onQuickReply(reply)}
        >
          {reply}
        </Button>
      ))}
    </motion.div>
  );
}

// ─── Chat Page ──────────────────────────────────────────────────────

export function ChatPage() {
  const { data: datasetsData } = useDatasets(1, 100);
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingMsg, setStreamingMsg] = useState<Message | null>(null);
  const [prompt, setPrompt] = useState("");
  const [datasetId, setDatasetId] = useState<string>("none");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationTitle, setConversationTitle] = useState<string>("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [messageReactions, setMessageReactions] = useState<Record<string, "up" | "down">>({});
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
      // No rAF scheduling used for progressive streaming
    };
  }, []);

  // ── Batched streaming update ──────────────────────────────────────
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
        timestamp: new Date(),
      }));
      s.buffer = "";
    }
    s.rAFId = 0;
  }, []);

  // Appends a token to the buffer and schedules a flush via rAF.
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
          timestamp: new Date(),
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
        timestamp: new Date(),
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
        timestamp: new Date(),
      });
      setIsStreaming(true);
      setShowSuggestions(false);
      setShowQuickReplies(false);
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
          selectedModel || undefined,
          selectedProvider || undefined,
        );

        for await (const chunk of stream) {
          if (controller.signal.aborted || streamingRef.current.isCancelled) break;

          if (chunk.conversation_id && !receivedConversationId) {
            receivedConversationId = chunk.conversation_id;
          }
          if (chunk.model) receivedModel = chunk.model;
          if (chunk.provider) receivedProvider = chunk.provider;

          // Skip thinking state progress updates
          if (chunk.state === "thinking") {
            continue;
          }

          // Handle clarifying state
          if (chunk.state === "clarifying") {
            if (chunk.content) {
              addToken(chunk.content);
            }
            if (chunk.done) {
              const finalS = streamingRef.current;
              if (finalS.rAFId) {
                cancelAnimationFrame(finalS.rAFId);
                finalS.rAFId = 0;
              }
              if (finalS.buffer) {
                setStreamingMsg((prev) => ({
                  id: finalS.msgId,
                  role: "assistant",
                  content: (prev?.content || "") + finalS.buffer,
                  isStreaming: false,
                  model: receivedModel || finalS.model,
                  provider: receivedProvider || finalS.provider,
                  isClarifying: true,
                  timestamp: new Date(),
                }));
                finalS.buffer = "";
              }
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
                  isClarifying: true,
                  timestamp: new Date(),
                },
              ]);
              setShowQuickReplies(true);
              if (!conversationId && receivedConversationId) {
                setConversationId(receivedConversationId);
              }
            }
            continue;
          }

          // Handle error state from stream
          if (chunk.state === "error") {
            const errS = streamingRef.current;
            if (errS.rAFId) {
              cancelAnimationFrame(errS.rAFId);
              errS.rAFId = 0;
            }
            setStreamingMsg(null);
            setIsStreaming(false);
            setError(chunk.error_detail || "Something went wrong");
            return;
          }

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
              timestamp: new Date(),
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
              timestamp: new Date(),
            },
          ]);
          setShowQuickReplies(true);

          if (!conversationId && receivedConversationId) {
            setConversationId(receivedConversationId);
          }
        }
      } catch (err) {
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
                timestamp: new Date(),
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
    [datasetId, conversationId, isStreaming, addToken, selectedModel, selectedProvider],
  );

  // ── Regenerate message ────────────────────────────────────────────
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

  // Stable function refs
  const copyMessage = useCallback(async (content: string) => {
    await navigator.clipboard.writeText(content);
  }, []);

  const regenerateRef = useRef(regenerateMessage);
  regenerateRef.current = regenerateMessage;

  const handleRegenerate = useCallback((index: number) => {
    regenerateRef.current(index);
  }, []);

  const handleReaction = useCallback((messageId: string, reaction: "up" | "down") => {
    setMessageReactions((prev) => ({ ...prev, [messageId]: reaction }));
  }, []);

  // ── Utilities ─────────────────────────────────────────────────────
  const sendMessage = useCallback(async () => {
    await sendMessageWithContent(prompt);
  }, [sendMessageWithContent, prompt]);

  const handleQuickReply = useCallback((text: string) => {
    sendMessageWithContent(text);
  }, [sendMessageWithContent]);

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
    setConversationTitle("");
    setShowSuggestions(true);
    setShowQuickReplies(false);
  };

  const exportConversation = () => {
    const allMessages = streamingMsg
      ? [...messages, streamingMsg]
      : messages;

    const exportData = {
      datasetId,
      datasetName: datasetsData?.items?.find((d) => d.id === datasetId)?.name || "Unknown",
      conversationTitle: conversationTitle || `Chat about ${datasetsData?.items?.find((d) => d.id === datasetId)?.name || "dataset"}`,
      exportedAt: new Date().toISOString(),
      messages: allMessages.map((m) => ({
        role: m.role,
        content: m.content,
        model: m.model,
        provider: m.provider,
        timestamp: m.timestamp?.toISOString(),
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

  // Auto-generate conversation title from first user message
  useEffect(() => {
    if (messages.length === 1 && messages[0].role === "user" && !conversationTitle) {
      const title = messages[0].content.slice(0, 50) + (messages[0].content.length > 50 ? "..." : "");
      setConversationTitle(title);
    }
  }, [messages, conversationTitle]);

  // ── Render ────────────────────────────────────────────────────────
  return (
    <TooltipProvider>
      <div className="page-container flex flex-1 min-h-0 flex-col gap-4 overflow-hidden">
        <div className="flex flex-col shrink-0 sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            {conversationTitle && isEditingTitle ? (
              <div className="flex items-center gap-1">
                <Input
                  value={conversationTitle}
                  onChange={(e) => setConversationTitle(e.target.value)}
                  className="h-8 text-lg font-semibold"
                  autoFocus
                  onBlur={() => setIsEditingTitle(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setIsEditingTitle(false);
                    if (e.key === "Escape") setIsEditingTitle(false);
                  }}
                />
                <Button size="sm" variant="ghost" onClick={() => setIsEditingTitle(false)}>
                  <Check className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <>
                <h1 className="page-title">{conversationTitle || "AI Chat"}</h1>
                {conversationTitle && (
                  <Button size="sm" variant="ghost" onClick={() => setIsEditingTitle(true)}>
                    <Edit3 className="w-4 h-4" />
                  </Button>
                )}
              </>
            )}
          </div>
          <p className="page-subtitle">Ask questions about your data in natural language</p>
          <div className="flex flex-wrap items-center gap-2">
            {(messages.length > 0 || streamingMsg) && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={exportConversation} className="gap-1">
                      <Download className="size-4" />
                      <span className="hidden sm:inline">Export</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Export conversation as JSON</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={clearConversation} className="gap-1">
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
                    {showQuickReplies && messages.length > 0 && !isStreaming && (
                      <QuickReplies onQuickReply={handleQuickReply} />
                    )}
                    {messages.map((msg, idx) => (
                      <ChatMessage
                        key={msg.id}
                        message={{ ...msg, reaction: messageReactions[msg.id] }}
                        index={idx}
                        onCopy={copyMessage}
                        onRegenerate={handleRegenerate}
                        onReaction={handleReaction}
                        isLastStreaming={false}
                      />
                    ))}
                    {streamingMsg && (
                      <ChatMessage
                        key={streamingMsg.id}
                        message={streamingMsg}
                        onCopy={copyMessage}
                        onReaction={handleReaction}
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
                      <X className="size-4" />
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

              <div className="space-y-2">
                <Label>AI Model</Label>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Auto (default)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Auto (default)</SelectItem>
                    <SelectItem value="gemini-2.0-flash">Gemini 2.0 Flash</SelectItem>
                    <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                    <SelectItem value="gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
                    <SelectItem value="llama-3.1-70b-versatile">Llama 3.1 70B (Groq)</SelectItem>
                    <SelectItem value="llama-3.1-8b-instant">Llama 3.1 8B (Groq)</SelectItem>
                    <SelectItem value="gpt-4o">GPT-4o (OpenAI)</SelectItem>
                    <SelectItem value="gpt-4o-mini">GPT-4o Mini (OpenAI)</SelectItem>
                    <SelectItem value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet (Anthropic)</SelectItem>
                    <SelectItem value="deepseek-chat">DeepSeek Chat</SelectItem>
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

              {messages.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-muted">
                  <MessageSquare className="w-3 h-3" />
                  <span>{messages.length} messages</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}

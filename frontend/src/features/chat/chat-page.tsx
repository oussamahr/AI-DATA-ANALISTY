"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { 
  Bot, 
  Loader2, 
  Send, 
  Copy, 
  Check, 
  RotateCcw,
  Trash2,
  Download,
  Sparkles,
  BarChart,
  Search,
  Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
import { TypingIndicator, StreamingMessage } from "@/components/ui/typing-indicator";

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

export function ChatPage() {
  const { data: datasetsData } = useDatasets(1, 100);
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState("");
  const [datasetId, setDatasetId] = useState<string>("none");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming, scrollToBottom]);

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [prompt]);

  const clearConversation = () => {
    setMessages([]);
    setConversationId(null);
    setShowSuggestions(true);
  };

  const copyMessage = async (content: string) => {
    await navigator.clipboard.writeText(content);
  };

  const regenerateMessage = async (messageIndex: number) => {
    if (messageIndex === 0) return; // Can't regenerate first message if it's user
    
    const userMessages = messages.filter(m => m.role === "user");
    const assistantMessages = messages.filter(m => m.role === "assistant");
    
    if (messageIndex >= messages.length) return;
    
    const targetMsg = messages[messageIndex];
    if (targetMsg.role !== "assistant") return;

    // Find the corresponding user message
    const userMsgIndex = messages.findIndex((m, i) => 
      i < messageIndex && m.role === "user" && 
      messages.slice(i + 1, messageIndex).every(m => m.role === "assistant")
    );
    
    if (userMsgIndex === -1) return;
    
    const userMsg = messages[userMsgIndex];
    const newMessages = messages.slice(0, userMsgIndex + 1);
    
    setMessages(newMessages);
    setConversationId(conversationId); // Keep conversation ID
    
    // Send the same user message again
    await sendMessageWithContent(userMsg.content);
  };

  const exportConversation = () => {
    const exportData = {
      datasetId,
      datasetName: datasetsData?.items?.find(d => d.id === datasetId)?.name || "Unknown",
      exportedAt: new Date().toISOString(),
      messages: messages.map(m => ({
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

  const sendMessageWithContent = async (content: string) => {
    if (!content.trim() || isStreaming) return;
    if (datasetId === "none") {
      setError("Please select a dataset to chat about");
      return;
    }

    const userMsg: Message = { 
      id: crypto.randomUUID(), 
      role: "user", 
      content: content.trim() 
    };
    
    setMessages((prev) => [...prev, userMsg]);
    setPrompt("");
    setIsStreaming(true);
    setShowSuggestions(false);
    setError(null);

    try {
      const stream = api.streamChatAboutDataset(datasetId, userMsg.content, conversationId || undefined);
      
      // Add placeholder for streaming response
      const assistantMsgId = crypto.randomUUID();
      setMessages((prev) => [...prev, {
        id: assistantMsgId,
        role: "assistant",
        content: "",
        isStreaming: true,
      }]);

      let fullResponse = "";
      let receivedConversationId: string | undefined;
      let receivedModel: string | undefined;
      let receivedProvider: string | undefined;

      for await (const chunk of stream) {
        if (chunk.conversation_id && !receivedConversationId) {
          receivedConversationId = chunk.conversation_id;
        }
        if (chunk.model) receivedModel = chunk.model;
        if (chunk.provider) receivedProvider = chunk.provider;
        if (chunk.content) {
          fullResponse += chunk.content;
          setMessages((prev) => prev.map(msg => 
            msg.id === assistantMsgId 
              ? { ...msg, content: fullResponse }
              : msg
          ));
        }
        if (chunk.done) break;
      }

      if (!conversationId && receivedConversationId) {
        setConversationId(receivedConversationId);
      }

      // Update final message
      setMessages((prev) => prev.map(msg => 
        msg.id === assistantMsgId 
          ? { 
              ...msg, 
              content: fullResponse, 
              isStreaming: false,
              model: receivedModel,
              provider: receivedProvider,
            }
          : msg
      ));

    } catch (err) {
      setError(getErrorMessage(err));
      // Remove streaming placeholder on error
      setMessages((prev) => prev.filter(msg => msg.id !== assistantMsgId));
    } finally {
      setIsStreaming(false);
    }
  };

  const sendMessage = async () => {
    await sendMessageWithContent(prompt);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const selectedDataset = datasetsData?.items?.find(d => d.id === datasetId);

  return (
    <TooltipProvider>
      <div className="page-container flex h-[calc(100vh-4rem)] flex-col gap-4">
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

        <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
          <Card className="flex min-h-0 flex-1 flex-col">
            <CardContent className="flex min-h-0 flex-1 flex-col p-0">
              <div className="flex-1 space-y-4 overflow-y-auto p-6">
                {messages.length === 0 && (
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
                        : "Select a dataset and start asking questions about your data."
                      }
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
                )}

                <AnimatePresence>
                  {messages.map((msg, idx) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                          msg.role === "user"
                            ? "bg-primary text-white"
                            : "border border-border bg-muted-surface/50 text-foreground"
                        }`}
                      >
                        {msg.role === "assistant" ? (
                          <>
                            <MarkdownRenderer content={msg.content} />
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              {(msg.model || msg.provider) && (
                                <div className="flex flex-wrap gap-1">
                                  {msg.model && (
                                    <Badge variant="secondary" className="text-xs">
                                      {msg.model}
                                    </Badge>
                                  )}
                                  {msg.provider && (
                                    <Badge variant="outline" className="text-xs">
                                      {msg.provider}
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
                                    onClick={() => copyMessage(msg.content)}
                                    className="flex items-center gap-2"
                                  >
                                    <Copy className="size-4" />
                                    Copy
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => regenerateMessage(idx)}
                                    className="flex items-center gap-2"
                                  >
                                    <RotateCcw className="size-4" />
                                    Regenerate
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </>
                        ) : (
                          <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {isStreaming && (
                  <div className="flex items-center gap-2">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-2"
                    >
                      <div className="flex size-8 items-center justify-center rounded-xl bg-accent/30">
                        <Bot className="size-4 text-primary" />
                      </div>
                      <StreamingMessage content="" isStreaming={true} />
                    </motion.div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

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
                        disabled={messages.length > 0}
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
                    onClick={sendMessage} 
                    disabled={isStreaming || !prompt.trim() || datasetId === "none"}
                    aria-label="Send message"
                  >
                    <Send className="size-5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="w-full shrink-0 lg:w-80">
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
                            <span>{ds.column_count || 'N/A'} cols</span>
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
                      <div className="font-semibold">{selectedDataset.column_count || 'N/A'}</div>
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
                        {selectedDataset.mime_type.split("/").pop()?.toUpperCase()}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <p className="text-xs text-muted">
                {datasetId === "none" 
                  ? "Select a dataset to enable AI chat with full context."
                  : "The AI will analyze your dataset and use its context to answer your questions."
                }
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
"use client";

import { useState, useEffect } from "react";
import { History, MessageSquare, Search, Calendar, Bot, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PageSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useDatasets } from "@/hooks/use-api";
import { api } from "@/services/api";
import { formatDate, getErrorMessage } from "@/utils/cn";

interface ConversationSummary {
  id: string;
  dataset_id: string;
  title: string;
  message_count: number;
  created_at: string;
  updated_at: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export function HistoryPage() {
  const { data: datasetsData, isLoading: datasetsLoading } = useDatasets(1, 100);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("none");
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationSummary | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load conversations when dataset is selected
  useEffect(() => {
    if (selectedDatasetId === "none") {
      setConversations([]);
      setSelectedConversation(null);
      setMessages([]);
      return;
    }

    const loadConversations = async () => {
      setIsLoadingConversations(true);
      setError(null);
      try {
        const data = await api.listConversations(selectedDatasetId);
        setConversations(data || []);
        setSelectedConversation(null);
        setMessages([]);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setIsLoadingConversations(false);
      }
    };

    loadConversations();
  }, [selectedDatasetId]);

  // Load messages when a conversation is selected
  const loadConversationMessages = async (conv: ConversationSummary) => {
    setSelectedConversation(conv);
    setIsLoadingMessages(true);
    setError(null);
    try {
      const data = await api.getChatHistory(conv.id);
      setMessages(data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoadingMessages(false);
    }
  };

  if (datasetsLoading) return <PageSkeleton />;

  return (
    <div className="page-container space-y-6">
      <div>
        <h1 className="page-title">Conversation History</h1>
        <p className="page-subtitle">Browse your AI chat conversations by dataset</p>
      </div>

      {error && (
        <div className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {/* Dataset selector */}
      <div className="max-w-md">
        <Select value={selectedDatasetId} onValueChange={setSelectedDatasetId}>
          <SelectTrigger>
            <SelectValue placeholder="Select a dataset to view conversations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Choose a dataset...</SelectItem>
            {datasetsData?.items.map((ds) => (
              <SelectItem key={ds.id} value={ds.id}>
                {ds.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedDatasetId === "none" ? (
        <EmptyState
          icon={History}
          title="Select a dataset"
          description="Choose a dataset from the dropdown above to see your AI chat conversations."
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Conversation list */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted">Conversations</h2>
            {isLoadingConversations ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-lg bg-muted/30" />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <EmptyState
                icon={MessageSquare}
                title="No conversations yet"
                description="Start a chat from the Chat page to see conversation history here."
              />
            ) : (
              <div className="space-y-2">
                {conversations.map((conv) => (
                  <Card
                    key={conv.id}
                    className={`cursor-pointer transition-all hover:shadow-soft ${
                      selectedConversation?.id === conv.id ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => loadConversationMessages(conv)}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">{conv.title || "Untitled conversation"}</CardTitle>
                      <div className="flex items-center gap-2 text-xs text-muted">
                        <Calendar className="size-3" />
                        <span>{formatDate(conv.created_at)}</span>
                        <Badge variant="secondary" className="text-xs">
                          {conv.message_count} messages
                        </Badge>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Message detail */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted">
              {selectedConversation ? "Conversation Detail" : "Select a conversation"}
            </h2>
            {isLoadingMessages ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/30" />
                ))}
              </div>
            ) : selectedConversation ? (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{selectedConversation.title || "Untitled conversation"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                            msg.role === "user"
                              ? "bg-primary text-foreground"
                              : "border border-border bg-muted-surface/50"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            {msg.role === "user" ? (
                              <User className="size-3" />
                            ) : (
                              <Bot className="size-3" />
                            )}
                            <span className="text-xs font-medium">
                              {msg.role === "user" ? "You" : "AI Assistant"}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <EmptyState
                icon={Search}
                title="No conversation selected"
                description="Click on a conversation from the list to view its messages."
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

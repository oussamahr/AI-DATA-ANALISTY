import { useState } from "react";
import { Bot, Loader2, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useDatasets } from "@/hooks/use-api";
import { api } from "@/services/api";
import { getErrorMessage } from "@/utils/cn";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  model?: string;
  provider?: string;
}

export function ChatPage() {
  const { data: datasetsData } = useDatasets(1, 100);
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState("");
  const [datasetId, setDatasetId] = useState<string>("none");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async () => {
    if (!prompt.trim() || loading) return;
    
    if (datasetId === "none") {
      setError("Please select a dataset to chat about");
      return;
    }
    
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: prompt.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setPrompt("");
    setLoading(true);
    setError(null);

    try {
      const response = await api.chatAboutDataset(
        datasetId,
        userMsg.content,
        conversationId || undefined
      );
      
      if (!conversationId) {
        setConversationId(response.conversation_id);
      }
      
      setMessages((prev) => [
        ...prev,
        {
          id: response.conversation_id,
          role: "assistant",
          content: response.response,
          model: response.model,
          provider: response.provider,
        },
      ]);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const clearConversation = () => {
    setMessages([]);
    setConversationId(null);
  };

  return (
    <div className="page-container flex h-[calc(100vh-4rem)] flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">AI Chat</h1>
          <p className="page-subtitle">Ask questions about your data in natural language</p>
        </div>
        {messages.length > 0 && (
          <Button variant="outline" size="sm" onClick={clearConversation}>
            New Conversation
          </Button>
        )}
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
                  <h3 className="mt-4 text-lg font-semibold text-foreground">How can I help?</h3>
                  <p className="mt-2 max-w-sm text-sm text-muted">
                    Select a dataset and ask about trends, anomalies, or insights in your data.
                  </p>
                  <div className="mt-4 grid grid-cols-1 gap-2">
                    <button
                      className="rounded-md bg-primary/10 px-3 py-1 text-sm text-primary hover:bg-primary/20"
                      onClick={() => datasetId && setPrompt("What are the top 5 values in " + datasetsData?.items?.find(d => d.id === datasetId)?.name + "?")}
                    >
                      What are the top values in this dataset?
                    </button>
                  </div>
                </div>
              )}

              <AnimatePresence>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        msg.role === "user"
                          ? "bg-primary text-white"
                          : "border border-border bg-muted-surface/50 text-foreground"
                      }`}
                    >
                      <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                      {(msg.model || msg.provider) && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {msg.model && <Badge variant="secondary">{msg.model}</Badge>}
                          {msg.provider && <Badge variant="outline">{msg.provider}</Badge>}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {loading && (
                <div className="flex items-center gap-2 text-sm text-muted">
                  <Loader2 className="size-4 animate-spin" />
                  AI is analyzing your data...
                </div>
              )}
            </div>

            <div className="border-t border-border p-4">
              {error && <p className="mb-2 text-sm text-danger">{error}</p>}
              <div className="flex gap-2">
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ask a question about your data..."
                  rows={2}
                  className="min-h-[60px] resize-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                />
                <Button 
                  size="icon" 
                  className="shrink-0 self-end" 
                  onClick={sendMessage} 
                  disabled={loading || !prompt.trim() || datasetId === "none"}
                  aria-label="Send message"
                >
                  <Send className="size-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="w-full shrink-0 lg:w-72">
          <CardHeader><CardTitle>Dataset Context</CardTitle></CardHeader>
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
                        <div className="font-medium">{ds.name}</div>
                        <div className="text-xs text-muted">
                          {ds.row_count} rows • {ds.column_count || 'N/A'} columns
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted">
              The AI will analyze your dataset and use its context to answer your questions.
            </p>
            {conversationId && (
              <div className="text-xs text-muted">
                <Badge variant="outline" className="text-xs">Active conversation</Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
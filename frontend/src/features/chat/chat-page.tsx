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
}

export function ChatPage() {
  const { data: datasetsData } = useDatasets(1, 100);
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState("");
  const [datasetId, setDatasetId] = useState<string>("none");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async () => {
    if (!prompt.trim() || loading) return;
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: prompt.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setPrompt("");
    setLoading(true);
    setError(null);

    try {
      const response = await api.llmQuery(userMsg.content, datasetId === "none" ? undefined : datasetId);
      setMessages((prev) => [
        ...prev,
        {
          id: response.id,
          role: "assistant",
          content: response.response,
          model: response.model,
        },
      ]);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container flex h-[calc(100vh-4rem)] flex-col gap-4">
      <div>
        <h1 className="page-title">AI Chat</h1>
        <p className="page-subtitle">Ask questions about your data in natural language</p>
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
                    Ask about trends, anomalies, or insights in your datasets.
                  </p>
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
                      {msg.model && (
                        <Badge variant="secondary" className="mt-2">{msg.model}</Badge>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {loading && (
                <div className="flex items-center gap-2 text-sm text-muted">
                  <Loader2 className="size-4 animate-spin" />
                  AI is thinking...
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
                <Button size="icon" className="shrink-0 self-end" onClick={sendMessage} disabled={loading || !prompt.trim()} aria-label="Send message">
                  <Send className="size-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="w-full shrink-0 lg:w-72">
          <CardHeader><CardTitle>Context</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Dataset (optional)</Label>
              <Select value={datasetId} onValueChange={setDatasetId}>
                <SelectTrigger><SelectValue placeholder="All datasets" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific dataset</SelectItem>
                  {(datasetsData?.items ?? []).map((ds) => (
                    <SelectItem key={ds.id} value={ds.id}>{ds.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted">
              Selecting a dataset gives the AI context about your specific data columns and values.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

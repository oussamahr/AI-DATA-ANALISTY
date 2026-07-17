import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Bot, User, Send, Loader2 } from "lucide-react";
import { useAskQuestion } from "../hooks";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function QueryConsole({ datasetId }: { datasetId?: string }) {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", role: "assistant", content: "Hello! I am your AI Data Analyst. Ask me anything about your datasets." }
  ]);
  
  const askQuestion = useAskQuestion();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || askQuestion.isPending) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: query };
    setMessages(prev => [...prev, userMsg]);
    setQuery("");

    try {
      const response = await askQuestion.mutateAsync({ 
        query: userMsg.content,
        dataset_id: datasetId 
      });
      
      const aiMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        role: "assistant", 
        content: response.answer || "I processed your request, but received an empty response."
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error: any) {
      const errorMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        role: "assistant", 
        content: "Sorry, I encountered an error communicating with the backend API: " + (error.response?.data?.detail || error.message)
      };
      setMessages(prev => [...prev, errorMsg]);
    }
  };

  return (
    <Card className="flex flex-col h-[500px]">
      <CardContent className="flex-1 overflow-auto p-4 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-accent"}`}>
              {msg.role === "user" ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div className={`rounded-lg p-3 max-w-[80%] ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              <p className="text-sm">{msg.content}</p>
            </div>
          </div>
        ))}
        {askQuestion.isPending && (
          <div className="flex gap-3">
            <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center shrink-0">
              <Bot size={16} />
            </div>
            <div className="rounded-lg p-3 bg-muted flex items-center">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
      </CardContent>
      <div className="p-4 border-t">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input 
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Ask a question about your data..." 
            disabled={askQuestion.isPending}
            className="flex-1"
          />
          <Button type="submit" disabled={askQuestion.isPending || !query.trim()}>
            <Send className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </div>
    </Card>
  );
}
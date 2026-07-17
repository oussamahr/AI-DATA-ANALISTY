"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Send,
  Bot,
  User,
  Database,
  ChevronDown,
  Copy,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Lightbulb,
  BarChart3,
  TrendingUp,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

const suggestedPrompts = [
  { text: "What are the top 5 revenue drivers?", icon: TrendingUp },
  { text: "Show me customer churn patterns", icon: BarChart3 },
  { text: "Predict next quarter's sales", icon: Sparkles },
  { text: "Identify anomalies in the data", icon: Lightbulb },
];

export default function LLMPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (prompt?: string) => {
    const text = prompt || input;
    if (!text.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text.trim(),
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: getSimulatedResponse(text),
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setLoading(false);
    }, 1500);
  };

  const getSimulatedResponse = (prompt: string): string => {
    if (prompt.toLowerCase().includes("revenue") || prompt.toLowerCase().includes("sales")) {
      return `Based on the analysis of your sales data, here are the top 5 revenue drivers:\n\n1. **Enterprise subscriptions** - $2.4M (34% of total revenue)\n2. **Product Category A** - $1.8M (25% growth YoY)\n3. **APAC Region** - $1.2M (fastest growing at 42%)\n4. **Renewals** - $980K (92% retention rate)\n5. **Upsells** - $640K (highest margin at 78%)\n\nKey insight: Enterprise subscriptions show the strongest correlation with customer lifetime value (r=0.89). Consider focusing expansion efforts in the APAC region where growth momentum is strongest.`;
    }
    return `I've analyzed your query and here are my findings:\n\nThe data shows several interesting patterns:\n\n• There's a **15% increase** in the metric you're interested in over the last quarter\n• The trend correlates with seasonal patterns observed in previous years\n• Statistical significance: **p < 0.01** (99% confidence)\n\nWould you like me to:\n1. Generate a visualization of these trends?\n2. Run a deeper diagnostic analysis?\n3. Create a predictive model for future projections?`;
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col h-[calc(100vh-4rem)]">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">AI Assistant</h1>
        <p className="text-white/50">Ask questions about your data in natural language</p>
      </div>

      {/* Dataset selector */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
          <Database className="w-4 h-4 text-white/40" />
          <span className="text-white/60 text-sm">Context:</span>
          <select className="bg-transparent text-white text-sm focus:outline-none appearance-none pr-6">
            <option value="" className="bg-gray-900">All datasets</option>
            <option value="1" className="bg-gray-900">sales_q4_2024.csv</option>
            <option value="2" className="bg-gray-900">customer_segments.json</option>
          </select>
          <ChevronDown className="w-3 h-3 text-white/30 -ml-4" />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto mb-6 space-y-4 min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center mb-6">
              <Sparkles className="w-8 h-8 text-violet-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Ask anything about your data</h2>
            <p className="text-white/40 text-sm max-w-md mb-8">
              Use natural language to query, analyze, and visualize your datasets. The AI understands context and can perform complex analyses.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full">
              {suggestedPrompts.map((prompt) => {
                const Icon = prompt.icon;
                return (
                  <button
                    key={prompt.text}
                    onClick={() => handleSend(prompt.text)}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/5 hover:bg-white/6 hover:border-white/10 transition-all text-left group"
                  >
                    <Icon className="w-4 h-4 text-white/30 group-hover:text-violet-400 transition-colors shrink-0" />
                    <span className="text-white/50 text-sm group-hover:text-white/70 transition-colors">{prompt.text}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-violet-400" />
                </div>
              )}
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-gradient-to-r from-violet-600 to-cyan-600 text-white"
                    : "bg-white/5 border border-white/5 text-white/80"
                }`}
              >
                <div className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</div>
                {msg.role === "assistant" && (
                  <div className="flex items-center gap-2 mt-3 pt-2 border-t border-white/5">
                    <button className="p-1.5 rounded-lg text-white/20 hover:text-white/50 hover:bg-white/5 transition-all" title="Copy">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button className="p-1.5 rounded-lg text-white/20 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all" title="Good response">
                      <ThumbsUp className="w-3.5 h-3.5" />
                    </button>
                    <button className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Bad response">
                      <ThumbsDown className="w-3.5 h-3.5" />
                    </button>
                    <button className="p-1.5 rounded-lg text-white/20 hover:text-white/50 hover:bg-white/5 transition-all" title="Regenerate">
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-white/15 text-xs ml-auto">{msg.timestamp}</span>
                  </div>
                )}
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shrink-0 mt-1">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          ))
        )}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-violet-400" />
            </div>
            <div className="bg-white/5 border border-white/5 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                  <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" style={{ animationDelay: "0.2s" }} />
                  <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" style={{ animationDelay: "0.4s" }} />
                </div>
                <span className="text-white/30 text-sm">Analyzing...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="glass-card p-4">
        <div className="flex items-end gap-3">
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask a question about your data..."
              rows={1}
              className="w-full resize-none px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50 transition-all"
              style={{ minHeight: "44px", maxHeight: "120px" }}
            />
          </div>
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="p-3 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 text-white hover:from-violet-500 hover:to-cyan-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

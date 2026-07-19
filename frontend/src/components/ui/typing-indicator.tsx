"use client";

import { motion } from "framer-motion";
import { Bot } from "lucide-react";

interface TypingIndicatorProps {
  className?: string;
}

export function TypingIndicator({ className = "" }: TypingIndicatorProps) {
  return (
    <div className={`flex items-center gap-2 text-sm text-muted ${className}`}>
      <div className="flex size-8 items-center justify-center rounded-xl bg-accent/30">
        <Bot className="size-4 text-primary" />
      </div>
      <div className="flex gap-1">
        <motion.span
          className="size-2 rounded-full bg-primary/60"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
        />
        <motion.span
          className="size-2 rounded-full bg-primary/60"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
        />
        <motion.span
          className="size-2 rounded-full bg-primary/60"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
        />
      </div>
      <span className="ml-1 text-xs">AI is thinking...</span>
    </div>
  );
}

export function StreamingMessage({ 
  content, 
  className = "",
  isStreaming = false 
}: { 
  content: string; 
  className?: string;
  isStreaming?: boolean;
}) {
  return (
    <div className={className}>
      <div className="whitespace-pre-wrap text-sm">
        {content}
        {isStreaming && (
          <motion.span
            className="inline-block align-bottom text-primary animate-pulse"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          >
            ▋
          </motion.span>
        )}
      </div>
    </div>
  );
}
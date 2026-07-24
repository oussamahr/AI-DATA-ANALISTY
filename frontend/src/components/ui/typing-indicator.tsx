"use client";

import { Bot } from "lucide-react";
import { motion } from "framer-motion";

/**
 * Rounded “thinking” bubble shown briefly before the first token arrives.
 * Contains a small avatar, three animated dots, and “AI is thinking...” text.
 */
export function ThinkingBubble() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted-surface/50 px-4 py-3 shadow-sm">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Bot className="size-4 text-primary" aria-hidden="true" />
      </div>
      <div className="flex items-center gap-1.5" aria-label="AI is thinking">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-2 w-2 rounded-full bg-muted-foreground"
            animate={{ opacity: [0.35, 1, 0.35] }}
            transition={{
              duration: 1.0,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
      <span className="text-xs font-medium text-muted-foreground">AI is thinking...</span>
    </div>
  );
}

/**
 * Blinking text caret (`|`) rendered inline at the end of streamed content.
 */
export function StreamingCursor({ className = "" }: { className?: string }) {
  return (
    <motion.span
      className={`inline-block w-[2px] h-[1.1em] bg-foreground ml-0.5 align-text-bottom ${className}`}
      animate={{ opacity: [1, 0, 1] }}
      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
      aria-hidden="true"
    />
  );
}

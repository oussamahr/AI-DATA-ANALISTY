"use client";

import { motion } from "framer-motion";

/**
 * Blinking text caret (`|`) rendered inline at the end of streamed content.
 * Also shown on its own while waiting for the first token to arrive —
 * without any surrounding bubble, frame, or background.
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

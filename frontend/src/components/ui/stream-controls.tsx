/**
 * StreamControls — small UI atoms used by the chat page.
 *
 *  - StopButton: cancels the active stream and stops auto-scroll.
 *  - ScrollToBottomButton: appears when the user has scrolled up.
 *
 * Both rely on the chat store and the scroll hook for their state, so
 * they do not introduce additional re-renders on the chat tree.
 */
"use client";

import { ArrowDown, Square } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { useChatStream } from "@/hooks/use-chat-stream";
import { useChatStore } from "@/store/chat";

export function StopButton() {
  const status = useChatStore((s) => s.status);
  const { cancel } = useChatStream();
  if (status !== "streaming" && status !== "connecting") return null;
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={cancel}
      className="gap-2 rounded-full"
      aria-label="Stop generating"
    >
      <Square size={12} className="fill-current" />
      <span>Stop</span>
    </Button>
  );
}

export function ScrollToBottomButton({
  onClick,
  visible,
}: {
  onClick: () => void;
  visible: boolean;
}) {
  return (
    <AnimatePresence>
      {visible ? (
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          onClick={onClick}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground shadow-card hover:bg-muted-surface"
          aria-label="Scroll to latest message"
        >
          <ArrowDown size={14} />
          <span>Jump to latest</span>
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}

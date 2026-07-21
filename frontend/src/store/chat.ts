/**
 * Chat store with token-batched streaming.
 *
 * Why a custom store instead of plain `useState`?
 * ------------------------------------------------
 * - The chat page is a heavy tree. We must NOT cause the whole tree to
 *   re-render on every token. So we keep messages in a Zustand store and
 *   subscribe with selectors.
 * - We want to batch token arrivals into one React render per animation
 *   frame. A bare Zustand `setState` per token would still cause many
 *   renders under high token throughput.
 * - The "currently streaming" message has a token buffer stored as a
 *   module-level mutable string. We flush it into Zustand on each rAF.
 *   This decouples network rate from render rate.
 */
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

import type { StreamHandle } from "@/services/stream";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  /** True while the assistant is still producing tokens for this message. */
  isStreaming?: boolean;
  /** Set when the user pressed "Stop" or the stream errored. */
  cancelled?: boolean;
  error?: string;
  model?: string;
  provider?: string;
  createdAt: number;
}

export type ConnectionStatus = "idle" | "connecting" | "streaming" | "cancelled" | "error";

interface ChatState {
  messages: ChatMessage[];
  conversationId: string | null;
  status: ConnectionStatus;
  errorMessage: string | null;
}

interface ChatActions {
  /** Add a new message (e.g. user input). */
  addMessage: (msg: ChatMessage) => void;
  /** Mark the assistant placeholder as the streaming target. */
  beginStreaming: (messageId: string) => void;
  /**
   * Append tokens to the *current* streaming message. Tokens are buffered
   * and flushed to React at most once per animation frame.
   */
  appendTokens: (messageId: string, tokens: string) => void;
  /**
   * Finalize the streaming message. Sets `isStreaming = false`, records
   * `done: true` metadata, and clears the per-frame buffer.
   */
  finishStreaming: (
    messageId: string,
    meta: { model?: string; provider?: string; cancelled?: boolean; error?: string }
  ) => void;
  /** Set the active conversation id from the server. */
  setConversationId: (id: string | null) => void;
  /** Set a top-level error (e.g. network failure before any token). */
  setError: (msg: string | null) => void;
  /** Mark the overall stream as cancelled. */
  markCancelled: () => void;
  /** Reset the entire chat (new conversation). */
  reset: () => void;
  /** Remove a single message by id (e.g. failed placeholder). */
  removeMessage: (id: string) => void;
}

type ChatStore = ChatState & ChatActions;

const initialState: ChatState = {
  messages: [],
  conversationId: null,
  status: "idle",
  errorMessage: null,
};

// ---------------------------------------------------------------------------
// Per-frame token buffer
// ---------------------------------------------------------------------------
//
// We keep a module-level `Map<messageId, { pending: string; scheduled: boolean }>`
// so we can append tokens at the network rate but only commit to the
// store once per animation frame. The `scheduled` flag ensures we schedule
// at most one rAF per message per frame.

const pending = new Map<string, { text: string; scheduled: boolean }>();

function schedule(messageId: string): void {
  const entry = pending.get(messageId);
  if (!entry || entry.scheduled) return;
  entry.scheduled = true;
  // requestAnimationFrame gives us vsync-aligned commits which is exactly
  // the 60 FPS target. We also schedule a fallback setTimeout so commits
  // still happen if the tab is backgrounded (rAF is throttled to 1Hz then).
  const commit = () => {
    const current = pending.get(messageId);
    if (!current) return;
    pending.delete(messageId);
    const text = current.text;
    // Direct store mutation, bypassing React entirely for the buffer drain.
    useChatStore.setState((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, content: m.content + text } : m
      ),
    }));
  };
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(commit);
  } else {
    setTimeout(commit, 16);
  }
}

// ---------------------------------------------------------------------------
// Active stream handle (so we can cancel from outside the store)
// ---------------------------------------------------------------------------

let activeStream: StreamHandle | null = null;

export function getActiveStream(): StreamHandle | null {
  return activeStream;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useChatStore = create<ChatStore>()(
  subscribeWithSelector((set) => ({
    ...initialState,

    addMessage: (msg) =>
      set((state) => ({ messages: [...state.messages, msg] })),

    removeMessage: (id) =>
      set((state) => ({ messages: state.messages.filter((m) => m.id !== id) })),

    beginStreaming: (messageId) => {
      pending.delete(messageId);
      set((state) => ({
        status: "streaming",
        errorMessage: null,
        messages: state.messages.map((m) =>
          m.id === messageId ? { ...m, isStreaming: true, content: "" } : m
        ),
      }));
    },

    appendTokens: (messageId, tokens) => {
      if (!tokens) return;
      const existing = pending.get(messageId);
      if (existing) {
        existing.text += tokens;
      } else {
        pending.set(messageId, { text: tokens, scheduled: false });
      }
      schedule(messageId);
    },

    finishStreaming: (messageId, meta) => {
      // Flush any pending tokens first so the final text is included.
      const entry = pending.get(messageId);
      if (entry) {
        pending.delete(messageId);
        // Apply synchronously on finish.
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === messageId ? { ...m, content: m.content + entry.text } : m
          ),
        }));
      }
      set((state) => ({
        status: meta.cancelled ? "cancelled" : meta.error ? "error" : "idle",
        errorMessage: meta.error ?? null,
        messages: state.messages.map((m) =>
          m.id === messageId
            ? {
                ...m,
                isStreaming: false,
                cancelled: meta.cancelled,
                error: meta.error,
                model: meta.model ?? m.model,
                provider: meta.provider ?? m.provider,
              }
            : m
        ),
      }));
      activeStream = null;
    },

    setConversationId: (id) => set({ conversationId: id }),

    setError: (msg) => set({ errorMessage: msg, status: msg ? "error" : "idle" }),

    markCancelled: () => {
      activeStream?.cancel();
      activeStream = null;
      // Mark the currently streaming message as cancelled and stop.
      set((state) => {
        const target = [...state.messages].reverse().find((m) => m.isStreaming);
        if (!target) {
          return { status: "cancelled" };
        }
        return {
          status: "cancelled",
          messages: state.messages.map((m) =>
            m.id === target.id ? { ...m, isStreaming: false, cancelled: true } : m
          ),
        };
      });
    },

    reset: () => {
      activeStream?.cancel();
      activeStream = null;
      pending.clear();
      set({ ...initialState });
    },
  }))
);

/** Test-only: register the active stream so we can cancel from elsewhere. */
export function _setActiveStream(handle: StreamHandle | null): void {
  activeStream = handle;
}

export const isStreamingSelector = (s: ChatStore) => s.status === "streaming";
export const messagesSelector = (s: ChatStore) => s.messages;
export const lastMessageSelector = (s: ChatStore) => s.messages[s.messages.length - 1];

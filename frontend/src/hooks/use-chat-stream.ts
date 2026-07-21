/**
 * useChatStream — single source of truth for an active chat stream.
 *
 * Responsibilities:
 *  - Send the user message and open a stream.
 *  - Push the assistant placeholder into the store immediately.
 *  - Drain tokens into the per-frame buffer.
 *  - Capture the conversation id, model, and provider from the first
 *    metadata event.
 *  - Cancel cleanly on user request or component unmount.
 *  - Surface network errors to the store so the UI can show a banner.
 *
 * Why a hook (not a service)?
 *  - Hooks get to use refs and effects, which we need for cleanup-on-
 *    unmount and for the cancellation ref.
 *  - The actual token appends are dispatched via the store so other
 *    components can observe them.
 */
import { useCallback, useEffect, useRef } from "react";

import { api } from "@/services/api";
import {
  _setActiveStream,
  useChatStore,
  type ChatMessage,
} from "@/store/chat";

export interface SendMessageArgs {
  datasetId: string;
  content: string;
  conversationId?: string | null;
}

export function useChatStream() {
  // We keep an internal `inFlight` ref so the same hook instance cannot
  // start two streams at once. The store's `status` is the public view.
  const inFlightRef = useRef(false);

  const beginStream = useCallback(async (args: SendMessageArgs) => {
    const { datasetId, content, conversationId } = args;
    const store = useChatStore.getState();
    if (store.status === "streaming" || store.status === "connecting") return;
    if (!content.trim()) return;
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    // 1. Append the user message to the store.
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: content.trim(),
      createdAt: Date.now(),
    };
    store.addMessage(userMsg);

    // 2. Append an empty assistant placeholder, then mark it as the
    //    streaming target. We do *not* `setIsStreaming(true)` here yet
    //    because we want the placeholder to exist in the array from
    //    the very first frame.
    const assistantId = crypto.randomUUID();
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      isStreaming: true,
      createdAt: Date.now(),
    };
    store.addMessage(assistantMsg);
    store.beginStreaming(assistantId);

    // 3. Open the stream.
    let handle: ReturnType<typeof api.streamChatAboutDataset> | null = null;
    try {
      handle = api.streamChatAboutDataset(
        datasetId,
        content.trim(),
        conversationId ?? store.conversationId ?? undefined
      );
      _setActiveStream(handle);

      // 4. Drain events.
      for await (const ev of handle.events) {
        // Backend-reported errors short-circuit the loop.
        if (ev.type === "error") {
          useChatStore.getState().finishStreaming(assistantId, {
            error: ev.error ?? "Stream error",
          });
          return;
        }
        if (ev.conversationId && !useChatStore.getState().conversationId) {
          useChatStore.getState().setConversationId(ev.conversationId);
        }
        if (ev.content) {
          useChatStore.getState().appendTokens(assistantId, ev.content);
        }
        if (ev.done || ev.type === "done") {
          break;
        }
      }

      // 5. Clean finish.
      useChatStore.getState().finishStreaming(assistantId, {});
    } catch (err) {
      const error = err instanceof Error ? err.message : "Stream failed";
      useChatStore.getState().finishStreaming(assistantId, { error });
    } finally {
      inFlightRef.current = false;
      _setActiveStream(null);
    }
  }, []);

  /**
   * Cancel the currently-streaming assistant message. Safe to call even
   * if no stream is active.
   */
  const cancel = useCallback(() => {
    useChatStore.getState().markCancelled();
    inFlightRef.current = false;
  }, []);

  // Cleanup on unmount — never leave a stream dangling.
  useEffect(() => {
    return () => {
      useChatStore.getState().markCancelled();
      inFlightRef.current = false;
    };
  }, []);

  return { beginStream, cancel, status: useChatStore((s) => s.status) };
}

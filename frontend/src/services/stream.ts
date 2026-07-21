/**
 * Streaming transport for Server-Sent Events (SSE) and chunked HTTP responses.
 *
 * Why a custom transport?
 * -----------------------
 * 1. The browser's `fetch` returns a `ReadableStream<Uint8Array>`. We want to
 *    expose an *async iterable* of typed `StreamEvent`s so consumers can use
 *    `for await (const ev of stream)` regardless of transport.
 * 2. We need robust cancellation. `AbortController` aborts both the in-flight
 *    `fetch` and the stream reader, and we expose a single `cancel()` method
 *    on the iterable handle.
 * 3. SSE frames are delimited by blank lines and start with `data: `. Chunked
 *    JSON (NDJSON) is delimited by `\n`. We normalize both into one event
 *    stream so the chat UI never has to think about it.
 *
 * The transport is intentionally transport-agnostic. If we later swap SSE
 * for WebSockets we only need to rewrite `connect()`; the `AsyncIterable`
 * contract stays identical.
 */

export type StreamEventType = "content" | "done" | "error" | "open" | "metadata";

/**
 * One chunk of LLM output. We keep this small and flat so React state updates
 * are cheap to compare.
 */
export interface StreamEvent {
  type: StreamEventType;
  /** Text delta from the model. Empty for non-content events. */
  content: string;
  /** True only for the final frame. */
  done: boolean;
  /** Backend-provided conversation id, set on the first event. */
  conversationId?: string;
  /** Model name reported by the gateway. */
  model?: string;
  /** Provider name reported by the gateway. */
  provider?: string;
  /** Error message for `type === "error"`. */
  error?: string;
}

export interface StreamHandle {
  /** Async-iterable of events. Throws on network failure. */
  events: AsyncIterableIterator<StreamEvent>;
  /** Cancel the in-flight request. Safe to call multiple times. */
  cancel: () => void;
  /** True after `cancel()` has been called. */
  readonly cancelled: boolean;
}

export interface StreamOptions {
  url: string;
  method?: "POST" | "GET";
  headers?: Record<string, string>;
  body?: unknown;
  /** Per-chunk read timeout in ms. Default 120s. */
  chunkTimeoutMs?: number;
  /** Total stream timeout in ms. Default 0 (no timeout). */
  totalTimeoutMs?: number;
  credentials?: RequestCredentials;
  /** Called once the HTTP response is received. */
  onOpen?: () => void;
}

const DEFAULT_CHUNK_TIMEOUT = 120_000;

/**
 * Open a streaming HTTP connection and return an async iterable handle.
 *
 * Implementation notes:
 * - We `TextDecoder` with `stream: true` so multi-byte UTF-8 sequences that
 *   straddle chunk boundaries decode correctly.
 * - We keep a small buffer between reads so SSE `data:` lines that arrive
 *   in two TCP packets are not lost.
 * - The async iterator's `return()` method calls `cancel()`, which both
 *   aborts the fetch and releases the reader lock.
 */
export function openStream(options: StreamOptions): StreamHandle {
  const {
    url,
    method = "POST",
    headers = {},
    body,
    chunkTimeoutMs = DEFAULT_CHUNK_TIMEOUT,
    totalTimeoutMs = 0,
    credentials = "include",
    onOpen,
  } = options;

  const controller = new AbortController();
  let cancelled = false;
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

  const cancel = (): void => {
    if (cancelled) return;
    cancelled = true;
    try {
      controller.abort();
    } catch {
      /* noop */
    }
    // Release the reader lock if we still hold it. This is required so the
    // underlying stream can be closed by the platform.
    if (reader) {
      try {
        reader.releaseLock();
      } catch {
        /* noop */
      }
    }
  };

  const events: AsyncIterableIterator<StreamEvent> = (async function* (): AsyncGenerator<StreamEvent, void, undefined> {
    const totalTimer =
      totalTimeoutMs > 0
        ? setTimeout(() => controller.abort(new Error("Stream timed out")), totalTimeoutMs)
        : null;

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          ...headers,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        credentials,
        signal: controller.signal,
      });
    } catch (err) {
      if (totalTimer) clearTimeout(totalTimer);
      if (cancelled) return;
      const e = err as DOMException;
      if (e?.name === "AbortError") {
        yield { type: "error", content: "", done: true, error: "Request was cancelled" };
        return;
      }
      yield {
        type: "error",
        content: "",
        done: true,
        error: "Network error: " + ((e?.message ?? String(err)) || "fetch failed"),
      };
      return;
    }

    if (totalTimer) clearTimeout(totalTimer);
    onOpen?.();

    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try {
        const data = await response.json();
        if (typeof data?.detail === "string") detail = data.detail;
        else if (Array.isArray(data?.detail)) detail = data.detail.map((d: { msg: string }) => d.msg).join(", ");
      } catch {
        /* ignore */
      }
      yield { type: "error", content: "", done: true, error: detail };
      return;
    }

    if (!response.body) {
      yield { type: "error", content: "", done: true, error: "Empty response body" };
      return;
    }

    reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let sawDone = false;

    // Parses one or more complete SSE-style events from `buffer`.
    // Each event is "lines\n\n". We treat any line starting with "data:" as
    // payload and ignore comment lines (":") and other SSE fields.
    const flushSse = function* (): Generator<StreamEvent> {
      const eventsRaw = buffer.split("\n\n");
      buffer = eventsRaw.pop() ?? "";
      for (const raw of eventsRaw) {
        const dataLines: string[] = [];
        for (const line of raw.split("\n")) {
          if (line.startsWith("data:")) {
            dataLines.push(line.slice(5).trimStart());
          }
        }
        if (dataLines.length === 0) continue;
        const payload = dataLines.join("\n");
        if (payload === "[DONE]") {
          sawDone = true;
          yield { type: "done", content: "", done: true };
          return;
        }
        // The backend may send plain text (no JSON) on a single line.
        if (!payload.startsWith("{") && !payload.startsWith("[")) {
          yield { type: "content", content: payload, done: false };
          continue;
        }
        try {
          const parsed = JSON.parse(payload);
          if (parsed && typeof parsed === "object") {
            if (parsed.error) {
              yield { type: "error", content: "", done: true, error: String(parsed.error) };
              return;
            }
            yield {
              type: parsed.content ? "content" : "metadata",
              content: typeof parsed.content === "string" ? parsed.content : "",
              done: Boolean(parsed.done),
              conversationId: parsed.conversation_id,
              model: parsed.model,
              provider: parsed.provider,
            };
            if (parsed.done) {
              sawDone = true;
            }
            return;
          }
        } catch {
          // Not JSON, treat as raw content.
          yield { type: "content", content: payload, done: false };
        }
      }
    };

    // NDJSON fallback: server may stream raw JSON objects newline-delimited.
    const flushNdjson = function* (): Generator<StreamEvent> {
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (trimmed === "[DONE]") {
          sawDone = true;
          yield { type: "done", content: "", done: true };
          return;
        }
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed?.error) {
            yield { type: "error", content: "", done: true, error: String(parsed.error) };
            return;
          }
          yield {
            type: parsed.content ? "content" : "metadata",
            content: typeof parsed.content === "string" ? parsed.content : "",
            done: Boolean(parsed.done),
            conversationId: parsed.conversation_id,
            model: parsed.model,
            provider: parsed.provider,
          };
          if (parsed.done) sawDone = true;
        } catch {
          yield { type: "content", content: trimmed, done: false };
        }
      }
    };

    // Heuristic: the backend sets `text/event-stream`; otherwise we still try
    // SSE first because that's the most common streaming format for LLMs.
    const isSse = (response.headers.get("content-type") ?? "").includes("event-stream");

    try {
      while (!cancelled) {
        // Race the read against a per-chunk timeout so a stalled server
        // doesn't hang the UI forever.
        const readPromise = reader.read();
        const timer = setTimeout(() => controller.abort(new Error("Stream chunk timed out")), chunkTimeoutMs);
        let result: ReadableStreamReadResult<Uint8Array>;
        try {
          result = await readPromise;
        } finally {
          clearTimeout(timer);
        }
        if (result.done) break;
        buffer += decoder.decode(result.value, { stream: true });

        if (isSse) {
          for (const ev of flushSse()) {
            if (ev.type === "error") {
              yield ev;
              return;
            }
            yield ev;
            if (ev.type === "done" || ev.done) {
              sawDone = true;
              return;
            }
          }
        } else {
          for (const ev of flushNdjson()) {
            if (ev.type === "error") {
              yield ev;
              return;
            }
            yield ev;
            if (ev.type === "done" || ev.done) {
              sawDone = true;
              return;
            }
          }
        }
      }
    } catch (err) {
      if (cancelled) return;
      const e = err as Error;
      if (e?.name === "AbortError" || controller.signal.aborted) {
        yield { type: "error", content: "", done: true, error: "Request was cancelled" };
        return;
      }
      yield { type: "error", content: "", done: true, error: e?.message ?? "Stream error" };
      return;
    } finally {
      try {
        reader.releaseLock();
      } catch {
        /* noop */
      }
    }

    if (!sawDone && !cancelled) {
      // Stream closed cleanly without a [DONE] — synthesize one so consumers
      // always see a final frame.
      yield { type: "done", content: "", done: true };
    }
  })();

  // Wrap the iterator so consumer-side `break` cancels the request.
  const handle: AsyncIterableIterator<StreamEvent> = {
    next(): Promise<IteratorResult<StreamEvent>> {
      return events.next();
    },
    return(value): Promise<IteratorResult<StreamEvent>> {
      cancel();
      return events.return
        ? events.return(value as StreamEvent)
        : Promise.resolve({ value: value as StreamEvent, done: true });
    },
    throw(err): Promise<IteratorResult<StreamEvent>> {
      cancel();
      return events.throw
        ? events.throw(err)
        : Promise.reject(err);
    },
    [Symbol.asyncIterator]() {
      return handle;
    },
  };

  return { events: handle, cancel, get cancelled() { return cancelled; } };
}

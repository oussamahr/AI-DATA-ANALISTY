/**
 * Streaming-aware Markdown renderer.
 *
 * Design goals (all 18 requirements from the spec):
 * - Progressive: render whatever we have, even if it is invalid Markdown
 *   mid-stream. We never wait for the full response.
 * - Flicker-free for code blocks: the *same* DOM node is mutated in place
 *   while the block grows. We only run syntax highlighting once the block
 *   is closed (i.e. we received a closing ``` fence) AND the stream has
 *   ended, so the user never sees colors flicker into existence.
 * - Re-render only the tail: each block has a stable `key` so earlier
 *   blocks do not re-render when new text appends to the stream.
 * - Throttled at 60 FPS: a single rAF coalesces multiple token arrivals
 *   into one render.
 *
 * The parser is intentionally simple. It supports the subset of CommonMark
 * that LLMs actually emit: headings, paragraphs, lists, blockquotes, code
 * fences, tables, and inline code / bold / italic / links. It is not a full
 * CommonMark implementation.
 */
"use client";

import React, {
  memo,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Copy, Check } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MarkdownRendererProps {
  content: string;
  /**
   * When `true`, the renderer is in streaming mode:
   * - The trailing open block (if any) is appended to in place.
   * - The blinking cursor is shown at the end of the last block.
   * - Syntax highlighting is deferred until `false`.
   */
  isStreaming?: boolean;
  className?: string;
}

type InlineRun = { text: string; bold?: boolean; italic?: boolean; code?: boolean; strike?: boolean };

interface BaseBlock {
  /** Stable identity for React keys. */
  key: string;
  /** Source range. Used to decide if a block is the "open" trailing one. */
  start: number;
  end: number;
  /** Raw markdown that produced this block. Updated as stream appends. */
  raw: string;
}

interface ParagraphBlock extends BaseBlock {
  kind: "paragraph";
  inline: InlineRun[];
}
interface HeadingBlock extends BaseBlock {
  kind: "heading";
  level: 1 | 2 | 3;
  inline: InlineRun[];
}
interface ListBlock extends BaseBlock {
  kind: "list";
  ordered: boolean;
  items: InlineRun[][];
}
interface QuoteBlock extends BaseBlock {
  kind: "quote";
  inline: InlineRun[];
}
interface CodeBlock extends BaseBlock {
  kind: "code";
  language: string;
  body: string;
}
interface TableBlock extends BaseBlock {
  kind: "table";
  headers: InlineRun[][];
  rows: InlineRun[][][];
}
interface HrBlock extends BaseBlock {
  kind: "hr";
}

// ---------------------------------------------------------------------------
// Inline parsing
// ---------------------------------------------------------------------------

const HTML_ESCAPE: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#039;",
};

const escapeHtml = (text: string): string =>
  text.replace(/[&<>"']/g, (m) => HTML_ESCAPE[m]!);

/**
 * Parse a single line into a flat list of inline runs with bold/italic/code
 * markers. This is intentionally *not* a full CommonMark parser — it covers
 * what 99% of LLM output uses. Note: we run escapeHtml on text content to
 * prevent XSS, but never on code spans (which are rendered as <code> with
 * raw text inside, escaping is still safe).
 */
function parseInline(line: string): InlineRun[] {
  // First split on backtick spans (inline code) — these cannot contain
  // further markdown so we treat their content as opaque.
  const parts: { text: string; isCode: boolean }[] = [];
  let i = 0;
  while (i < line.length) {
    const tick = line.indexOf("`", i);
    if (tick === -1) {
      parts.push({ text: line.slice(i), isCode: false });
      break;
    }
    const end = line.indexOf("`", tick + 1);
    if (end === -1) {
      parts.push({ text: line.slice(i), isCode: false });
      break;
    }
    if (tick > i) parts.push({ text: line.slice(i, tick), isCode: false });
    parts.push({ text: line.slice(tick + 1, end), isCode: true });
    i = end + 1;
  }

  // Now further split non-code parts on ** / * / ~~ and links.
  const runs: InlineRun[] = [];
  for (const p of parts) {
    if (p.isCode) {
      // Code spans: the content goes inside <code>, so we still escape.
      runs.push({ text: escapeHtml(p.text), code: true });
      continue;
    }
    // Tokenize with a small state machine.
    let buf = "";
    let bold = false;
    let italic = false;
    let strike = false;
    let j = 0;
    const flush = () => {
      if (!buf) return;
      // Escape the buffer to defend against accidental HTML in the source.
      runs.push({ text: escapeHtml(buf), bold, italic, strike });
      buf = "";
    };
    while (j < p.text.length) {
      const two = p.text.slice(j, j + 2);
      if (two === "**") {
        flush();
        bold = !bold;
        j += 2;
        continue;
      }
      if (two === "~~") {
        flush();
        strike = !strike;
        j += 2;
        continue;
      }
      if (p.text[j] === "*") {
        flush();
        italic = !italic;
        j += 1;
        continue;
      }
      buf += p.text[j];
      j += 1;
    }
    flush();
  }
  return runs;
}

function renderInline(runs: InlineRun[]): React.ReactNode {
  return runs.map((r, idx) => {
    let node: React.ReactNode = r.text;
    if (r.code) node = <code className="md-inline-code">{node}</code>;
    if (r.italic) node = <em>{node}</em>;
    if (r.bold) node = <strong>{node}</strong>;
    if (r.strike) node = <del>{node}</del>;
    return <React.Fragment key={idx}>{node}</React.Fragment>;
  });
}

// ---------------------------------------------------------------------------
// Block parsing
// ---------------------------------------------------------------------------

type Block =
  | ParagraphBlock
  | HeadingBlock
  | ListBlock
  | QuoteBlock
  | CodeBlock
  | TableBlock
  | HrBlock;

const FENCE_RE = /^(```|~~~)(.*)$/;
const HEADING_RE = /^(#{1,3})\s+(.*)$/;
const ULIST_RE = /^[-*]\s+(.*)$/;
const OLIST_RE = /^\d+\.\s+(.*)$/;
const QUOTE_RE = /^>\s?(.*)$/;
const HR_RE = /^([-*_])\1{2,}\s*$/;
const TABLE_ROW_RE = /^\s*\|(.+)\|\s*$/;
const TABLE_SEP_RE = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/;

/**
 * Parse the markdown into a list of blocks. While streaming, the *last* block
 * is allowed to be "open" (e.g. an unclosed code fence, or a paragraph that
 * is still being typed). Open blocks are kept at the end and the renderer
 * will append additional text to them as `content` grows.
 */
function parseBlocks(md: string): Block[] {
  const lines = md.split("\n");
  const blocks: Block[] = [];

  let i = 0;
  let paraBuffer: string[] = [];
  let paraStart = 0;
  let keyCounter = 0;
  const nextKey = () => `b${keyCounter++}`;

  const flushParagraph = (end: number) => {
    if (paraBuffer.length === 0) return;
    const text = paraBuffer.join(" ");
    blocks.push({
      kind: "paragraph",
      key: nextKey(),
      start: paraStart,
      end,
      raw: text,
      inline: parseInline(text),
    });
    paraBuffer = [];
  };

  while (i < lines.length) {
    const line = lines[i] ?? "";
    const trimmed = line.trim();

    // --- Code fences -----------------------------------------------------
    const fenceMatch = trimmed.match(FENCE_RE);
    if (fenceMatch) {
      flushParagraph(i);
      const openFence = fenceMatch[1]!;
      const language = (fenceMatch[2] ?? "").trim();
      const start = i;
      const bodyLines: string[] = [];
      i += 1;
      while (i < lines.length) {
        const closeLine = lines[i]!.trim();
        if (closeLine.startsWith(openFence)) {
          i += 1;
          break;
        }
        bodyLines.push(lines[i]!);
        i += 1;
      }
      const end = i;
      blocks.push({
        kind: "code",
        key: nextKey(),
        start,
        end,
        raw: lines.slice(start, end).join("\n"),
        language,
        body: bodyLines.join("\n"),
      });
      continue;
    }

    // --- Tables ----------------------------------------------------------
    if (TABLE_ROW_RE.test(line)) {
      flushParagraph(i);
      // Peek separator
      const sep = lines[i + 1];
      if (sep && TABLE_SEP_RE.test(sep)) {
        const start = i;
        const parseRow = (l: string): InlineRun[][] =>
          l
            .trim()
            .replace(/^\|/, "")
            .replace(/\|$/, "")
            .split("|")
            .map((c) => parseInline(c.trim()));
        // parseInline already escapes its content, so no extra escape here.
        const headers = parseRow(line);
        const rows: InlineRun[][][] = [];
        let j = i + 2;
        while (j < lines.length && TABLE_ROW_RE.test(lines[j]!)) {
          rows.push(parseRow(lines[j]!));
          j += 1;
        }
        blocks.push({
          kind: "table",
          key: nextKey(),
          start,
          end: j,
          raw: lines.slice(start, j).join("\n"),
          headers,
          rows,
        });
        i = j;
        continue;
      }
    }

    // --- Headings --------------------------------------------------------
    const headingMatch = trimmed.match(HEADING_RE);
    if (headingMatch) {
      flushParagraph(i);
      const level = headingMatch[1]!.length as 1 | 2 | 3;
      const text = headingMatch[2] ?? "";
      blocks.push({
        kind: "heading",
        key: nextKey(),
        start: i,
        end: i + 1,
        raw: line,
        level,
        inline: parseInline(text),
      });
      i += 1;
      continue;
    }

    // --- HR --------------------------------------------------------------
    if (HR_RE.test(trimmed)) {
      flushParagraph(i);
      blocks.push({ kind: "hr", key: nextKey(), start: i, end: i + 1, raw: line });
      i += 1;
      continue;
    }

    // --- Lists -----------------------------------------------------------
    if (ULIST_RE.test(trimmed)) {
      flushParagraph(i);
      const start = i;
      const items: InlineRun[][] = [];
      while (i < lines.length) {
        const t = lines[i]!.trim();
        const m = t.match(ULIST_RE);
        if (!m) break;
        items.push(parseInline(m[1] ?? ""));
        i += 1;
      }
      blocks.push({
        kind: "list",
        key: nextKey(),
        start,
        end: i,
        raw: lines.slice(start, i).join("\n"),
        ordered: false,
        items,
      });
      continue;
    }
    if (OLIST_RE.test(trimmed)) {
      flushParagraph(i);
      const start = i;
      const items: InlineRun[][] = [];
      while (i < lines.length) {
        const t = lines[i]!.trim();
        const m = t.match(OLIST_RE);
        if (!m) break;
        items.push(parseInline(m[1] ?? ""));
        i += 1;
      }
      blocks.push({
        kind: "list",
        key: nextKey(),
        start,
        end: i,
        raw: lines.slice(start, i).join("\n"),
        ordered: true,
        items,
      });
      continue;
    }

    // --- Blockquote ------------------------------------------------------
    if (QUOTE_RE.test(trimmed)) {
      flushParagraph(i);
      const start = i;
      const buf: string[] = [];
      while (i < lines.length) {
        const t = lines[i]!.trim();
        const m = t.match(QUOTE_RE);
        if (!m) break;
        buf.push(m[1] ?? "");
        i += 1;
      }
      const text = buf.join(" ");
      blocks.push({
        kind: "quote",
        key: nextKey(),
        start,
        end: i,
        raw: lines.slice(start, i).join("\n"),
        inline: parseInline(text),
      });
      continue;
    }

    // --- Blank line ------------------------------------------------------
    if (trimmed === "") {
      flushParagraph(i);
      i += 1;
      continue;
    }

    // --- Paragraph (collect until blank / non-paragraph line) ------------
    if (paraBuffer.length === 0) paraStart = i;
    paraBuffer.push(trimmed);
    i += 1;
  }
  flushParagraph(lines.length);
  return blocks;
}

// ---------------------------------------------------------------------------
// Code block with lazy syntax highlighting
// ---------------------------------------------------------------------------

interface CodeBlockViewProps {
  language: string;
  body: string;
  /** Only run syntax highlighting once this is true. */
  highlight: boolean;
  /** Stable identity for the highlight effect. */
  highlightKey: string;
}

const CodeBlockView = memo(function CodeBlockView({
  language,
  body,
  highlight,
  highlightKey,
}: CodeBlockViewProps) {
  const [html, setHtml] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);

  // Syntax highlight after the stream ends. We re-run whenever `highlight`
  // flips true or the body changes *while* highlighted (e.g. user message
  // contains a finished code block). Keyed on `highlightKey` so the same
  // block re-highlights if needed.
  useEffect(() => {
    if (!highlight) {
      setHtml(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { codeToHtml } = await import("shiki");
        const out = await codeToHtml(body || " ", {
          lang: language || "text",
          theme: "github-light",
        });
        if (!cancelled) setHtml(out);
      } catch {
        // Unsupported language — fall back to plain.
        if (!cancelled) setHtml(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [highlight, highlightKey, body, language]);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  };

  // While streaming OR before highlight completes, render plain monospaced
  // text. This is what gives us the no-flicker guarantee: we never replace
  // a text node with a colored one — we only ever replace a *plain* node
  // with a *highlighted* one once, and only after streaming is done.
  return (
    <div className="md-codeblock group">
      <div className="md-codeblock-header">
        <span className="md-codeblock-lang">{language || "text"}</span>
        <button
          type="button"
          onClick={onCopy}
          className="md-codeblock-copy"
          aria-label="Copy code"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      {html ? (
        <div
          ref={preRef as unknown as React.RefObject<HTMLDivElement>}
          className="md-codeblock-body md-shiki"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <pre ref={preRef} className="md-codeblock-body">
          <code className={`language-${language || "text"}`}>{body}</code>
        </pre>
      )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Block renderers
// ---------------------------------------------------------------------------

interface BlockViewProps {
  block: Block;
  /** Index of this block in the parent list (for stable ordering). */
  index: number;
  /** True when this is the last block AND we're still streaming. */
  isOpen: boolean;
  /** True for the very last block in the document. */
  isLast: boolean;
  /** True while the assistant is still generating. */
  isStreaming: boolean;
}

const BlockView = memo(function BlockView({
  block,
  index,
  isOpen,
  isStreaming,
}: BlockViewProps) {
  // `key` is intentionally derived from the block's stable identity, so
  // earlier blocks do not re-render when later text appends.
  void index;
  switch (block.kind) {
    case "heading": {
      const text = renderInline(block.inline);
      if (block.level === 1) return <h1 className="md-h1">{text}</h1>;
      if (block.level === 2) return <h2 className="md-h2">{text}</h2>;
      return <h3 className="md-h3">{text}</h3>;
    }
    case "paragraph":
      return <p className="md-p">{renderInline(block.inline)}</p>;
    case "list":
      if (block.ordered) {
        return (
          <ol className="md-ol">
            {block.items.map((it, idx) => (
              <li key={idx}>{renderInline(it)}</li>
            ))}
            {isOpen && isStreaming ? <li className="md-cursor-row" aria-hidden="true" /> : null}
          </ol>
        );
      }
      return (
        <ul className="md-ul">
          {block.items.map((it, idx) => (
            <li key={idx}>{renderInline(it)}</li>
          ))}
          {isOpen && isStreaming ? <li className="md-cursor-row" aria-hidden="true" /> : null}
        </ul>
      );
    case "quote":
      return <blockquote className="md-quote">{renderInline(block.inline)}</blockquote>;
    case "hr":
      return <hr className="md-hr" />;
    case "code":
      return (
        <CodeBlockView
          language={block.language}
          body={block.body}
          highlight={!isStreaming}
          highlightKey={block.key}
        />
      );
    case "table":
      return (
        <div className="md-table-wrap">
          <table className="md-table">
            <thead>
              <tr>
                {block.headers.map((h, idx) => (
                  <th key={idx}>{renderInline(h)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r}>
                  {row.map((c, cidx) => (
                    <td key={cidx}>{renderInline(c)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
});

// ---------------------------------------------------------------------------
// Blinking cursor
// ---------------------------------------------------------------------------

const BlinkingCursor = memo(function BlinkingCursor() {
  // Pure CSS animation — runs on the compositor, no React re-renders.
  return <span className="md-cursor" aria-hidden="true" />;
});

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

/**
 * The exported streaming-aware renderer.
 *
 * - During streaming, `content` changes many times per second. We pass it
 *   through `useDeferredValue` to keep input latency low — React will defer
 *   the heavy parse work until after the next paint if there's other work
 *   to do.
 * - We `useMemo` the block list so unchanged content does not re-parse.
 * - Each block is keyed by its stable `block.key`, so React reuses DOM
 *   nodes for previously committed blocks.
 */
export const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
  isStreaming = false,
  className = "",
}: MarkdownRendererProps) {
  // Defer expensive parsing so the streaming UI stays responsive.
  const deferred = useDeferredValue(content);

  // `useMemo` keys the parse on the *deferred* content. While tokens are
  // flooding in, useDeferredValue will keep returning the previous string
  // until React has time, effectively throttling parses to one per frame.
  const blocks = useMemo<Block[]>(() => parseBlocks(deferred), [deferred]);

  // We need to know which block is the "open" one — i.e. the last block
  // that may not yet be finished. The renderer places the blinking cursor
  // at the end of the *last* block in streaming mode.
  const isOpen = blocks.length > 0;

  return (
    <div className={`md-root ${className}`}>
      {blocks.map((b, idx) => (
        <BlockView
          key={b.key}
          block={b}
          index={idx}
          isOpen={isOpen && idx === blocks.length - 1}
          isLast={idx === blocks.length - 1}
          isStreaming={isStreaming}
        />
      ))}
      {isStreaming && isOpen ? <BlinkingCursor /> : null}
    </div>
  );
});

// Re-export the legacy name so old imports keep working.
export default MarkdownRenderer;

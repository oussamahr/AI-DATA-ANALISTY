"use client";

import React, { useState } from "react";
import { Copy, Check } from "lucide-react";
import DOMPurify from "dompurify";
import { StreamingCursor } from "@/components/ui/typing-indicator";

interface MarkdownRendererProps {
  content: string;
  className?: string;
  isStreaming?: boolean;
}

const escapeHtml = (text: string): string => {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
};

const renderInlineCode = (text: string): string => {
  return text.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
};

const renderBold = (text: string): string => {
  return text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
};

const renderItalic = (text: string): string => {
  return text.replace(/\*(.+?)\*/g, "<em>$1</em>");
};

const renderStrikethrough = (text: string): string => {
  return text.replace(/~~(.+?)~~/g, "<del>$1</del>");
};

const processInlineFormatting = (text: string): string => {
  let result = escapeHtml(text);
  result = renderInlineCode(result);
  result = renderBold(result);
  result = renderItalic(result);
  result = renderStrikethrough(result);
  return result;
};

const html = (text: string) => ({ __html: DOMPurify.sanitize(processInlineFormatting(text)) });

// ─── Tokenizer & Syntax Highlighter for Code Blocks ────────────────────────

interface Token {
  type: string;
  value: string;
}

const pythonRules = [
  { type: "comment", regex: /^#[^\n]*/ },
  { type: "string", regex: /^"""[\s\S]*?"""|^'''[\s\S]*?'''|^"(?:\\.|[^"\\])*"|^'(?:\\.|[^'\\])*'/ },
  { type: "keyword", regex: /^(?:def|class|return|if|elif|else|for|while|try|except|finally|import|from|as|in|is|and|or|not|lambda|with|assert|pass|break|continue|None|True|False)\b/ },
  { type: "builtin", regex: /^(?:print|len|range|str|int|float|list|dict|set|tuple|type|isinstance|sum|min|max|abs|any|all|enumerate|zip|pd|np|plt|sns|DataFrame|Series|read_csv)\b/ },
  { type: "number", regex: /^\d+(?:\.\d+)?\b/ },
  { type: "decorator", regex: /^@[a-zA-Z_][a-zA-Z0-9_]*/ },
  { type: "operator", regex: /^[-+*/%=<>!&|^~]+/ },
];

const sqlRules = [
  { type: "comment", regex: /^--[^\n]*|^\/\*[\s\S]*?\*\// },
  { type: "string", regex: /^'(?:\\.|[^'\\])*'|^"(?:\\.|[^"\\])*"/ },
  { type: "keyword", regex: /^(?:SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|ON|GROUP\s+BY|ORDER\s+BY|HAVING|LIMIT|AND|OR|NOT|AS|IN|LIKE|IS|NULL|INSERT|UPDATE|DELETE|CREATE|TABLE|DROP|ALTER|WITH|UNION|ALL|CASE|WHEN|THEN|ELSE|END)\b/i },
  { type: "builtin", regex: /^(?:SUM|COUNT|AVG|MIN|MAX|ROUND|COALESCE|CONCAT|NOW|DATE|EXTRACT|ROW_NUMBER|OVER|PARTITION\s+BY)\b/i },
  { type: "number", regex: /^\d+(?:\.\d+)?\b/ },
  { type: "operator", regex: /^[-+*/%=<>!&|^~]+/ },
];

const jsonRules = [
  { type: "string", regex: /^"(?:\\.|[^"\\])*"/ },
  { type: "number", regex: /^-?\d+(?:\.\d+)?\b/ },
  { type: "keyword", regex: /^(?:true|false|null)\b/ },
  { type: "punctuation", regex: /^[{}[\]:,]/ },
];

const jsRules = [
  { type: "comment", regex: /^\/\/.*|^\/\*[\s\S]*?\*\// },
  { type: "string", regex: /^"(?:\\.|[^"\\])*"|^|'(?:\\.|[^'\\])*'|^`(?:\\.|[^`\\])*`/ },
  { type: "keyword", regex: /^(?:const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|import|export|from|default|class|extends|new|this|typeof|instanceof|async|await|try|catch|finally|throw|true|false|null|undefined)\b/ },
  { type: "builtin", regex: /^(?:console|log|error|warn|info|window|document|process|require|module|exports|JSON|stringify|parse|Math|Date|Array|Object|String|Number|Boolean|RegExp|Set|Map|Promise)\b/ },
  { type: "number", regex: /^\d+(?:\.\d+)?\b/ },
  { type: "operator", regex: /^[-+*/%=<>!&|^~]+/ },
];

function tokenize(code: string, language: string): Token[] {
  const lang = language.toLowerCase();
  let rules = pythonRules;
  if (lang === "sql") {
    rules = sqlRules;
  } else if (lang === "json") {
    rules = jsonRules;
  } else if (lang === "js" || lang === "javascript" || lang === "ts" || lang === "typescript" || lang === "tsx" || lang === "jsx") {
    rules = jsRules;
  }

  let index = 0;
  const tokens: Token[] = [];

  while (index < code.length) {
    let matched = false;
    const remaining = code.substring(index);

    for (const rule of rules) {
      const match = remaining.match(rule.regex);
      if (match && remaining.indexOf(match[0]) === 0) {
        tokens.push({ type: rule.type, value: match[0] });
        index += match[0].length;
        matched = true;
        break;
      }
    }

    if (!matched) {
      const char = code[index];
      if (tokens.length > 0 && tokens[tokens.length - 1].type === "text") {
        tokens[tokens.length - 1].value += char;
      } else {
        tokens.push({ type: "text", value: char });
      }
      index++;
    }
  }

  return tokens;
}

const tokenStyles: Record<string, string> = {
  comment: "text-zinc-400 dark:text-zinc-500 italic",
  string: "text-emerald-600 dark:text-emerald-400 break-words",
  keyword: "text-pink-600 dark:text-pink-400 font-semibold",
  builtin: "text-violet-600 dark:text-violet-400",
  number: "text-amber-600 dark:text-amber-500",
  decorator: "text-purple-600 dark:text-purple-400",
  operator: "text-sky-600 dark:text-sky-400",
  punctuation: "text-zinc-400 dark:text-zinc-500",
};

// ─── Code Block Component ──────────────────────────────────────────────────

const CodeBlock: React.FC<{ 
  code: string; 
  language?: string;
  onCopy?: () => void;
  isStreaming?: boolean;
}> = ({ code, language = "", onCopy, isStreaming = false }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    onCopy?.();
    setTimeout(() => setCopied(false), 2000);
  };

  const tokens = tokenize(code, language);

  return (
    <div className="relative group my-4">
      <div className="flex items-center justify-between px-4 py-1.5 bg-muted/80 border-t border-x border-border rounded-t-lg text-xs text-muted-foreground font-mono select-none">
        <span>{language || "code"}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="size-3.5 text-green-500" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="size-3.5" />
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto rounded-b-lg bg-muted/30 border border-border mt-0 font-mono">
        <code className={`language-${language} text-sm`}>
          {tokens.map((token, idx) => (
            <span key={idx} className={tokenStyles[token.type] || ""}>
              {token.value}
            </span>
          ))}
          {isStreaming && <StreamingCursor className="bg-primary" />}
        </code>
      </pre>
    </div>
  );
};

// ─── Table Component ───────────────────────────────────────────────────────

const Table: React.FC<{ 
  headers: string[]; 
  rows: string[][];
  isStreaming?: boolean;
}> = ({ headers, rows, isStreaming = false }) => (
  <div className="overflow-x-auto my-4">
    <table className="min-w-full divide-y divide-border border border-border rounded-lg">
      <thead className="bg-muted/50">
        <tr>
          {headers.map((header, i) => (
            <th key={i} className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {rows.map((row, rowIndex) => (
          <tr key={rowIndex} className={rowIndex % 2 === 0 ? "bg-background" : "bg-muted/10"}>
            {row.map((cell, cellIndex) => {
              const isLastCell = isStreaming && rowIndex === rows.length - 1 && cellIndex === row.length - 1;
              return (
                <td key={cellIndex} className="px-3 py-2 text-sm text-foreground">
                  <span dangerouslySetInnerHTML={html(cell)} />
                  {isLastCell && <StreamingCursor className="ml-1" />}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ─── Markdown Parser ────────────────────────────────────────────────────────

const parseMarkdown = (markdown: string, isStreaming: boolean): React.ReactNode[] => {
  const lines = markdown.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Code blocks
    if (trimmed.startsWith("```")) {
      const language = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      let hasClosingFence = false;
      while (i < lines.length) {
        if (lines[i].trim().startsWith("```")) {
          hasClosingFence = true;
          break;
        }
        codeLines.push(lines[i]);
        i++;
      }
      
      const isCodeStreaming = isStreaming && !hasClosingFence;
      
      nodes.push(
        <CodeBlock 
          key={nodes.length} 
          code={codeLines.join("\n")} 
          language={language} 
          isStreaming={isCodeStreaming} 
        />
      );
      i++; // Skip the closing fence or end
      continue;
    }

    // Tables
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const tableLines: string[] = [line];
      let j = i + 1;
      while (j < lines.length && lines[j].trim().startsWith("|") && lines[j].trim().endsWith("|")) {
        tableLines.push(lines[j]);
        j++;
      }
      
      if (tableLines.length >= 2) {
        const parseRow = (rowLine: string) => 
          rowLine.split("|").slice(1, -1).map(c => c.trim());
        
        const headers = parseRow(tableLines[0]);
        const contentLines = tableLines.slice(1).filter(line => !/^[|:\s-]+$/.test(line));
        const rows = contentLines.map(parseRow);
        const isTableStreaming = isStreaming && j === lines.length;
        
        nodes.push(
          <Table 
            key={nodes.length} 
            headers={headers} 
            rows={rows} 
            isStreaming={isTableStreaming} 
          />
        );
      }
      i = j;
      continue;
    }

    // Headers
    if (trimmed.startsWith("# ")) {
      const isLastNode = i === lines.length - 1 && isStreaming;
      nodes.push(
        <h1 key={nodes.length} className="text-2xl font-bold mt-6 mb-3 flex items-center flex-wrap gap-1">
          <span dangerouslySetInnerHTML={html(trimmed.slice(2))} />
          {isLastNode && <StreamingCursor className="align-middle ml-1" />}
        </h1>
      );
    } else if (trimmed.startsWith("## ")) {
      const isLastNode = i === lines.length - 1 && isStreaming;
      nodes.push(
        <h2 key={nodes.length} className="text-xl font-semibold mt-5 mb-2 flex items-center flex-wrap gap-1">
          <span dangerouslySetInnerHTML={html(trimmed.slice(3))} />
          {isLastNode && <StreamingCursor className="align-middle ml-1" />}
        </h2>
      );
    } else if (trimmed.startsWith("### ")) {
      const isLastNode = i === lines.length - 1 && isStreaming;
      nodes.push(
        <h3 key={nodes.length} className="text-lg font-medium mt-4 mb-2 flex items-center flex-wrap gap-1">
          <span dangerouslySetInnerHTML={html(trimmed.slice(4))} />
          {isLastNode && <StreamingCursor className="align-middle ml-1" />}
        </h3>
      );
    }
    // Unordered lists
    else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const listItems: string[] = [trimmed.slice(2)];
      let j = i + 1;
      while (j < lines.length && (lines[j].trim().startsWith("- ") || lines[j].trim().startsWith("* "))) {
        listItems.push(lines[j].trim().slice(2));
        j++;
      }
      
      const isListStreaming = isStreaming && j === lines.length;
      
      nodes.push(
        <ul key={nodes.length} className="list-disc list-inside space-y-1.5 ml-4 mb-3">
          {listItems.map((item, idx) => {
            const isLastItem = isListStreaming && idx === listItems.length - 1;
            return (
              <li key={idx} className="text-sm">
                <span dangerouslySetInnerHTML={html(item)} className="inline" />
                {isLastItem && <StreamingCursor className="align-middle ml-1" />}
              </li>
            );
          })}
        </ul>
      );
      i = j - 1;
    }
    // Ordered lists
    else if (/^\d+\.\s/.test(trimmed)) {
      const listItems: string[] = [trimmed.replace(/^\d+\.\s/, "")];
      let j = i + 1;
      while (j < lines.length && /^\d+\.\s/.test(lines[j].trim())) {
        listItems.push(lines[j].trim().replace(/^\d+\.\s/, ""));
        j++;
      }
      
      const isListStreaming = isStreaming && j === lines.length;
      
      nodes.push(
        <ol key={nodes.length} className="list-decimal list-inside space-y-1.5 ml-4 mb-3">
          {listItems.map((item, idx) => {
            const isLastItem = isListStreaming && idx === listItems.length - 1;
            return (
              <li key={idx} className="text-sm">
                <span dangerouslySetInnerHTML={html(item)} className="inline" />
                {isLastItem && <StreamingCursor className="align-middle ml-1" />}
              </li>
            );
          })}
        </ol>
      );
      i = j - 1;
    }
    // Blockquotes
    else if (trimmed.startsWith("> ")) {
      const quoteLines: string[] = [trimmed.slice(2)];
      let j = i + 1;
      while (j < lines.length && lines[j].trim().startsWith("> ")) {
        quoteLines.push(lines[j].trim().slice(2));
        j++;
      }
      
      const isQuoteStreaming = isStreaming && j === lines.length;
      
      nodes.push(
        <blockquote key={nodes.length} className="border-l-4 border-primary pl-4 italic text-muted-foreground my-3">
          {quoteLines.map((line, idx) => {
            const isLastLine = isQuoteStreaming && idx === quoteLines.length - 1;
            return (
              <div key={idx}>
                <span dangerouslySetInnerHTML={html(line)} className="inline" />
                {isLastLine && <StreamingCursor className="align-middle ml-1" />}
              </div>
            );
          })}
        </blockquote>
      );
      i = j - 1;
    }
    // Horizontal rule
    else if (trimmed === "---" || trimmed === "***") {
      nodes.push(<hr key={nodes.length} className="my-4 border-border" />);
    }
    // Paragraphs
    else if (trimmed) {
      const isLastNode = i === lines.length - 1 && isStreaming;
      nodes.push(
        <p key={nodes.length} className="text-sm leading-relaxed mb-3">
          <span dangerouslySetInnerHTML={html(trimmed)} className="inline" />
          {isLastNode && <StreamingCursor className="align-middle ml-1" />}
        </p>
      );
    }

    i++;
  }

  return nodes;
};

export const MarkdownRenderer = React.memo(function MarkdownRenderer({ 
  content, 
  className = "", 
  isStreaming = false 
}: MarkdownRendererProps) {
  const parsed = React.useMemo(() => parseMarkdown(content, isStreaming), [content, isStreaming]);

  return (
    <div className={`prose prose-sm max-w-none ${className}`}>
      {parsed}
      <style>{`
        .inline-code {
          background-color: var(--color-muted);
          color: var(--color-foreground);
          padding: 0.125rem 0.375rem;
          border-radius: 0.25rem;
          font-family: ui-monospace, monospace;
          font-size: 0.8125rem;
          border: 1px solid var(--color-border);
        }
      `}</style>
    </div>
  );
});

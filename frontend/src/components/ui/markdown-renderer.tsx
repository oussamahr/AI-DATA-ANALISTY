"use client";

import React from "react";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import DOMPurify from "dompurify";

interface MarkdownRendererProps {
  content: string;
  className?: string;
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
  return text.replace(/`([^`]+)`/g, '<code className="inline-code">$1</code>');
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

const CodeBlock: React.FC<{ 
  code: string; 
  language?: string;
  onCopy?: () => void;
}> = ({ code, language = "", onCopy }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    onCopy?.();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleCopy}
          className="p-1.5 rounded bg-muted/80 hover:bg-muted text-muted-foreground transition-colors"
          aria-label="Copy code"
        >
          {copied ? (
            <Check className="size-4 text-green-500" />
          ) : (
            <Copy className="size-4" />
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto rounded-lg bg-muted/50 border border-border">
        <code className={`language-${language} text-sm font-mono`}>
          {code}
        </code>
      </pre>
    </div>
  );
};

const Table: React.FC<{ 
  headers: string[]; 
  rows: string[][] 
}> = ({ headers, rows }) => (
  <div className="overflow-x-auto my-4">
    <table className="min-w-full divide-y divide-border">
      <thead className="bg-muted/50">
        <tr>
          {headers.map((header, i) => (
            <th key={i} className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {rows.map((row, rowIndex) => (
          <tr key={rowIndex} className={rowIndex % 2 === 0 ? "bg-background" : "bg-muted/30"}>
            {row.map((cell, cellIndex) => (
              <td key={cellIndex} className="px-3 py-2 text-sm">
                <span dangerouslySetInnerHTML={html(cell)} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const parseMarkdown = (markdown: string): React.ReactNode[] => {
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
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      nodes.push(
        <CodeBlock key={nodes.length} code={codeLines.join("\n")} language={language} />
      );
      i++;
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
      
      // Parse table
      const parseRow = (rowLine: string) => 
        rowLine.split("|").slice(1, -1).map(c => c.trim());
      
      const headers = parseRow(tableLines[0]);
      const rows = tableLines.slice(2).map(parseRow); // Skip separator line
      
      nodes.push(<Table key={nodes.length} headers={headers} rows={rows} />);
      i = j;
      continue;
    }

    // Headers
    if (trimmed.startsWith("# ")) {
      nodes.push(<h1 key={nodes.length} className="text-2xl font-bold mt-6 mb-3"><span dangerouslySetInnerHTML={html(trimmed.slice(2))} /></h1>);
    } else if (trimmed.startsWith("## ")) {
      nodes.push(<h2 key={nodes.length} className="text-xl font-semibold mt-5 mb-2"><span dangerouslySetInnerHTML={html(trimmed.slice(3))} /></h2>);
    } else if (trimmed.startsWith("### ")) {
      nodes.push(<h3 key={nodes.length} className="text-lg font-medium mt-4 mb-2"><span dangerouslySetInnerHTML={html(trimmed.slice(4))} /></h3>);
    }
    // Unordered lists
    else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const listItems: string[] = [trimmed.slice(2)];
      let j = i + 1;
      while (j < lines.length && (lines[j].trim().startsWith("- ") || lines[j].trim().startsWith("* "))) {
        listItems.push(lines[j].trim().slice(2));
        j++;
      }
      nodes.push(
        <ul key={nodes.length} className="list-disc list-inside space-y-1 ml-4 mb-3">
          {listItems.map((item, idx) => (
            <li key={idx} className="text-sm"><span dangerouslySetInnerHTML={html(item)} /></li>
          ))}
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
      nodes.push(
        <ol key={nodes.length} className="list-decimal list-inside space-y-1 ml-4 mb-3">
          {listItems.map((item, idx) => (
            <li key={idx} className="text-sm"><span dangerouslySetInnerHTML={html(item)} /></li>
          ))}
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
      nodes.push(
        <blockquote key={nodes.length} className="border-l-4 border-primary pl-4 italic text-muted-foreground my-3">
          {quoteLines.map((line, idx) => (
            <div key={idx} dangerouslySetInnerHTML={html(line)} />
          ))}
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
      nodes.push(
        <p key={nodes.length} className="text-sm leading-relaxed mb-3">
          <span dangerouslySetInnerHTML={html(trimmed)} />
        </p>
      );
    }

    i++;
  }

  return nodes;
};

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  return (
    <div className={`prose prose-sm max-w-none ${className}`}>
      {parseMarkdown(content)}
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
}
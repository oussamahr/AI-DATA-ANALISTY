import { PageHeader } from "@/components/shared/PageHeader";
import { QueryConsole } from "../components/QueryConsole";

export function LLMPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader title="AI Assistant" description="Query your data in natural language. Structured output, intent validation, PII redaction, 30/min rate limit." />
      <QueryConsole />
    </div>
  );
}

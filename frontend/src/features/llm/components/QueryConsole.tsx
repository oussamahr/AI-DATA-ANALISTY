import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAskLlm, useLlmHistory } from "../hooks";
import { Send, Bot, Loader2, Clock, Cpu } from "lucide-react";
import { formatApiError } from "@/lib/api-error";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDatasets } from "@/features/datasets/hooks";
import { formatDistanceToNow } from "date-fns";

export function QueryConsole() {
  const [prompt, setPrompt] = useState("");
  const [datasetId, setDatasetId] = useState<string>("none");
  const { mutateAsync, isPending, data: lastResponse } = useAskLlm();
  const { data: history } = useLlmHistory(5, 0);
  const { data: datasets } = useDatasets(1, 100);

  const handleAsk = async () => {
    if (!prompt.trim()) return;
    try {
      await mutateAsync({ prompt: prompt.trim(), dataset_id: datasetId === "none" ? null : datasetId });
      // keep prompt for context but clear or not? keep
    } catch (err) {
      toast.error(formatApiError(err).userMessage);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Bot className="h-4 w-4" /> AI Assistant</CardTitle>
          <CardDescription>Natural language queries are validated, intent-checked, and PII-redacted. Rate-limited 30/min.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <Select value={datasetId} onValueChange={setDatasetId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select dataset context (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No dataset context</SelectItem>
                  {datasets?.items.map((ds) => (
                    <SelectItem key={ds.id} value={ds.id}>{ds.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="relative">
            <Textarea
              placeholder="Ask about your data, e.g. 'What is the average revenue by region last quarter?'"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              className="pr-12 resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleAsk();
                }
              }}
            />
            <Button size="icon" className="absolute bottom-2 right-2 h-8 w-8" onClick={handleAsk} disabled={isPending || !prompt.trim()}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">⌘+Enter to send • Queries audit-logged • Structured output enforced</p>

          {lastResponse && (
            <div className="mt-4 rounded-lg border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[11px]"><Cpu className="h-3 w-3 mr-1" />{lastResponse.model}</Badge>
                <Badge variant="outline" className="text-[11px]"><Clock className="h-3 w-3 mr-1" />{lastResponse.duration_ms ? `${lastResponse.duration_ms}ms` : "—"}</Badge>
                <span className="text-xs text-muted-foreground ml-auto">{formatDistanceToNow(new Date(lastResponse.created_at), { addSuffix: true })}</span>
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{lastResponse.response}</p>
              </div>
              <div className="text-[11px] text-muted-foreground">Prompt tokens: {lastResponse.tokens_prompt} • Completion: {lastResponse.tokens_completion}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {history && history.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Recent queries</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {history.map((h) => (
              <div key={h.id} className="text-sm p-2.5 rounded border bg-card hover:bg-muted/50 cursor-pointer" onClick={() => setPrompt(h.prompt)}>
                <p className="truncate font-medium">{h.prompt}</p>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <span>{formatDistanceToNow(new Date(h.created_at), { addSuffix: true })}</span>
                  <Badge variant={h.success ? "secondary" : "destructive"} className="text-[10px] h-4">{h.success ? "ok" : "fail"}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

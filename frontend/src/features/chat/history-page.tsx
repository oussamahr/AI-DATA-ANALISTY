import { History, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useLLMHistory } from "@/hooks/use-api";
import { formatDate, getErrorMessage } from "@/utils/cn";

export function HistoryPage() {
  const { data: history, isLoading, error } = useLLMHistory();

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="page-container space-y-6">
      <div>
        <h1 className="page-title">History</h1>
        <p className="page-subtitle">Your AI queries and analysis activity</p>
      </div>

      {error && (
        <div className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
          {getErrorMessage(error)}
        </div>
      )}

      {!history?.length ? (
        <EmptyState
          icon={History}
          title="No history yet"
          description="Your AI chat queries will appear here once you start asking questions."
        />
      ) : (
        <div className="space-y-4">
          {history.map((item) => (
            <Card key={item.id} className="transition-shadow hover:shadow-soft">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
                      <MessageSquare className="size-4 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-medium">{item.prompt}</CardTitle>
                      <p className="text-xs text-muted">{formatDate(item.created_at)} · {item.model}</p>
                    </div>
                  </div>
                  <Badge variant={item.success ? "success" : "danger"}>
                    {item.success ? "Success" : "Failed"}
                  </Badge>
                </div>
              </CardHeader>
              {item.response && (
                <CardContent>
                  <p className="text-sm leading-relaxed text-muted">{item.response}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

import { useQuery } from '@tanstack/react-query'
import { llmApi } from '@/services/api'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatRelativeTime } from '@/lib/utils'

type BadgeVariant = "default" | "success" | "warning" | "destructive" | "outline" | null | undefined;

export default function HistoryPage() {
  const { data: history, isLoading } = useQuery({
    queryKey: ['llm-history'],
    queryFn: () => llmApi.getHistory(100),
  })

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight mb-2">Query History</h1>
      <p className="text-[#6B7280] mb-8">All past AI conversations and insights</p>

      {isLoading ? (
        <div className="space-y-4">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-28 card skeleton" />)}</div>
      ) : history && history.length > 0 ? (
        <div className="space-y-3">
          {history.map((item, idx) => (
            <Card key={idx} className="p-6">
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1">
                  <div className="font-medium text-[#1F2937]">{item.prompt}</div>
                  <div className="text-sm mt-3 leading-relaxed text-[#4B5563]">{item.response}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs text-[#6B7280]">{formatRelativeTime(item.created_at)}</div>
                  {item.model && <Badge variant={"default" as BadgeVariant} className="mt-1">{item.model}</Badge>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <p className="text-[#6B7280]">No history yet. Start a conversation in the AI Chat.</p>
        </Card>
      )}
    </div>
  )
}

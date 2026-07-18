import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, BarChart3, MessageSquare } from 'lucide-react'
import { datasetsApi, analyticsApi } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatBytes, formatDate } from '@/lib/utils'

export default function DatasetDetailPage() {
  const { id } = useParams<{ id: string }>()

  const { data: dataset, isLoading } = useQuery({
    queryKey: ['dataset', id],
    queryFn: () => datasetsApi.get(id!),
    enabled: !!id,
  })

  const { data: profile } = useQuery({
    queryKey: ['profile', id],
    queryFn: () => analyticsApi.getProfile(id!),
    enabled: !!id,
  })

  if (isLoading || !dataset) {
    return <div className="h-96 skeleton rounded-2xl" />
  }

  return (
    <div>
      <Link to="/datasets" className="inline-flex items-center text-sm mb-4 text-[#6B7280] hover:text-[#3A4B41]">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to datasets
      </Link>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{dataset.name}</h1>
          <p className="text-[#6B7280] mt-1">{dataset.description || 'No description provided'}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" asChild>
            <a href={`/api/datasets/${id}/export`} target="_blank">Download</a>
          </Button>
          <Button asChild>
            <Link to={`/visualizations?dataset=${id}`}>
              <BarChart3 className="w-4 h-4 mr-2" /> Visualize
            </Link>
          </Button>
          <Button variant="accent" asChild>
            <Link to={`/chat?dataset=${id}`}>
              <MessageSquare className="w-4 h-4 mr-2" /> Ask AI
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <div className="p-6 space-y-4">
            <div>
              <div className="text-xs uppercase text-[#6B7280]">Rows</div>
              <div className="text-3xl font-semibold tracking-tighter mt-1">{dataset.row_count?.toLocaleString() || '—'}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-[#6B7280]">File size</div>
              <div className="font-medium">{formatBytes(dataset.file_size_bytes)}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-[#6B7280]">Uploaded</div>
              <div className="font-medium">{formatDate(dataset.created_at)}</div>
            </div>
            <div>
              {dataset.contains_pii && <Badge variant="warning">Contains PII</Badge>}
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="p-6">
            <h3 className="font-semibold mb-4">Data Profile</h3>
            {profile ? (
              <div className="text-sm text-[#1F2937]">
                {profile.summary && Object.keys(profile.summary).length > 0 ? (
                  <pre className="text-xs bg-[#F8F6F2] p-4 rounded-lg overflow-auto max-h-72">
                    {JSON.stringify(profile.summary, null, 2)}
                  </pre>
                ) : (
                  <div className="text-[#6B7280]">No profile summary available. Run an analysis.</div>
                )}
              </div>
            ) : (
              <div className="text-sm text-[#6B7280]">
                Run analysis to generate profile. <Link to={`/analytics?dataset=${id}`} className="underline">Go to Analytics →</Link>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

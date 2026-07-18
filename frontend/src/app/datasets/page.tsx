import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Search, Database, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { datasetsApi } from '@/services/api'
import { formatBytes, formatDate } from '@/lib/utils'
import { toast } from 'sonner'

export default function DatasetsPage() {
  const [search, setSearch] = useState('')
  const [page] = useState(1)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['datasets', page],
    queryFn: () => datasetsApi.list(page, 50),
  })

  const filtered = data?.items.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase())
  ) || []

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return
    try {
      await datasetsApi.delete(id)
      toast.success('Dataset deleted')
      refetch()
    } catch (e) {
      toast.error('Failed to delete dataset')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Datasets</h1>
          <p className="text-[#6B7280]">Manage your uploaded data files</p>
        </div>
        <Button asChild>
          <Link to="/datasets/upload">
            <Plus className="w-4 h-4 mr-2" /> Upload Dataset
          </Link>
        </Button>
      </div>

      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-[#9CA3AF]" />
          <Input
            placeholder="Search datasets..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 card skeleton" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Database className="mx-auto mb-4 h-10 w-10 text-[#9CA3AF]" />
          <p className="font-medium">No datasets found</p>
          <p className="text-sm text-[#6B7280] mt-1">Upload your first dataset to get started</p>
          <Button asChild className="mt-4">
            <Link to="/datasets/upload">Upload dataset</Link>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((dataset) => (
            <Card key={dataset.id} className="p-0 overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Link to={`/datasets/${dataset.id}`} className="font-semibold text-lg hover:underline block">
                      {dataset.name}
                    </Link>
                    <p className="text-sm text-[#6B7280] line-clamp-1 mt-1">
                      {dataset.description || 'No description'}
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.preventDefault(); handleDelete(dataset.id, dataset.name) }}
                    className="p-1 text-[#C65B5B] hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="px-5 py-4 border-t bg-[#FAF9F5] text-sm flex justify-between items-center">
                <div>
                  {dataset.row_count ? `${dataset.row_count.toLocaleString()} rows` : '—'} · {formatBytes(dataset.file_size_bytes)}
                </div>
                <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                  {formatDate(dataset.created_at)}
                  {dataset.contains_pii && <Badge variant="warning">PII</Badge>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

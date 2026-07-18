import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { datasetsApi, analyticsApi } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'

export default function AnalyticsPage() {
  const [selectedDataset, setSelectedDataset] = useState('')
  const [analysisType, setAnalysisType] = useState<'profile' | 'correlate' | 'analyze'>('profile')

  const { data: datasets } = useQuery({
    queryKey: ['datasets-all'],
    queryFn: () => datasetsApi.list(1, 100),
  })

  const runAnalysis = useMutation({
    mutationFn: async () => {
      if (!selectedDataset) throw new Error('Select a dataset')
      if (analysisType === 'profile') return analyticsApi.profile(selectedDataset)
      if (analysisType === 'correlate') return analyticsApi.correlate(selectedDataset)
      return analyticsApi.analyze(selectedDataset)
    },
    onSuccess: () => toast.success('Analysis started successfully'),
    onError: (err) => toast.error(err.message),
  })

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-semibold tracking-tight">Analytics</h1>
      <p className="text-[#6B7280] mb-8">Run statistical analysis and generate insights.</p>

      <Card className="p-8">
        <div className="space-y-6">
          <div>
            <label className="block mb-2 text-sm font-medium">Select Dataset</label>
            <select
              value={selectedDataset}
              onChange={(e) => setSelectedDataset(e.target.value)}
              className="input w-full"
            >
              <option value="">Choose a dataset...</option>
              {datasets?.items.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium">Analysis Type</label>
            <div className="flex gap-2 flex-wrap">
              {[
                { value: 'profile', label: 'Profile' },
                { value: 'correlate', label: 'Correlations' },
                { value: 'analyze', label: 'Full Analysis' },
              ].map((t) => (
                <button
                  key={t.value}
                  onClick={() => setAnalysisType(t.value as any)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border ${analysisType === t.value ? 'border-[#3A4B41] bg-[#3A4B41] text-white' : 'border-[#D9D9D9]'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <Button 
            onClick={() => runAnalysis.mutate()} 
            disabled={!selectedDataset || runAnalysis.isPending}
            className="w-full h-11"
          >
            {runAnalysis.isPending ? 'Running analysis...' : 'Run Analysis'}
          </Button>
        </div>
      </Card>

      <div className="text-xs mt-6 text-[#6B7280]">
        Analyses are stored and can be viewed in the dataset detail view or under History.
      </div>
    </div>
  )
}

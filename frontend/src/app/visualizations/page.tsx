import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { datasetsApi } from '@/services/api'
import { Card } from '@/components/ui/card'
import { BarChart3, PieChart, TrendingUp } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell
} from 'recharts'

const COLORS = ['#3A4B41', '#5C8A67', '#E6CFA7', '#C69B4A', '#4B5F54']

export default function VisualizationsPage() {
  const [selectedDataset, setSelectedDataset] = useState('')
  const [chartType, setChartType] = useState<'bar' | 'pie' | 'line'>('bar')

  const { data: datasets } = useQuery({
    queryKey: ['datasets-all'],
    queryFn: () => datasetsApi.list(1, 50),
  })

  // Mock data for demo
  const mockData = [
    { name: 'Q1', value: 2400 },
    { name: 'Q2', value: 1398 },
    { name: 'Q3', value: 9800 },
    { name: 'Q4', value: 3908 },
  ]

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight mb-1">Visualizations</h1>
      <p className="text-[#6B7280] mb-8">Create beautiful charts from your datasets.</p>

      <div className="flex flex-wrap gap-3 mb-6">
        <select 
          value={selectedDataset} 
          onChange={e => setSelectedDataset(e.target.value)}
          className="input w-72"
        >
          <option value="">Select dataset to visualize...</option>
          {datasets?.items.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>

        <div className="flex border border-[#D9D9D9] rounded-xl overflow-hidden">
          {(['bar', 'pie', 'line'] as const).map(t => (
            <button 
              key={t}
              onClick={() => setChartType(t)}
              className={`px-5 text-sm flex items-center gap-2 ${chartType === t ? 'bg-[#3A4B41] text-white' : 'hover:bg-[#F8F6F2]'}`}
            >
              {t === 'bar' && <BarChart3 className="w-4 h-4" />}
              {t === 'pie' && <PieChart className="w-4 h-4" />}
              {t === 'line' && <TrendingUp className="w-4 h-4" />}
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <Card className="p-8">
        {!selectedDataset ? (
          <div className="h-[380px] flex items-center justify-center text-[#6B7280]">
            Select a dataset above to generate a visualization
          </div>
        ) : (
          <div className="h-[380px]">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' ? (
                <BarChart data={mockData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EDEBE6" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3A4B41" radius={4} />
                </BarChart>
              ) : chartType === 'pie' ? (
                <RechartsPie>
                  <Pie data={mockData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={130} label>
                    {mockData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </RechartsPie>
              ) : (
                <BarChart data={mockData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EDEBE6" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#E6CFA7" radius={4} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <div className="text-sm mt-4 text-[#6B7280]">
        Full chart support is powered by the backend chart endpoints. This is a preview.
      </div>
    </div>
  )
}

import { useQuery } from '@tanstack/react-query'
import { 
  Database, BarChart3, MessageSquare, TrendingUp, 
  ArrowRight, Upload 
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { datasetsApi, llmApi } from '@/services/api'
import { formatRelativeTime, formatBytes } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import { motion } from 'framer-motion'

// Simple Recharts components
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, LineChart, Line 
} from 'recharts'

export default function DashboardPage() {
  const { user } = useAuthStore()

  const { data: datasets } = useQuery({
    queryKey: ['datasets'],
    queryFn: () => datasetsApi.list(1, 5),
  })

  const { data: recentHistory } = useQuery({
    queryKey: ['llm-history'],
    queryFn: () => llmApi.getHistory(6),
  })

  // Mock stats for demo
  const stats = [
    { label: 'Datasets', value: datasets?.total || 24, icon: Database, change: '+3 this week' },
    { label: 'Analyses Run', value: 147, icon: BarChart3, change: '+18 this month' },
    { label: 'AI Queries', value: 89, icon: MessageSquare, change: '+12 today' },
    { label: 'Insights Generated', value: 312, icon: TrendingUp, change: '92% accuracy' },
  ]

  const activityData = [
    { name: 'Mon', queries: 12 }, { name: 'Tue', queries: 19 }, { name: 'Wed', queries: 8 },
    { name: 'Thu', queries: 27 }, { name: 'Fri', queries: 15 }, { name: 'Sat', queries: 9 },
  ]

  const recentDatasets = datasets?.items?.slice(0, 4) || []

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-[28px] font-semibold tracking-[-0.4px] text-[#1F2937]">
          Good morning, {user?.first_name || 'there'}
        </h1>
        <p className="text-[#6B7280] mt-1">Here&apos;s what&apos;s happening with your data today.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon
          return (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-[#6B7280]">{stat.label}</p>
                    <p className="text-4xl font-semibold tracking-tighter mt-3 text-[#1F2937]">{stat.value}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#F8F6F2]">
                    <Icon className="w-5 h-5 text-[#3A4B41]" />
                  </div>
                </div>
                <div className="mt-4 text-xs text-[#5C8A67]">{stat.change}</div>
              </Card>
            </motion.div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link to="/datasets/upload" className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#F8F6F2] group">
              <div className="p-2 bg-[#E6CFA7] rounded-lg"><Upload className="w-4 h-4 text-[#3A4B41]" /></div>
              <div className="flex-1"><div className="font-medium">Upload new dataset</div></div>
              <ArrowRight className="w-4 h-4 text-[#6B7280] group-hover:text-[#3A4B41]" />
            </Link>
            <Link to="/chat" className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#F8F6F2] group">
              <div className="p-2 bg-[#E6CFA7] rounded-lg"><MessageSquare className="w-4 h-4 text-[#3A4B41]" /></div>
              <div className="flex-1"><div className="font-medium">Ask AI a question</div></div>
              <ArrowRight className="w-4 h-4 text-[#6B7280] group-hover:text-[#3A4B41]" />
            </Link>
            <Link to="/analytics" className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#F8F6F2] group">
              <div className="p-2 bg-[#E6CFA7] rounded-lg"><BarChart3 className="w-4 h-4 text-[#3A4B41]" /></div>
              <div className="flex-1"><div className="font-medium">Run new analysis</div></div>
              <ArrowRight className="w-4 h-4 text-[#6B7280] group-hover:text-[#3A4B41]" />
            </Link>
          </CardContent>
        </Card>

        {/* Recent Datasets */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Datasets</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/datasets">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentDatasets.length > 0 ? (
              <div className="space-y-3">
                {recentDatasets.map((ds) => (
                  <Link key={ds.id} to={`/datasets/${ds.id}`} className="flex items-center justify-between p-3 rounded-xl hover:bg-[#F8F6F2] group">
                    <div>
                      <div className="font-medium">{ds.name}</div>
                      <div className="text-xs text-[#6B7280]">{ds.row_count || '?'} rows • {formatBytes(ds.file_size_bytes)}</div>
                    </div>
                    <div className="text-xs text-[#6B7280]">{formatRelativeTime(ds.created_at)}</div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-[#6B7280]">
                <Database className="mx-auto mb-3 opacity-40" />
                <p className="text-sm">No datasets yet</p>
                <Link to="/datasets/upload" className="text-[#3A4B41] text-sm mt-1 inline-block">Upload your first dataset →</Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg">AI Query Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 -mx-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E2" />
                  <XAxis dataKey="name" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip />
                  <Line type="natural" dataKey="queries" stroke="#3A4B41" strokeWidth={2.5} dot={{ fill: '#3A4B41', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent AI Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Recent AI Conversations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {recentHistory && recentHistory.length > 0 ? (
              recentHistory.slice(0, 4).map((item, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className="text-[#6B7280] shrink-0 mt-0.5 text-[10px] font-mono w-10">
                    {formatRelativeTime(item.created_at)}
                  </div>
                  <div className="line-clamp-2 text-[#1F2937]">
                    {item.prompt}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-[#6B7280] py-4">No recent AI activity</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

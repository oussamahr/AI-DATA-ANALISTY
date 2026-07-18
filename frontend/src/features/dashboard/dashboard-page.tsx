import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Database,
  Sparkles,
  TrendingUp,
  Upload,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageSkeleton } from "@/components/ui/skeleton";
import { AreaChart } from "@/components/charts/area-chart";
import { useAnalyticsStats, useAnalysisRuns, useDatasets } from "@/hooks/use-api";
import { useAuthStore } from "@/store";
import { formatBytes, formatDate, formatNumber } from "@/utils/cn";

const quickActions = [
  { label: "Upload Dataset", to: "/datasets/upload", icon: Upload, variant: "default" as const },
  { label: "Run Analysis", to: "/analytics", icon: BarChart3, variant: "secondary" as const },
  { label: "AI Assistant", to: "/chat", icon: Bot, variant: "accent" as const },
];

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data: stats, isLoading: statsLoading } = useAnalyticsStats();
  const { data: datasetsData, isLoading: datasetsLoading } = useDatasets(1, 5);
  const { data: runs, isLoading: runsLoading } = useAnalysisRuns();

  const isLoading = statsLoading || datasetsLoading || runsLoading;

  const chartData = [
    { name: "Mon", value: stats?.total_datasets ?? 2 },
    { name: "Tue", value: (stats?.total_analysis_runs ?? 1) + 1 },
    { name: "Wed", value: stats?.total_analysis_runs ?? 3 },
    { name: "Thu", value: (stats?.total_datasets ?? 2) + 2 },
    { name: "Fri", value: stats?.total_analysis_runs ?? 5 },
    { name: "Sat", value: (stats?.total_analysis_runs ?? 3) + 1 },
    { name: "Sun", value: stats?.total_datasets ?? 4 },
  ];

  if (isLoading) return <PageSkeleton />;

  const statCards = [
    { label: "Total Datasets", value: formatNumber(stats?.total_datasets), icon: Database, change: "+12%" },
    { label: "Analyses Run", value: formatNumber(stats?.total_analysis_runs), icon: BarChart3, change: "+8%" },
    { label: "Active Insights", value: formatNumber(runs?.filter((r) => r.status === "completed").length ?? 0), icon: Sparkles, change: "+24%" },
    { label: "Data Processed", value: formatBytes(datasetsData?.items.reduce((a, d) => a + d.file_size_bytes, 0) ?? 0), icon: TrendingUp, change: "+5%" },
  ];

  return (
    <div className="page-container space-y-8">
      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="page-title">
              Welcome back{user?.first_name ? `, ${user.first_name}` : ""}
            </h1>
            <p className="page-subtitle">Here&apos;s an overview of your analytics platform.</p>
          </div>
          <Link to="/chat">
            <Button variant="accent">
              <Bot className="size-4" />
              Ask AI Assistant
            </Button>
          </Link>
        </div>
      </motion.section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.35 }}
          >
            <Card className="transition-shadow hover:shadow-card">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                    <stat.icon className="size-5 text-primary" />
                  </div>
                  <Badge variant="success">{stat.change}</Badge>
                </div>
                <p className="mt-4 text-2xl font-semibold text-foreground">{stat.value}</p>
                <p className="mt-1 text-sm text-muted">{stat.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Activity Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <AreaChart data={chartData} label="Activity" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {quickActions.map((action) => (
              <Link key={action.to} to={action.to}>
                <Button variant={action.variant} className="w-full justify-start">
                  <action.icon className="size-4" />
                  {action.label}
                  <ArrowRight className="ml-auto size-4 opacity-50" />
                </Button>
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Datasets</CardTitle>
            <Link to="/datasets">
              <Button variant="ghost" size="sm">View all</Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {(datasetsData?.items ?? []).length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">No datasets yet</p>
            ) : (
              datasetsData?.items.map((ds) => (
                <Link
                  key={ds.id}
                  to={`/datasets/${ds.id}`}
                  className="flex items-center gap-4 rounded-xl border border-border/60 p-4 transition hover:bg-muted-surface/50 hover:shadow-soft"
                >
                  <div className="flex size-10 items-center justify-center rounded-xl bg-accent/30">
                    <Database className="size-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">{ds.name}</p>
                    <p className="text-xs text-muted">
                      {formatNumber(ds.row_count)} rows · {formatBytes(ds.file_size_bytes)}
                    </p>
                  </div>
                  <span className="text-xs text-muted">{formatDate(ds.created_at)}</span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Analyses</CardTitle>
            <Link to="/history">
              <Button variant="ghost" size="sm">View all</Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {(runs ?? []).slice(0, 5).length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">No analyses yet</p>
            ) : (
              (runs ?? []).slice(0, 5).map((run) => (
                <div
                  key={run.id}
                  className="flex items-center gap-4 rounded-xl border border-border/60 p-4"
                >
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                    <Zap className="size-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium capitalize text-foreground">{run.analysis_type.replace(/_/g, " ")}</p>
                    <p className="text-xs text-muted">{formatDate(run.started_at)}</p>
                  </div>
                  <Badge variant={run.status === "completed" ? "success" : run.status === "failed" ? "danger" : "warning"}>
                    {run.status}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

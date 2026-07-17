import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Database, Activity, Bot, ArrowUpRight, Shield, Clock } from "lucide-react";
import { useDatasets } from "@/features/datasets/hooks";
import { useDashboardStats } from "../hooks";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/features/auth/store";
import { useLlmHistory } from "@/features/llm/hooks";
import { formatDistanceToNow } from "date-fns";

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data: datasets, isLoading: datasetsLoading } = useDatasets(1, 5);
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: history } = useLlmHistory(5, 0);

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-[26px] font-semibold tracking-tight">Welcome back, {user?.first_name || user?.email?.split("@")[0] || "there"}</h1>
          <Badge variant="secondary" className="font-normal">{user?.tenant_id ? "Tenant member" : "No tenant"}</Badge>
        </div>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Secure analytics workspace. All queries are audit-logged, PII-redacted, and tenant-isolated via Row-Level Security.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-[13px] font-medium text-muted-foreground uppercase tracking-wide">Total Datasets</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? <Skeleton className="h-7 w-16" /> : <div className="text-2xl font-semibold">{stats?.total_datasets ?? datasets?.total ?? 0}</div>}
            <p className="text-xs text-muted-foreground mt-1">RLS-isolated per tenant</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-[13px] font-medium text-muted-foreground uppercase tracking-wide">Analysis Runs</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? <Skeleton className="h-7 w-16" /> : <div className="text-2xl font-semibold">{stats?.total_analysis_runs ?? 0}</div>}
            <p className="text-xs text-muted-foreground mt-1">Profiles, correlations, AI insights</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-[13px] font-medium text-muted-foreground uppercase tracking-wide">Security Posture</CardTitle>
            <Shield className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">Secure</div>
            <p className="text-xs text-muted-foreground mt-1">JWT httpOnly • CSRF • Audit logs</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick actions */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Quick actions</CardTitle>
            <CardDescription>Common tasks, all authorization-checked</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild variant="secondary" className="w-full justify-between"><Link to="/datasets">Upload dataset <ArrowUpRight className="h-4 w-4" /></Link></Button>
            <Button asChild variant="outline" className="w-full justify-between"><Link to="/assistant">Ask AI about data <Bot className="h-4 w-4" /></Link></Button>
            <Button asChild variant="outline" className="w-full justify-between"><Link to="/analytics">Run analytics <Activity className="h-4 w-4" /></Link></Button>
          </CardContent>
        </Card>

        {/* Recent datasets */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Recent datasets</CardTitle>
              <CardDescription>Latest 5 from your tenant</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm"><Link to="/datasets">View all</Link></Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {datasetsLoading ? (
                <div className="p-4 space-y-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
              ) : !datasets || datasets.items.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">No datasets yet. Upload to start.</div>
              ) : (
                datasets.items.slice(0, 5).map((ds) => (
                  <div key={ds.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center shrink-0"><Database className="h-4 w-4 text-primary" /></div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{ds.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{formatDistanceToNow(new Date(ds.created_at), { addSuffix: true })}</p>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">{(ds.file_size_bytes / 1024 / 1024).toFixed(2)} MB</div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent LLM queries */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div><CardTitle className="text-base">Recent AI queries</CardTitle><CardDescription>Audit-logged LLM interactions (PII redacted)</CardDescription></div>
          <Button asChild variant="ghost" size="sm"><Link to="/assistant">Open assistant</Link></Button>
        </CardHeader>
        <CardContent>
          {!history || history.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center border border-dashed rounded-lg">No queries yet. Ask about your data in plain English.</div>
          ) : (
            <div className="space-y-3">
              {history.map((h) => (
                <div key={h.id} className="p-3 border rounded-lg bg-muted/20">
                  <p className="text-sm font-medium line-clamp-1">{h.prompt}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">{h.model} • {formatDistanceToNow(new Date(h.created_at), { addSuffix: true })}</span>
                    <Badge variant={h.success ? "success" : "destructive"} className="text-[10px]">{h.success ? "success" : "failed"}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

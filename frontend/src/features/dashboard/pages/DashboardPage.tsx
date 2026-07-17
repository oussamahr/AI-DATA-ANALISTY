import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QueryConsole } from "@/features/llm/components/QueryConsole";
import { Database, Activity, Clock, Loader2 } from "lucide-react";
import { useDatasets } from "@/features/datasets/hooks";
import { useDashboardStats } from "../hooks";

export function DashboardPage() {
  const { data: datasets, isLoading: datasetsLoading } = useDatasets();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();

  const recentDatasets = datasets?.slice(0, 5) || [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Datasets</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : stats?.total_datasets || datasets?.length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Queries Run</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : stats?.queries_run || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg. Query Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
               {statsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : `${stats?.avg_query_time || 0}s`}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">AI Assistant</h2>
          <QueryConsole />
        </div>
        <div className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">Recent Datasets</h2>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {datasetsLoading && <div className="p-4 text-center text-muted-foreground">Loading datasets...</div>}
                {!datasetsLoading && recentDatasets.length === 0 && (
                  <div className="p-4 text-center text-muted-foreground">No datasets uploaded yet.</div>
                )}
                {recentDatasets.map((dataset) => (
                  <div key={dataset.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded bg-primary/10 flex items-center justify-center">
                        <Database className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{dataset.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Uploaded {new Date(dataset.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {(dataset.size_bytes / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
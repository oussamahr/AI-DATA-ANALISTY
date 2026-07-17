import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DatasetUpload } from "../components/DatasetUpload";
import { useDatasets } from "../hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Database, FileWarning, ShieldCheck, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { formatApiError } from "@/lib/api-error";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

export function DatasetsPage() {
  const [page] = useState(1);
  const [search, setSearch] = useState("");
  const { data, isLoading, error, refetch } = useDatasets(page, 50);

  const filtered = data?.items.filter((d) => d.name.toLowerCase().includes(search.toLowerCase())) || [];

  if (error) {
    return <ErrorState message={formatApiError(error).userMessage} onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Datasets" description="Tenant-isolated, RLS-protected datasets. Magic byte + ClamAV verified." actions={<Badge variant="secondary">{data?.total ?? 0} total</Badge>} />

      <DatasetUpload />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-base">Your datasets</CardTitle>
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9 h-9" placeholder="Search by name..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={Database} title={search ? "No matching datasets" : "No datasets yet"} description={search ? "Try another search term" : "Upload your first dataset above. Files stay inside your tenant bucket."} />
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 text-left">
                      <th className="p-3 font-medium">Name</th>
                      <th className="p-3 font-medium">Size</th>
                      <th className="p-3 font-medium">Rows</th>
                      <th className="p-3 font-medium">Status</th>
                      <th className="p-3 font-medium">Uploaded</th>
                      <th className="p-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filtered.map((ds) => (
                      <tr key={ds.id} className="hover:bg-muted/40 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded bg-primary/10 flex items-center justify-center">
                              <Database className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium truncate max-w-[220px]">{ds.name}</p>
                              <p className="text-[11px] text-muted-foreground truncate max-w-[220px]">{ds.description || "No description"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-muted-foreground">{(ds.file_size_bytes / 1024 / 1024).toFixed(2)} MB</td>
                        <td className="p-3 text-muted-foreground">{ds.row_count?.toLocaleString() ?? "—"}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            {ds.contains_pii ? <Badge variant="warning" className="text-[10px]"><FileWarning className="h-3 w-3 mr-1" />PII</Badge> : <Badge variant="success" className="text-[10px]"><ShieldCheck className="h-3 w-3 mr-1" />Safe</Badge>}
                          </div>
                        </td>
                        <td className="p-3 text-muted-foreground text-xs">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDistanceToNow(new Date(ds.created_at), { addSuffix: true })}</span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button asChild variant="ghost" size="sm"><Link to={`/analytics?dataset=${ds.id}`}>Analyze</Link></Button>
                            <Button asChild variant="ghost" size="sm"><Link to={`/visualizations?dataset=${ds.id}`}>Visualize</Link></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

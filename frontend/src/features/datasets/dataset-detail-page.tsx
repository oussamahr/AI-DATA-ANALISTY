import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BarChart3, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSkeleton } from "@/components/ui/skeleton";
import { DataTable, DataTableCell, DataTableRow } from "@/components/ui/table";
import { useDataset } from "@/hooks/use-api";
import { api } from "@/services/api";
import { formatBytes, formatDate, formatNumber, getErrorMessage } from "@/utils/cn";
import type { DatasetProfileResponse } from "@/types";

export function DatasetDetailPage() {
  const { id = "" } = useParams();
  const { data: dataset, isLoading, error } = useDataset(id);
  const [profile, setProfile] = useState<DatasetProfileResponse | null>(null);
  const [profiling, setProfiling] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const runProfile = async () => {
    try {
      setProfiling(true);
      setProfileError(null);
      const result = await api.profileDataset(id, false, false);
      if ("columns" in result) setProfile(result);
    } catch (err) {
      setProfileError(getErrorMessage(err));
    } finally {
      setProfiling(false);
    }
  };

  if (isLoading) return <PageSkeleton />;
  if (error || !dataset) {
    return (
      <div className="page-container">
        <p className="text-danger">{error ? getErrorMessage(error) : "Dataset not found"}</p>
        <Link to="/datasets"><Button variant="outline" className="mt-4">Back to datasets</Button></Link>
      </div>
    );
  }

  return (
    <div className="page-container space-y-6">
      <div className="flex items-start gap-4">
        <Link to="/datasets">
          <Button variant="ghost" size="icon" aria-label="Back">
            <ArrowLeft className="size-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="page-title">{dataset.name}</h1>
          <p className="page-subtitle">{dataset.description || "No description"}</p>
        </div>
        <div className="flex gap-2">
          <Link to={`/analytics?dataset=${id}`}>
            <Button variant="secondary"><BarChart3 className="size-4" />Analyze</Button>
          </Link>
          <Link to={`/visualizations?dataset=${id}`}>
            <Button variant="outline"><Sparkles className="size-4" />Visualize</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Rows", value: formatNumber(dataset.row_count) },
          { label: "File Size", value: formatBytes(dataset.file_size_bytes) },
          { label: "Type", value: dataset.mime_type.split("/").pop()?.toUpperCase() ?? "—" },
          { label: "Created", value: formatDate(dataset.created_at) },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="p-5">
              <p className="text-sm text-muted">{item.label}</p>
              <p className="mt-1 text-xl font-semibold text-foreground">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Column Profile</CardTitle>
          <Button onClick={runProfile} disabled={profiling}>
            {profiling ? <Loader2 className="size-4 animate-spin" /> : "Generate Profile"}
          </Button>
        </CardHeader>
        <CardContent>
          {profileError && <p className="mb-4 text-sm text-danger">{profileError}</p>}
          {!profile ? (
            <p className="py-8 text-center text-sm text-muted">Run profiling to see column statistics</p>
          ) : (
            <DataTable
              columns={[
                { key: "column", header: "Column" },
                { key: "type", header: "Type" },
                { key: "nulls", header: "Nulls" },
                { key: "unique", header: "Unique" },
                { key: "mean", header: "Mean" },
              ]}
            >
              {profile.columns.map((col) => (
                <DataTableRow key={col.column_name}>
                  <DataTableCell className="font-medium">{col.column_name}</DataTableCell>
                  <DataTableCell><Badge variant="secondary">{col.dtype}</Badge></DataTableCell>
                  <DataTableCell>{col.null_percent.toFixed(1)}%</DataTableCell>
                  <DataTableCell>{formatNumber(col.unique_count)}</DataTableCell>
                  <DataTableCell>{col.mean?.toFixed(2) ?? "—"}</DataTableCell>
                </DataTableRow>
              ))}
            </DataTable>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

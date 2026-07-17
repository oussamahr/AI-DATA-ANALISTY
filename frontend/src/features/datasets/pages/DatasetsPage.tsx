import { DatasetUpload } from "@/features/datasets/components/DatasetUpload";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Database, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDatasets } from "../hooks";

export function DatasetsPage() {
  const { data: datasets, isLoading } = useDatasets();

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Datasets</h2>
        <p className="text-muted-foreground mt-1">Manage and upload your data for AI analysis.</p>
      </div>

      <DatasetUpload />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle>Your Datasets</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Search datasets..." />
            </div>
            <Button variant="outline">Filter</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="p-4 font-medium">Name</th>
                  <th className="p-4 font-medium">Size</th>
                  <th className="p-4 font-medium">Rows</th>
                  <th className="p-4 font-medium">Uploaded</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                      Loading datasets...
                    </td>
                  </tr>
                )}
                {!isLoading && (!datasets || datasets.length === 0) && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      No datasets found. Upload one above.
                    </td>
                  </tr>
                )}
                {datasets?.map((dataset) => (
                  <tr key={dataset.id} className="hover:bg-muted/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-primary" />
                        <span className="font-medium">{dataset.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">{(dataset.size_bytes / 1024 / 1024).toFixed(2)} MB</td>
                    <td className="p-4 text-muted-foreground">{dataset.row_count || "—"}</td>
                    <td className="p-4 text-muted-foreground">{new Date(dataset.created_at).toLocaleDateString()}</td>
                    <td className="p-4 text-right">
                      <Button variant="ghost" size="sm">Analyze</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
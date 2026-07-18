import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Database, Plus, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageSkeleton, TableSkeleton } from "@/components/ui/skeleton";
import { SearchInput } from "@/components/ui/search";
import { Pagination } from "@/components/ui/pagination";
import { DataTable, DataTableCell, DataTableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDatasets, useDeleteDataset } from "@/hooks/use-api";
import { formatBytes, formatDate, formatNumber, getErrorMessage } from "@/utils/cn";

const PAGE_SIZE = 10;

export function DatasetsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { data, isLoading, error } = useDatasets(page, PAGE_SIZE);
  const deleteMutation = useDeleteDataset();

  const filtered = useMemo(() => {
    if (!data?.items) return [];
    if (!search.trim()) return data.items;
    const q = search.toLowerCase();
    return data.items.filter((d) => d.name.toLowerCase().includes(q) || d.description.toLowerCase().includes(q));
  }, [data?.items, search]);

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
    } catch {
      /* error handled by mutation state */
    }
  };

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="page-container space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Datasets</h1>
          <p className="page-subtitle">Manage and explore your uploaded datasets</p>
        </div>
        <Link to="/datasets/upload">
          <Button>
            <Plus className="size-4" />
            Upload Dataset
          </Button>
        </Link>
      </div>

      <SearchInput
        placeholder="Search datasets..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        containerClassName="max-w-md"
        aria-label="Search datasets"
      />

      {error && (
        <div className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
          {getErrorMessage(error)}
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={Database}
          title="No datasets found"
          description="Upload your first dataset to start analyzing data with AI-powered insights."
          action={
            <Link to="/datasets/upload">
              <Button>
                <Plus className="size-4" />
                Upload Dataset
              </Button>
            </Link>
          }
        />
      ) : (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <DataTable
              columns={[
                { key: "name", header: "Name" },
                { key: "rows", header: "Rows" },
                { key: "size", header: "Size" },
                { key: "created", header: "Created" },
                { key: "status", header: "Status" },
                { key: "actions", header: "", className: "w-24" },
              ]}
            >
              {filtered.map((ds) => (
                <DataTableRow key={ds.id}>
                  <DataTableCell>
                    <Link to={`/datasets/${ds.id}`} className="font-medium text-primary hover:underline">
                      {ds.name}
                    </Link>
                    {ds.description && <p className="mt-0.5 truncate text-xs text-muted">{ds.description}</p>}
                  </DataTableCell>
                  <DataTableCell>{formatNumber(ds.row_count)}</DataTableCell>
                  <DataTableCell>{formatBytes(ds.file_size_bytes)}</DataTableCell>
                  <DataTableCell className="text-muted">{formatDate(ds.created_at)}</DataTableCell>
                  <DataTableCell>
                    {ds.contains_pii ? <Badge variant="warning">PII</Badge> : <Badge variant="success">Clean</Badge>}
                  </DataTableCell>
                  <DataTableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(ds.id)}
                      aria-label={`Delete ${ds.name}`}
                    >
                      <Trash2 className="size-4 text-danger" />
                    </Button>
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTable>
          </motion.div>

          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      {deleteMutation.isPending && <TableSkeleton rows={0} />}

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete dataset</DialogTitle>
            <DialogDescription>
              This action cannot be undone. All associated analyses will also be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

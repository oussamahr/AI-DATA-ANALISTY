import { useEffect, useRef, useState } from "react";
import { useDatasetStore } from "@/stores/datasetStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { GlassCard } from "@/components/common/GlassCard";
import { formatBytes } from "@/lib/utils";
import { Upload, Database, FileText, HardDrive, Plus } from "lucide-react";

export function DatasetsPage() {
  const { datasets, fetchDatasets, uploadDataset, isLoading } =
    useDatasetStore();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadName, setUploadName] = useState("");
  const [uploadDesc, setUploadDesc] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDatasets();
  }, [fetchDatasets]);

  const handleUpload = async () => {
    if (!uploadFile || !uploadName) return;
    setUploading(true);
    try {
      await uploadDataset(uploadFile, uploadName, uploadDesc, setUploadProgress);
      setUploadOpen(false);
      setUploadName("");
      setUploadDesc("");
      setUploadFile(null);
      setUploadProgress(0);
    } catch {
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-blur-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-[32px] leading-tight font-bold text-ink">
            Datasets
          </h1>
          <p className="text-sm text-ink-dim mt-1.5">
            Manage and explore your uploaded datasets
          </p>
        </div>
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2.5 rounded-lg btn-glow">
              <Plus className="h-4 w-4" />
              Upload Dataset
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-strong text-ink rounded-[var(--radius-lg)] max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display text-lg font-bold text-ink">
                Upload Dataset
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-5 pt-2">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-ink-dim uppercase tracking-wider">
                  Name
                </Label>
                <Input
                  placeholder="My Dataset"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  className="h-11 rounded-lg border-border bg-void text-ink placeholder:text-ink-faint focus-visible:ring-primary focus-visible:border-primary"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-ink-dim uppercase tracking-wider">
                  Description
                </Label>
                <Input
                  placeholder="Optional description"
                  value={uploadDesc}
                  onChange={(e) => setUploadDesc(e.target.value)}
                  className="h-11 rounded-lg border-border bg-void text-ink placeholder:text-ink-faint focus-visible:ring-primary focus-visible:border-primary"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-ink-dim uppercase tracking-wider">
                  File
                </Label>
                <div
                  className="border-2 border-dashed border-border-strong rounded-lg p-10 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploadFile ? (
                    <div>
                      <FileText className="h-10 w-10 mx-auto mb-3 text-primary" />
                      <p className="text-sm font-medium text-ink">
                        {uploadFile.name}
                      </p>
                      <p className="text-xs text-ink-faint font-mono mt-1">
                        {formatBytes(uploadFile.size)}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <Upload className="h-10 w-10 mx-auto mb-3 text-ink-faint" />
                      <p className="text-sm text-ink-dim">
                        Click to select CSV, JSON, Parquet, XLSX, or TSV
                      </p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".csv,.tsv,.xlsx,.xls,.json,.parquet,.feather"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                />
              </div>
              {uploading && (
                <div className="space-y-1">
                  <div className="h-1.5 bg-void-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all rounded-full"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-ink-faint text-right font-mono">
                    {uploadProgress}%
                  </p>
                </div>
              )}
              <Button
                className="w-full h-11 rounded-lg btn-glow"
                onClick={handleUpload}
                disabled={!uploadFile || !uploadName || uploading}
              >
                {uploading ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-16 text-ink-dim">
          <div className="h-8 w-8 border-2 border-border-strong border-t-primary rounded-full animate-spin mx-auto mb-4" />
          Loading datasets...
        </div>
      ) : datasets.length === 0 ? (
        <GlassCard elevation="default" className="text-center py-20">
          <Database className="h-16 w-16 mx-auto mb-5 text-ink-faint opacity-25" />
          <h3 className="font-display text-xl font-bold text-ink mb-2">
            No datasets yet
          </h3>
          <p className="text-sm text-ink-dim mb-6">
            Upload your first dataset to get started
          </p>
          <Button
            onClick={() => setUploadOpen(true)}
            className="gap-2.5 rounded-lg btn-glow"
          >
            <Upload className="h-4 w-4" />
            Upload Dataset
          </Button>
        </GlassCard>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 stagger-children">
          {datasets.map((ds) => (
            <GlassCard key={ds.id} elevation="default" animate={false}>
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-sm font-semibold text-ink leading-snug">{ds.name}</h3>
                <Badge
                  variant="secondary"
                  className="bg-void-2 text-ink-dim border border-border font-mono text-[10px] uppercase"
                >
                  {ds.file_path.split(".").pop()?.toUpperCase()}
                </Badge>
              </div>
              {ds.description && (
                <p className="text-sm text-ink-dim mb-4 line-clamp-2">
                  {ds.description}
                </p>
              )}
              <div className="flex items-center gap-4 text-xs text-ink-faint font-mono">
                <span className="flex items-center gap-1.5">
                  <HardDrive className="h-3.5 w-3.5" />
                  {formatBytes(ds.file_size_bytes)}
                </span>
                {ds.row_count && (
                  <span>{ds.row_count.toLocaleString()} rows</span>
                )}
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}

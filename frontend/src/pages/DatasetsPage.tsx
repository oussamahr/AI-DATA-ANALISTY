import { useEffect, useRef, useState, useMemo } from "react";
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
import { SpecularButton } from "@/components/effects/SpecularButton";
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

  const prefersReducedMotion = useMemo(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

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
    <div className="space-y-6 animate-fade-blur-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-heading">Datasets</h1>
          <p className="page-subheading mt-1">
            Manage and explore your uploaded datasets
          </p>
        </div>
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger asChild>
            <SpecularButton
              size="lg"
              radius={12}
              className="gap-2"
              followMouse={!prefersReducedMotion}
              autoAnimate={false}
            >
              <Plus className="h-4 w-4" />
              Upload Dataset
            </SpecularButton>
          </DialogTrigger>
          <DialogContent className="glass-strong text-ink rounded-[var(--radius-xl)] max-w-md p-0 overflow-hidden">
            <DialogHeader className="px-6 pt-6 pb-0">
              <DialogTitle className="font-display text-lg font-semibold text-ink">
                Upload Dataset
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 p-6 pt-4">
              <div className="space-y-1.5">
                <Label className="text-[12px] font-medium text-ink-dim uppercase tracking-wider">
                  Name
                </Label>
                <Input
                  placeholder="My Dataset"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  className="h-10 rounded-[var(--radius-sm)] border-glass-border bg-void text-ink placeholder:text-ink-faint focus:border-teal focus:ring-1 focus:ring-teal"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] font-medium text-ink-dim uppercase tracking-wider">
                  Description
                </Label>
                <Input
                  placeholder="Optional description"
                  value={uploadDesc}
                  onChange={(e) => setUploadDesc(e.target.value)}
                  className="h-10 rounded-[var(--radius-sm)] border-glass-border bg-void text-ink placeholder:text-ink-faint focus:border-teal focus:ring-1 focus:ring-teal"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] font-medium text-ink-dim uppercase tracking-wider">
                  File
                </Label>
                <div
                  className="border-2 border-dashed border-glass-border-strong rounded-[var(--radius-md)] p-8 text-center cursor-pointer hover:border-teal/40 hover:bg-teal/5 transition-all"
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
                  aria-label="Select file to upload"
                >
                  {uploadFile ? (
                    <div>
                      <FileText className="h-8 w-8 mx-auto mb-2 text-teal" />
                      <p className="text-[13px] font-medium text-ink">
                        {uploadFile.name}
                      </p>
                      <p className="text-[11px] text-ink-faint font-mono mt-1">
                        {formatBytes(uploadFile.size)}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <Upload className="h-8 w-8 mx-auto mb-2 text-ink-faint" />
                      <p className="text-[13px] text-ink-dim">
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
                      className="h-full bg-teal transition-all rounded-full"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-ink-faint text-right font-mono">
                    {uploadProgress}%
                  </p>
                </div>
              )}
              <Button
                className="w-full h-10 btn-glow"
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
          <div className="h-7 w-7 border-2 border-glass-border-strong border-t-teal rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[13px]">Loading datasets...</p>
        </div>
      ) : datasets.length === 0 ? (
        <GlassCard elevation="default" className="text-center py-16">
          <Database className="h-12 w-12 mx-auto mb-4 text-ink-faint opacity-20" />
          <h3 className="font-display text-lg font-semibold text-ink mb-1.5">
            No datasets yet
          </h3>
          <p className="text-[13px] text-ink-dim mb-5">
            Upload your first dataset to get started
          </p>
          <Button
            onClick={() => setUploadOpen(true)}
            className="gap-2 btn-glow"
          >
            <Upload className="h-4 w-4" />
            Upload Dataset
          </Button>
        </GlassCard>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 stagger-children">
          {datasets.map((ds) => (
            <GlassCard key={ds.id} elevation="default" animate={false}>
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-[13px] font-semibold text-ink leading-snug">{ds.name}</h3>
                <Badge variant="secondary" className="font-mono text-[10px] uppercase">
                  {ds.file_path.split(".").pop()?.toUpperCase()}
                </Badge>
              </div>
              {ds.description && (
                <p className="text-[13px] text-ink-dim mb-3 line-clamp-2">
                  {ds.description}
                </p>
              )}
              <div className="flex items-center gap-4 text-[12px] text-ink-faint font-mono">
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

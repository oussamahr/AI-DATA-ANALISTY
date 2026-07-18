import { useRef, useState, type DragEvent } from "react";
import { useNavigate } from "react-router-dom";
import { FileSpreadsheet, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUploadDataset } from "@/hooks/use-api";
import { formatBytes, getErrorMessage } from "@/utils/cn";

export function UploadDatasetPage() {
  const navigate = useNavigate();
  const uploadMutation = useUploadDataset();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const selectFile = (selected: File | undefined) => {
    if (!selected) return;
    setFile(selected);
    if (!name) setName(selected.name.replace(/\.[^.]+$/, ""));
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(false);
    selectFile(event.dataTransfer.files[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file");
      return;
    }
    try {
      setError(null);
      const formData = new FormData();
      formData.append("file", file);
      if (name) formData.append("name", name);
      if (description) formData.append("description", description);
      const result = await uploadMutation.mutateAsync(formData);
      navigate(`/datasets/${result.id}`);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="page-container max-w-2xl space-y-6">
      <div>
        <h1 className="page-title">Upload Dataset</h1>
        <p className="page-subtitle">Import CSV, Excel, or JSON files for analysis</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>File Upload</CardTitle>
          <CardDescription>Drag and drop or click to browse</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger" role="alert">
              {error}
            </div>
          )}

          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragActive(true); }}
            onDragLeave={() => setIsDragActive(false)}
            onDrop={handleDrop}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 transition ${
              isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted-surface/50"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept=".csv,.xls,.xlsx,.json"
              aria-label="Upload file"
              onChange={(e) => selectFile(e.target.files?.[0])}
            />
            <div className="flex size-14 items-center justify-center rounded-2xl bg-accent/30">
              <Upload className="size-7 text-primary" />
            </div>
            <p className="mt-4 text-sm font-medium text-foreground">
              {isDragActive ? "Drop file here" : "Drag & drop your file here"}
            </p>
            <p className="mt-1 text-xs text-muted">CSV, XLS, XLSX, JSON up to 100MB</p>
          </div>

          {file && (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-muted-surface/50 p-4">
              <FileSpreadsheet className="size-8 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{file.name}</p>
                <p className="text-xs text-muted">{formatBytes(file.size)}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setFile(null)} aria-label="Remove file">
                <X className="size-4" />
              </Button>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Dataset name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="My Dataset" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description..." rows={3} />
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate("/datasets")}>Cancel</Button>
            <Button onClick={handleUpload} disabled={!file || uploadMutation.isPending}>
              {uploadMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Upload & Analyze"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

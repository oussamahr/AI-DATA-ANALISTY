import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, File as FileIcon, X, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUploadDataset } from "../hooks";
import { formatApiError } from "@/lib/api-error";
import { toast } from "sonner";

export function DatasetUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const uploadMutation = useUploadDataset();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const f = acceptedFiles[0];
      setFile(f);
      setName(f.name.replace(/\.[^/.]+$/, ""));
      setStatus("idle");
      setProgress(0);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: 100 * 1024 * 1024,
    multiple: false,
    accept: {
      "text/csv": [".csv"],
      "text/tab-separated-values": [".tsv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "application/json": [".json"],
    },
  });

  const handleUpload = async () => {
    if (!file || !name.trim()) {
      toast.error("Name and file are required");
      return;
    }
    setStatus("uploading");
    setErrorMsg("");
    setProgress(0);

    try {
      await uploadMutation.mutateAsync({ file, name: name.trim(), description, onProgress: setProgress });
      setStatus("success");
      setProgress(100);
      toast.success("Dataset uploaded and scanned securely");
    } catch (err: unknown) {
      setStatus("error");
      setErrorMsg(formatApiError(err).userMessage);
    }
  };

  const reset = () => {
    setFile(null);
    setName("");
    setDescription("");
    setStatus("idle");
    setProgress(0);
    setErrorMsg("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Upload dataset</CardTitle>
        <CardDescription>Files are validated for extension, magic bytes, and scanned by ClamAV. Tenant-isolated S3 storage.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!file ? (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
              isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex justify-center mb-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <UploadCloud className="h-5 w-5 text-primary" />
              </div>
            </div>
            <p className="font-medium text-sm">Drag & drop or click to browse</p>
            <p className="text-xs text-muted-foreground mt-1">CSV, TSV, XLSX, JSON, Parquet, Feather • Max 100MB</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 border rounded-lg">
              <div className="h-9 w-9 rounded bg-primary/10 flex items-center justify-center shrink-0">
                <FileIcon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB • {file.type || "unknown type"}</p>
              </div>
              {status === "idle" && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={reset}>
                  <X className="h-4 w-4" />
                </Button>
              )}
              {status === "success" && <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-1" />}
              {status === "error" && <AlertCircle className="h-5 w-5 text-destructive mt-1" />}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Dataset name *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Q3_sales_2024" required />
              </div>
              <div className="space-y-2 sm:col-span-1">
                <Label>Description</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description details</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this dataset about? This is sanitized against HTML/SQL injection." rows={2} />
            </div>

            {status === "uploading" && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Uploading & scanning...</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {status === "error" && <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">{errorMsg}</p>}

            {status === "idle" && (
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={reset}>Cancel</Button>
                <Button onClick={handleUpload} disabled={uploadMutation.isPending}>Upload securely</Button>
              </div>
            )}

            {status === "success" && (
              <div className="flex justify-end">
                <Button onClick={reset} variant="outline">Upload another</Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

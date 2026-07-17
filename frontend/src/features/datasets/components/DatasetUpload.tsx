import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, File as FileIcon, X, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

import { useUploadDataset } from "../hooks";

export function DatasetUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  
  const uploadDataset = useUploadDataset();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setStatus("idle");
      setProgress(0);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/json': ['.json']
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    multiple: false
  });

  const handleUpload = async () => {
    if (!file) return;
    setStatus("uploading");
    setErrorMsg("");
    setProgress(0);
    
    try {
      await uploadDataset.mutateAsync({
        file,
        onProgress: (p) => setProgress(p)
      });
      setStatus("success");
      setProgress(100);
    } catch (error: any) {
      setStatus("error");
      setErrorMsg(error.response?.data?.detail || error.message || "Failed to upload dataset");
    }
  };

  const removeFile = () => {
    setFile(null);
    setStatus("idle");
    setProgress(0);
  };

  return (
    <Card>
      <CardContent className="p-6">
        {!file ? (
          <div 
            {...getRootProps()} 
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
              isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <UploadCloud className="h-6 w-6 text-primary" />
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-1">Upload Dataset</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Drag & drop your CSV or JSON file here, or click to browse
            </p>
            <Button variant="outline" size="sm">Select File</Button>
            <p className="text-xs text-muted-foreground mt-4">Max file size: 50MB</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 border rounded-lg">
              <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center shrink-0">
                <FileIcon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              {status === "idle" && (
                <Button variant="ghost" size="icon" onClick={removeFile}>
                  <X className="h-4 w-4" />
                </Button>
              )}
              {status === "success" && <CheckCircle2 className="h-5 w-5 text-green-500" />}
              {status === "error" && <AlertCircle className="h-5 w-5 text-destructive" />}
            </div>

            {status === "uploading" && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Uploading...</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}

            {status === "error" && (
              <p className="text-sm text-destructive">{errorMsg}</p>
            )}

            {status === "idle" && (
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={removeFile}>Cancel</Button>
                <Button onClick={handleUpload}>Upload to AI Analyst</Button>
              </div>
            )}
            
            {status === "success" && (
              <div className="flex justify-end">
                <Button onClick={removeFile} variant="outline">Upload Another</Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
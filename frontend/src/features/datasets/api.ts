import { apiClient } from "@/lib/api-client";
import type { Dataset, DatasetListResponse, DatasetPreview, UploadDatasetParams } from "./types";

const ALLOWED_EXTENSIONS = [".csv", ".tsv", ".xlsx", ".xls", ".json", ".parquet", ".feather"];
const MAX_SIZE_MB = 100;

export function validateFileClient(file: File): string | null {
  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return `File type ${ext} not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`;
  }
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return `File exceeds ${MAX_SIZE_MB}MB limit`;
  }
  return null;
}

export const datasetApi = {
  list: async (page = 1, pageSize = 50): Promise<DatasetListResponse> => {
    const res = await apiClient.get<DatasetListResponse>("/datasets/", { params: { page, page_size: pageSize } });
    return res.data;
  },

  get: async (id: string): Promise<Dataset> => {
    const res = await apiClient.get<Dataset>(`/datasets/${id}`);
    return res.data;
  },

  upload: async ({ file, name, description, onProgress }: UploadDatasetParams): Promise<Dataset> => {
    const err = validateFileClient(file);
    if (err) throw new Error(err);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", name);
    formData.append("description", description || "");

    const res = await apiClient.post<Dataset>("/datasets/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded * 100) / e.total));
        }
      },
    });
    return res.data;
  },

  preview: async (datasetId: string): Promise<DatasetPreview> => {
    const res = await apiClient.get<DatasetPreview>(`/visualizations/preview/${datasetId}`);
    return res.data;
  },
};

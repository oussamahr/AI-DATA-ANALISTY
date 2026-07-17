import { apiClient } from "@/lib/api-client";

export interface Dataset {
  id: string;
  name: string;
  size_bytes: number;
  row_count?: number;
  created_at: string;
  status: string;
}

export const datasetApi = {
  list: async (): Promise<Dataset[]> => {
    const response = await apiClient.get<Dataset[]>("/datasets/");
    return response.data;
  },
  
  upload: async (file: File, onProgress?: (progress: number) => void): Promise<Dataset> => {
    const formData = new FormData();
    formData.append("file", file);
    
    const response = await apiClient.post<Dataset>("/datasets/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      }
    });
    return response.data;
  }
};
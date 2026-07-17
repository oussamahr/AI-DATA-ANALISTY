export interface Dataset {
  id: string;
  name: string;
  description: string;
  file_size_bytes: number;
  mime_type: string;
  row_count: number | null;
  contains_pii: boolean;
  owner_id: string;
  tenant_id: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DatasetListResponse {
  items: Dataset[];
  total: number;
  page: number;
  page_size: number;
}

export interface UploadDatasetParams {
  file: File;
  name: string;
  description?: string;
  onProgress?: (progress: number) => void;
}

export interface DatasetPreview {
  dataset_id: string;
  dataset_name: string;
  row_count: number;
  column_count: number;
  charts: Array<{
    chart_type: string;
    title: string;
    data: Record<string, unknown>;
  }>;
}

export interface ColumnProfile {
  column_name: string;
  dtype: string;
  null_count: number;
  total_count: number;
  null_percent: number;
  unique_count: number;
  unique_percent: number;
  min_val: string | null;
  max_val: string | null;
  mean: number | null;
  median: number | null;
  std: number | null;
  top_values: Array<Record<string, unknown>>;
  histogram: Array<Record<string, unknown>>;
}

export interface DatasetProfile {
  dataset_id: string;
  dataset_name: string;
  row_count: number;
  column_count: number;
  columns: ColumnProfile[];
  generated_at: string;
}

export interface CorrelationResult {
  column_1: string;
  column_2: string;
  correlation: number;
}

export interface CorrelationResponse {
  dataset_id: string;
  numeric_columns: string[];
  correlations: CorrelationResult[];
  matrix: number[][];
}

export interface InsightItem {
  type: string;
  severity: string;
  title: string;
  description: string;
  details: Record<string, unknown>;
  recommendation: string | null;
}

export interface AIInsightResponse {
  dataset_id: string;
  dataset_name: string;
  summary: string;
  insights: InsightItem[];
  generated_at: string;
}

export interface AnalysisRun {
  id: string;
  dataset_id: string;
  analysis_type: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
}

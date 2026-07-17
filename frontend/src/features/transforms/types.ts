export interface Transform {
  id: string;
  dataset_id: string;
  transform_type: string;
  name: string;
  config: Record<string, unknown>;
  applied_order: number;
  created_at: string;
}

export type TransformType = "impute" | "remove_outliers" | "cast" | "filter" | "rename" | "drop" | "normalize" | "encode";

export interface DashboardStats {
  total_datasets: number;
  total_analysis_runs: number;
  queries_run?: number;
  avg_query_time?: number;
}

export interface RecentActivity {
  id: string;
  type: string;
  dataset_id?: string;
  created_at: string;
}

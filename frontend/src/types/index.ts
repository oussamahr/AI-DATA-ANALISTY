export interface UserResponse {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_verified: boolean;
  is_active: boolean;
  is_superuser?: boolean;
  role_id: string | null;
  tenant_id: string | null;
  last_login_at: string | null;
}

export interface DatasetResponse {
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
  items: DatasetResponse[];
  total: number;
  page: number;
  page_size: number;
}

export interface AnalyticsStats {
  total_datasets: number;
  total_analysis_runs: number;
}

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
  top_values: Record<string, unknown>[];
  histogram: Record<string, unknown>[];
}

export interface DatasetProfileResponse {
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

export interface ReportSection {
  title: string;
  content: string | Record<string, unknown> | unknown[];
  type: string;
}

export interface AnalysisReport {
  dataset_id: string;
  dataset_name: string;
  row_count: number;
  column_count: number;
  generated_at: string;
  profile: ColumnProfile[];
  correlations: CorrelationResult[] | null;
  distributions: Record<string, unknown>[] | null;
  ai_insights: InsightItem[] | null;
  sections: ReportSection[];
}

export interface AnalysisRunResponse {
  id: string;
  dataset_id: string;
  analysis_type: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
}

export interface TaskResponse {
  run_id: string;
  status: string;
  message: string;
}

export interface BarChartData {
  chart_type: string;
  title: string;
  labels: string[];
  datasets: {
    label: string;
    data: (number | string | null)[];
    border_color?: string;
    background_color?: string | string[];
  }[];
}

export interface HistogramData {
  chart_type: string;
  title: string;
  bins: Record<string, unknown>[];
  column: string;
}

export interface ScatterData {
  chart_type: string;
  title: string;
  x_column: string;
  y_column: string;
  points: { x: number; y: number; label?: string }[];
}

export interface LineData {
  chart_type: string;
  title: string;
  series: { label: string; data: { x: string | number; y: number }[] }[];
}

export interface HeatmapData {
  chart_type: string;
  title: string;
  x_labels: string[];
  y_labels: string[];
  cells: { x: string; y: string; value: number }[];
}

export interface PieData {
  chart_type: string;
  title: string;
  slices: { label: string; value: number; percent: number }[];
}

export interface BoxData {
  chart_type: string;
  title: string;
  statistics: Record<string, unknown>[];
}

export interface DatasetPreview {
  dataset_id: string;
  dataset_name: string;
  row_count: number;
  column_count: number;
  charts: { chart_type: string; title: string; data: Record<string, unknown> }[];
}

export interface LLMQueryResponse {
  id: string;
  response: string;
  model: string;
  tokens_prompt: number;
  tokens_completion: number;
  duration_ms: number | null;
  created_at: string;
}

export interface LLMQueryHistoryItem {
  id: string;
  prompt: string;
  response: string | null;
  model: string;
  success: boolean;
  created_at: string;
}

export interface AdminStats {
  total_users: number;
  total_tenants: number;
}

export interface RoleResponse {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  is_system: boolean;
  created_at: string;
}

export interface MessageResponse {
  message: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  csrf_token?: string | null;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  firstName: string;
  email: string;
  password: string;
}

export interface ProfileFormData {
  first_name: string;
  last_name: string;
}

export interface PasswordChangeFormData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

// ==================== Python Code Generation ====================

export interface PythonCodeRequest {
  task_description: string;
  libraries?: string[];
}

export interface PythonCodeResponse {
  code: string;
  description: string;
  dependencies: string[];
  expected_outputs: string[];
}

export interface AnalysisPipelineRequest {
  analysis_goals: string;
  target_column?: string;
}

export interface VisualizationCodeRequest {
  chart_type: string;
  columns: string[];
  chart_config?: Record<string, unknown>;
}

export interface StatisticalAnalysisRequest {
  analysis_type: string;
  columns: string[];
  hypothesis?: string;
}

// ==================== SQL Generation with Execution ====================

export interface SQLWithExecutionResponse {
  sql: string;
  explanation: string;
  is_safe: boolean;
  estimated_rows: number;
  columns: string[];
  execution_plan: Record<string, unknown>;
  safety_checks: Record<string, boolean>;
  parameterized_version: string;
}

// ==================== Dashboard Explanations ====================

export interface DashboardExplainRequest {
  dashboard_spec: Record<string, unknown>;
  audience?: string;
}

export interface DashboardExplanationResponse {
  purpose: string;
  kpi_explanations: Record<string, unknown>[];
  chart_walkthrough: Record<string, unknown>[];
  usage_guide: string;
  limitations: string[];
}

export interface ChartInterpretRequest {
  chart_config: Record<string, unknown>;
  chart_data: Record<string, unknown>;
  business_context?: string;
}

export interface ChartInterpretationResponse {
  what_it_shows: string;
  key_observations: string[];
  business_implications: string[];
  follow_up_questions: string[];
  caveats: string[];
}

// ==================== Business Insights ====================

export interface BusinessInsightsRequest {
  business_domain?: string;
  key_questions?: string[];
  time_period?: string;
}

export interface BusinessInsightsResponse {
  insights: BusinessInsight[];
  summary: string;
  key_metrics_table: KeyMetric[];
  strategic_themes: string[];
}

export interface BusinessInsight {
  category: string;
  title: string;
  finding: string;
  evidence: string;
  impact: "high" | "medium" | "low";
  confidence: number;
  recommendation: string;
  priority: "immediate" | "short_term" | "strategic";
  estimated_impact?: string;
  owner?: string;
  related_metrics?: string[];
}

export interface KeyMetric {
  metric: string;
  current: number;
  trend: "up" | "down" | "stable";
  benchmark: number;
}

// ==================== Forecasting Suggestions ====================

export interface ForecastingSuggestionsRequest {
  target_columns?: string[];
  business_context?: string;
  forecast_horizon?: string;
}

export interface ForecastingSuggestion {
  target_column: string;
  recommended_method: string;
  reason: string;
  seasonality: string;
  trend_type: string;
  data_requirements: {
    min_periods: number;
    preferred_periods: number;
    missing_data_tolerance: string;
  };
  configuration: Record<string, unknown>;
  validation_strategy: string;
  expected_accuracy: string;
  caveats: string[];
  alternative_methods: string[];
}

export interface ForecastingSuggestionsResponse {
  recommendations: ForecastingSuggestion[];
  general_guidance: string;
  data_prep_steps: string[];
}

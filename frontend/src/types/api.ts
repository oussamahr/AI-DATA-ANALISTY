export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_verified: boolean;
  is_active: boolean;
  tenant_id: string | null;
  role?: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface Dataset {
  id: string;
  name: string;
  description: string;
  file_path: string;
  file_size_bytes: number;
  mime_type: string;
  row_count: number | null;
  column_definitions: string;
  contains_pii: boolean;
  owner_id: string;
  tenant_id: string;
  created_at: string;
}

export interface LLMQuery {
  id: string;
  prompt: string;
  response: string;
  model: string;
  tokens_prompt: number;
  tokens_completion: number;
  duration_ms: number;
  success: boolean;
  created_at: string;
}

export interface AnalysisRun {
  id: string;
  dataset_id: string;
  run_type: string;
  status: string;
  created_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

export interface DashboardStats {
  total_users: number;
  total_datasets: number;
  total_queries: number;
  storage_used_bytes: number;
}

export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  is_verified: boolean
  is_active: boolean
  is_superuser?: boolean
  role_id?: string | null
  tenant_id?: string | null
  last_login_at?: string | null
}

export interface TokenResponse {
  access_token: string
  refresh_token?: string
  csrf_token?: string
}

export interface Dataset {
  id: string
  name: string
  description: string
  file_size_bytes: number
  mime_type: string
  row_count: number | null
  contains_pii: boolean
  owner_id: string
  tenant_id: string
  parent_id: string | null
  created_at: string
  updated_at: string
}

export interface DatasetListResponse {
  items: Dataset[]
  total: number
  page: number
  page_size: number
}

export interface LLMQueryResponse {
  id: string
  prompt: string
  response: string
  model: string
  success: boolean
  tokens_prompt?: number
  tokens_completion?: number
  created_at: string
}

export interface LLMQueryRequest {
  prompt: string
  dataset_id?: string
}

export interface AnalyticsProfile {
  id: string
  dataset_id: string
  summary: Record<string, unknown>
  statistics: Record<string, number>
  correlations?: Record<string, Record<string, number>>
  insights?: string[]
  created_at: string
}

export interface Visualization {
  id: string
  name: string
  type: 'bar' | 'line' | 'area' | 'pie' | 'histogram' | 'scatter'
  dataset_id: string
  config: Record<string, unknown>
  created_at: string
}

export interface AdminStats {
  total_users: number
  total_datasets: number
  total_analyses: number
  storage_used: string
  active_users: number
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

export interface ApiError {
  detail: string
  message?: string
}

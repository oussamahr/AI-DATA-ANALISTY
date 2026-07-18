import axios from 'axios'
import type {
  User,
  Dataset,
  DatasetListResponse,
  LLMQueryResponse,
  LLMQueryRequest,
  AnalyticsProfile,
  Visualization,
  AdminStats,
} from '@/types/api'

const API_BASE = '/api'

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.detail || error.response?.data?.message || error.message || 'Request failed'
    return Promise.reject(new Error(message))
  }
)

// Auth
export const authApi = {
  register: (data: { first_name: string; email: string; password: string }) =>
    api.post<User>('/auth/register', data).then((r) => r.data),

  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data).then((r) => r.data),

  logout: () => api.post('/auth/logout'),

  getMe: () => api.get<User>('/auth/me').then((r) => r.data),

  updateProfile: (data: { first_name?: string; last_name?: string }) =>
    api.patch<User>('/auth/me', data).then((r) => r.data),

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }).then((r) => r.data),

  resetPassword: (token: string, new_password: string) =>
    api.post('/auth/reset-password', { token, new_password }).then((r) => r.data),
}

// Datasets
export const datasetsApi = {
  list: (page = 1, pageSize = 50) =>
    api.get<DatasetListResponse>(`/datasets?page=${page}&page_size=${pageSize}`).then((r) => r.data),

  get: (id: string) => api.get<Dataset>(`/datasets/${id}`).then((r) => r.data),

  upload: (formData: FormData) =>
    api.post<Dataset>('/datasets/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data),

  delete: (id: string) => api.delete(`/datasets/${id}`),
}

// LLM / AI Chat
export const llmApi = {
  query: (data: LLMQueryRequest) =>
    api.post<LLMQueryResponse>('/llm/query', data).then((r) => r.data),

  getHistory: (limit = 50, offset = 0) =>
    api.get<LLMQueryResponse[]>(`/llm/history?limit=${limit}&offset=${offset}`).then((r) => r.data),
}

// Analytics
export const analyticsApi = {
  profile: (datasetId: string) =>
    api.post<AnalyticsProfile>(`/analytics/profile/${datasetId}`).then((r) => r.data),

  getProfile: (datasetId: string) =>
    api.get<AnalyticsProfile>(`/analytics/profile/${datasetId}`).then((r) => r.data),

  correlate: (datasetId: string) =>
    api.post(`/analytics/correlate/${datasetId}`).then((r) => r.data),

  analyze: (datasetId: string) =>
    api.post(`/analytics/analyze/${datasetId}`).then((r) => r.data),

  getReport: (datasetId: string) =>
    api.get(`/analytics/report/${datasetId}`).then((r) => r.data),
}

// Visualizations
export const visualizationsApi = {
  list: () => api.get<Visualization[]>('/visualizations').then((r) => r.data),

  create: (data: Omit<Visualization, 'id' | 'created_at'>) =>
    api.post<Visualization>('/visualizations', data).then((r) => r.data),

  preview: (datasetId: string) =>
    api.get(`/visualizations/preview/${datasetId}`).then((r) => r.data),
}

// Admin
export const adminApi = {
  getStats: () => api.get<AdminStats>('/admin/stats').then((r) => r.data),

  getUsers: () => api.get<User[]>('/admin/users').then((r) => r.data),
}

export default api

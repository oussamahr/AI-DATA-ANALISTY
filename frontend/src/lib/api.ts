const API_BASE = "/api";

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

class ApiClient {
  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = "GET", body, headers = {} } = options;

    const config: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      credentials: "include",
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    const res = await fetch(`${API_BASE}${endpoint}`, config);

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: "Request failed" }));
      throw new Error(error.detail || error.message || `HTTP ${res.status}`);
    }

    if (res.status === 204) return undefined as T;
    return res.json();
  }

  // Auth
  async login(email: string, password: string) {
    return this.request<void>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
  }

  async register(firstName: string, email: string, password: string) {
    return this.request<UserResponse>("/auth/register", {
      method: "POST",
      body: { email, password, first_name: firstName, last_name: "" },
    });
  }

  async forgotPassword(email: string) {
    return this.request<{ message: string }>("/auth/forgot-password", {
      method: "POST",
      body: { email },
    });
  }

  async getMe() {
    return this.request<UserResponse>("/auth/me");
  }

  async logout() {
    return this.request<void>("/auth/logout", { method: "POST" });
  }

  // Datasets
  async getDatasets() {
    return this.request<DatasetResponse[]>("/datasets");
  }

  async uploadDataset(formData: FormData) {
    const res = await fetch(`${API_BASE}/datasets/upload`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: "Upload failed" }));
      throw new Error(error.detail || error.message || "Upload failed");
    }
    return res.json();
  }

  async deleteDataset(id: string) {
    return this.request<{ message: string }>(`/datasets/${id}`, { method: "DELETE" });
  }

  // Analytics
  async getAnalytics(datasetId: string) {
    return this.request<AnalyticsResult>(`/analytics/${datasetId}`);
  }

  async runAnalysis(datasetId: string, config: AnalysisConfig) {
    return this.request<AnalyticsResult>(`/analytics/${datasetId}/run`, {
      method: "POST",
      body: config,
    });
  }

  // Visualizations
  async getVisualizations() {
    return this.request<Visualization[]>("/visualizations");
  }

  async createVisualization(data: CreateVisualization) {
    return this.request<Visualization>("/visualizations", { method: "POST", body: data });
  }

  // Transforms
  async getTransforms() {
    return this.request<Transform[]>("/transforms");
  }

  async runTransform(datasetId: string, config: TransformConfig) {
    return this.request<TransformResult>(`/transforms/${datasetId}/run`, {
      method: "POST",
      body: config,
    });
  }

  // LLM
  async llmQuery(prompt: string, datasetId?: string) {
    return this.request<LLMResponse>("/llm/query", {
      method: "POST",
      body: { prompt, datasetId },
    });
  }

  async getLLMHistory() {
    return this.request<LLMQuery[]>("/llm/history");
  }

  // Admin
  async getUsers() {
    return this.request<UserResponse[]>("/admin/users");
  }

  async updateUserRole(userId: string, role: string) {
    return this.request<UserResponse>(`/admin/users/${userId}/role`, {
      method: "PUT",
      body: { role },
    });
  }

  async getSystemStats() {
    return this.request<SystemStats>("/admin/stats");
  }
}

export const api = new ApiClient();

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
  description?: string;
  rows: number;
  columns: number;
  fileSize: string;
  format: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsResult {
  id: string;
  datasetId: string;
  summary: Record<string, unknown>;
  statistics: Record<string, number>;
  correlations?: Record<string, Record<string, number>>;
  insights: string[];
}

export interface AnalysisConfig {
  type: "descriptive" | "predictive" | "diagnostic";
  columns?: string[];
  parameters?: Record<string, unknown>;
}

export interface Visualization {
  id: string;
  name: string;
  type: string;
  datasetId: string;
  config: Record<string, unknown>;
  createdAt: string;
}

export interface CreateVisualization {
  name: string;
  type: string;
  datasetId: string;
  config: Record<string, unknown>;
}

export interface Transform {
  id: string;
  name: string;
  type: string;
  status: "pending" | "running" | "completed" | "failed";
  createdAt: string;
}

export interface TransformConfig {
  type: "normalize" | "aggregate" | "filter" | "pivot" | "join";
  parameters: Record<string, unknown>;
}

export interface TransformResult {
  id: string;
  rowsAffected: number;
  preview: Record<string, unknown>[];
}

export interface LLMResponse {
  answer: string;
  sources?: string[];
  confidence: number;
}

export interface LLMQuery {
  id: string;
  prompt: string;
  response: string;
  datasetId?: string;
  createdAt: string;
}

export interface SystemStats {
  totalUsers: number;
  totalDatasets: number;
  totalAnalyses: number;
  storageUsed: string;
  activeUsers: number;
}

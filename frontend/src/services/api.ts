import axios, { type AxiosError, type AxiosInstance } from "axios";
import type {
  AdminStats,
  AIInsightResponse,
  AnalysisReport,
  AnalysisRunResponse,
  AnalyticsStats,
  BarChartData,
  BoxData,
  CorrelationResponse,
  DatasetListResponse,
  DatasetPreview,
  DatasetProfileResponse,
  DatasetResponse,
  HeatmapData,
  HistogramData,
  LineData,
  LLMQueryHistoryItem,
  LLMQueryResponse,
  MessageResponse,
  PieData,
  RoleResponse,
  ScatterData,
  TaskResponse,
  TokenResponse,
  UserResponse,
} from "@/types";

const API_BASE = "/api";

interface ApiErrorBody {
  detail?: string | { msg: string }[];
  message?: string;
}

function extractErrorMessage(error: AxiosError<ApiErrorBody>): string {
  const data = error.response?.data;
  if (!data) return error.message || "Request failed";
  if (typeof data.detail === "string") return data.detail;
  if (Array.isArray(data.detail)) return data.detail.map((d) => d.msg).join(", ");
  return data.message || `HTTP ${error.response?.status ?? "error"}`;
}

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE,
      withCredentials: true,
      headers: { "Content-Type": "application/json" },
    });

    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<ApiErrorBody>) => {
        const original = error.config;
        if (
          error.response?.status === 401 &&
          original &&
          !original.url?.includes("/auth/login") &&
          !original.url?.includes("/auth/refresh")
        ) {
          try {
            await this.client.post<TokenResponse>("/auth/refresh");
            return this.client.request(original);
          } catch {
            window.dispatchEvent(new CustomEvent("auth:logout"));
          }
        }
        return Promise.reject(new Error(extractErrorMessage(error)));
      },
    );
  }

  async login(email: string, password: string) {
    await this.client.post<TokenResponse>("/auth/login", { email, password });
  }

  async register(firstName: string, email: string, password: string) {
    const { data } = await this.client.post<UserResponse>("/auth/register", {
      email,
      password,
      first_name: firstName,
      last_name: "",
    });
    return data;
  }

  async forgotPassword(email: string) {
    const { data } = await this.client.post<MessageResponse>("/auth/forgot-password", { email });
    return data;
  }

  async getMe() {
    const { data } = await this.client.get<UserResponse>("/auth/me");
    return data;
  }

  async updateMe(firstName: string, lastName: string) {
    const { data } = await this.client.patch<UserResponse>("/auth/me", {
      first_name: firstName,
      last_name: lastName,
    });
    return data;
  }

  async changePassword(currentPassword: string, newPassword: string) {
    const { data } = await this.client.post<MessageResponse>("/auth/change-password", {
      current_password: currentPassword,
      new_password: newPassword,
    });
    return data;
  }

  async logout() {
    await this.client.post<MessageResponse>("/auth/logout");
  }

  async getDatasets(page = 1, pageSize = 50) {
    const { data } = await this.client.get<DatasetListResponse>("/datasets", {
      params: { page, page_size: pageSize },
    });
    return data;
  }

  async getDataset(id: string) {
    const { data } = await this.client.get<DatasetResponse>(`/datasets/${id}`);
    return data;
  }

  async uploadDataset(formData: FormData) {
    const { data } = await this.client.post<DatasetResponse>("/datasets/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  }

  async deleteDataset(id: string) {
    const { data } = await this.client.delete<MessageResponse>(`/datasets/${id}`);
    return data;
  }

  async getAnalyticsStats() {
    const { data } = await this.client.get<AnalyticsStats>("/analytics/stats");
    return data;
  }

  async profileDataset(datasetId: string, force = false, asyncMode = false) {
    const { data } = await this.client.post<DatasetProfileResponse | TaskResponse>(
      `/analytics/profile/${datasetId}`,
      null,
      { params: { force, async: asyncMode } },
    );
    return data;
  }

  async getProfile(datasetId: string) {
    const { data } = await this.client.get<DatasetProfileResponse>(`/analytics/profile/${datasetId}`);
    return data;
  }

  async correlateDataset(datasetId: string, asyncMode = false) {
    const { data } = await this.client.post<CorrelationResponse | TaskResponse>(
      `/analytics/correlate/${datasetId}`,
      null,
      { params: { async: asyncMode } },
    );
    return data;
  }

  async generateInsights(datasetId: string, asyncMode = false) {
    const { data } = await this.client.post<AIInsightResponse | TaskResponse>(
      `/analytics/insights/${datasetId}`,
      null,
      { params: { async: asyncMode } },
    );
    return data;
  }

  async getInsights(datasetId: string) {
    const { data } = await this.client.get<AIInsightResponse>(`/analytics/insights/${datasetId}`);
    return data;
  }

  async analyzeDataset(datasetId: string, asyncMode = false) {
    const { data } = await this.client.post<AnalysisReport | TaskResponse>(
      `/analytics/analyze/${datasetId}`,
      null,
      { params: { async: asyncMode } },
    );
    return data;
  }

  async getReport(datasetId: string) {
    const { data } = await this.client.get<AnalysisReport>(`/analytics/report/${datasetId}`);
    return data;
  }

  async listRuns(datasetId?: string) {
    const { data } = await this.client.get<AnalysisRunResponse[]>("/analytics/runs", {
      params: datasetId ? { dataset_id: datasetId } : undefined,
    });
    return data;
  }

  async getRun(runId: string) {
    const { data } = await this.client.get<AnalysisRunResponse>(`/analytics/runs/${runId}`);
    return data;
  }

  async getDatasetPreview(datasetId: string) {
    const { data } = await this.client.get<DatasetPreview>(`/visualizations/preview/${datasetId}`);
    return data;
  }

  async renderBarChart(datasetId: string, column: string, limit = 20) {
    const { data } = await this.client.post<BarChartData>("/visualizations/bar", {
      dataset_id: datasetId,
      column,
      limit,
    });
    return data;
  }

  async renderHistogram(datasetId: string, column: string, bins = 20) {
    const { data } = await this.client.post<HistogramData>("/visualizations/histogram", {
      dataset_id: datasetId,
      column,
      bins,
    });
    return data;
  }

  async renderScatter(datasetId: string, xColumn: string, yColumn: string) {
    const { data } = await this.client.post<ScatterData>("/visualizations/scatter", {
      dataset_id: datasetId,
      x_column: xColumn,
      y_column: yColumn,
    });
    return data;
  }

  async renderLine(datasetId: string, xColumn: string, yColumn: string) {
    const { data } = await this.client.post<LineData>("/visualizations/line", {
      dataset_id: datasetId,
      x_column: xColumn,
      y_column: yColumn,
    });
    return data;
  }

  async renderHeatmap(datasetId: string, xColumn: string, yColumn: string) {
    const { data } = await this.client.post<HeatmapData>("/visualizations/heatmap", {
      dataset_id: datasetId,
      x_column: xColumn,
      y_column: yColumn,
    });
    return data;
  }

  async renderPieChart(datasetId: string, column: string) {
    const { data } = await this.client.post<PieData>("/visualizations/pie", {
      dataset_id: datasetId,
      column,
    });
    return data;
  }

  async renderBoxPlot(datasetId: string, column: string) {
    const { data } = await this.client.post<BoxData>("/visualizations/box", {
      dataset_id: datasetId,
      column,
    });
    return data;
  }

  async renderGroupedBar(datasetId: string, valueColumn: string, groupColumn: string, agg = "mean") {
    const { data } = await this.client.post<BarChartData>("/visualizations/grouped-bar", {
      dataset_id: datasetId,
      value_column: valueColumn,
      group_column: groupColumn,
      agg,
    });
    return data;
  }

  async llmQuery(prompt: string, datasetId?: string) {
    const { data } = await this.client.post<LLMQueryResponse>("/llm/query", {
      prompt,
      dataset_id: datasetId,
    });
    return data;
  }

  async chatAboutDataset(datasetId: string, message: string, conversationId?: string) {
    const { data } = await this.client.post<{
      conversation_id: string;
      response: string;
      model: string;
      provider: string;
      usage: { prompt_tokens: number; completion_tokens: number };
    }>(`/ai/chat/${datasetId}`, {
      message,
      conversation_id: conversationId,
    });
    return data;
  }

  async getChatHistory(conversationId: string) {
    const { data } = await this.client.get<any[]>(`/ai/chat/history/${conversationId}`);
    return data;
  }

  async listConversations(datasetId: string) {
    const { data } = await this.client.get<any[]>(`/ai/chat/conversations/${datasetId}`);
    return data;
  }

  async getLLMHistory(limit = 50, offset = 0) {
    const { data } = await this.client.get<LLMQueryHistoryItem[]>("/llm/history", {
      params: { limit, offset },
    });
    return data;
  }

  async getUsers(limit = 100, offset = 0) {
    const { data } = await this.client.get<UserResponse[]>("/admin/users", {
      params: { limit, offset },
    });
    return data;
  }

  async getSystemStats() {
    const { data } = await this.client.get<AdminStats>("/admin/stats");
    return data;
  }

  async listRoles() {
    const { data } = await this.client.get<RoleResponse[]>("/roles");
    return data;
  }

  async assignRole(roleId: string, userId: string) {
    const { data } = await this.client.post<UserResponse>(`/roles/${roleId}/assign/${userId}`);
    return data;
  }

  async getTenantMembers() {
    const { data } = await this.client.get<UserResponse[]>("/tenants/members");
    return data;
  }
}

export const api = new ApiService();

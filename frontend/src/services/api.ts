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
  PythonCodeRequest,
  PythonCodeResponse,
  AnalysisPipelineRequest,
  VisualizationCodeRequest,
  StatisticalAnalysisRequest,
  SQLWithExecutionResponse,
  DashboardExplainRequest,
  DashboardExplanationResponse,
  ChartInterpretRequest,
  ChartInterpretationResponse,
  BusinessInsightsRequest,
  BusinessInsightsResponse,
  ForecastingSuggestionsRequest,
  ForecastingSuggestionsResponse,
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

    this.client.interceptors.request.use((config) => {
      const csrf = document.cookie
        .split("; ")
        .find((cookie) => cookie.startsWith("ai_data_csrf="))
        ?.split("=")[1];
      if (csrf && ["post", "put", "patch", "delete"].includes((config.method ?? "").toLowerCase())) {
        config.headers["X-CSRF-Token"] = decodeURIComponent(csrf);
      }
      return config;
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
      state?: string;
      error_category?: string;
      error_detail?: string;
    }>(`/ai/chat/${datasetId}`, {
      message,
      conversation_id: conversationId,
    });
    return data;
  }

  async *streamChatAboutDataset(
    datasetId: string,
    message: string,
    conversationId?: string,
    signal?: AbortSignal,
  ): AsyncGenerator<{ content: string; done: boolean; conversation_id?: string; model?: string; provider?: string; state?: string; error_category?: string; error_detail?: string }, void, unknown> {
    let response: Response;
    try {
      await this.client.post("/auth/refresh").catch(() => {});
      response = await fetch(`${API_BASE}/ai/chat/stream/${datasetId}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, conversation_id: conversationId }),
        signal,
      });
    } catch (e) {
      if ((e as DOMException)?.name === "AbortError") {
        throw new Error("Stream cancelled");
      }
      throw new Error("Network request failed");
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Stream failed" }));
      throw new Error(error.detail || "Stream failed");
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let conversationIdReceived: string | undefined;

    if (!reader) throw new Error("No reader available");

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              yield { content: "", done: true, conversation_id: conversationIdReceived };
              return;
            }
            let parsed: any;
            try {
              parsed = JSON.parse(data);
            } catch {
              continue;
            }
            if (parsed.error) {
              throw new Error(parsed.error);
            }
            if (parsed.conversation_id && !conversationIdReceived) {
              conversationIdReceived = parsed.conversation_id;
            }
            // Handle thinking state progress updates
            if (parsed.state === "thinking" && !parsed.content) {
              // Progress update - yield as a special chunk with state but no content
              yield {
                content: "",
                done: false,
                conversation_id: conversationIdReceived,
                state: "thinking",
              };
              continue;
            }
            // Handle thinking state with content (progress text)
            if (parsed.state === "thinking" && parsed.content) {
              yield {
                content: "",
                done: false,
                conversation_id: conversationIdReceived,
                state: "thinking",
                // The content field carries the progress text (e.g., "Reading dataset...")
                // We use a special marker so the frontend can display it
                error_detail: parsed.content,
              };
              continue;
            }
            // Handle clarifying state
            if (parsed.state === "clarifying") {
              yield {
                content: parsed.content || "",
                done: parsed.done || false,
                conversation_id: conversationIdReceived,
                state: "clarifying",
              };
              continue;
            }
            // Handle error state
            if (parsed.state === "error") {
              yield {
                content: "",
                done: true,
                conversation_id: conversationIdReceived,
                state: "error",
                error_category: parsed.error_category,
                error_detail: parsed.error_detail,
              };
              return;
            }
            // Normal content chunk
            if (parsed.content) {
              yield { content: parsed.content, done: parsed.done || false, conversation_id: conversationIdReceived, model: parsed.model, provider: parsed.provider };
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    yield { content: "", done: true, conversation_id: conversationIdReceived };
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

  // ==================== Python Code Generation ====================

  async generatePythonCode(datasetId: string, request: PythonCodeRequest) {
    const { data } = await this.client.post<PythonCodeResponse>(`/ai/python/code/${datasetId}`, request);
    return data;
  }

  async generateAnalysisPipeline(datasetId: string, request: AnalysisPipelineRequest) {
    const { data } = await this.client.post<PythonCodeResponse>(`/ai/python/pipeline/${datasetId}`, request);
    return data;
  }

  async generateVisualizationCode(datasetId: string, request: VisualizationCodeRequest) {
    const { data } = await this.client.post<PythonCodeResponse>(`/ai/python/visualization/${datasetId}`, request);
    return data;
  }

  async generateStatisticalAnalysisCode(datasetId: string, request: StatisticalAnalysisRequest) {
    const { data } = await this.client.post<PythonCodeResponse>(`/ai/python/statistical/${datasetId}`, request);
    return data;
  }

  // ==================== SQL Generation with Execution ====================

  async generateSQLWithExecution(datasetId: string, question: string) {
    const { data } = await this.client.post<SQLWithExecutionResponse>(`/ai/sql/generate-with-execution/${datasetId}`, { question });
    return data;
  }

  // ==================== Dashboard Explanations ====================

  async explainDashboard(datasetId: string, request: DashboardExplainRequest) {
    const { data } = await this.client.post<DashboardExplanationResponse>(`/ai/dashboard/explain/${datasetId}`, request);
    return data;
  }

  async interpretChart(datasetId: string, request: ChartInterpretRequest) {
    const { data } = await this.client.post<ChartInterpretationResponse>(`/ai/chart/interpret/${datasetId}`, request);
    return data;
  }

  // ==================== Business Insights ====================

  async generateBusinessInsights(datasetId: string, request: BusinessInsightsRequest) {
    const { data } = await this.client.post<BusinessInsightsResponse>(`/ai/insights/business/${datasetId}`, request);
    return data;
  }

  // ==================== Forecasting Suggestions ====================

  async suggestForecastingApproach(datasetId: string, request: ForecastingSuggestionsRequest) {
    const { data } = await this.client.post<ForecastingSuggestionsResponse>(`/ai/forecast/suggestions/${datasetId}`, request);
    return data;
  }

  // ==================== DB Connections ====================

  async listDbConnections() {
    const { data } = await this.client.get<{ connections: any[] }>("/db-connections");
    return data.connections;
  }

  async createDbConnection(connection: {
    name: string;
    description?: string;
    host: string;
    port: string;
    database_name: string;
    schema_name?: string;
    username: string;
    password: string;
  }) {
    const { data } = await this.client.post<any>("/db-connections", connection);
    return data;
  }

  async introspectDbSchema(connectionId: string) {
    const { data } = await this.client.get<any>(`/db-connections/${connectionId}/schema`);
    return data;
  }

  async executeDbQuery(connectionId: string, query: string, limit = 10000) {
    const { data } = await this.client.post<any>(`/db-connections/${connectionId}/query`, { query, limit });
    return data;
  }
}

export const api = new ApiService();
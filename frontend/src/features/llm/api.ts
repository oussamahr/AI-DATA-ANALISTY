import { apiClient } from "@/lib/api-client";

export interface LlmQueryRequest {
  prompt: string;
  dataset_id?: string;
}

export interface LlmQueryResponse {
  id: string;
  response: string;
  model: string;
  tokens_prompt: number;
  tokens_completion: number;
  duration_ms: number | null;
  created_at: string;
}

export const llmApi = {
  /**
   * Send a natural language query to the AI analyst.
   */
  askQuestion: async (data: LlmQueryRequest): Promise<LlmQueryResponse> => {
    const response = await apiClient.post<LlmQueryResponse>("/llm/query", data);
    return response.data;
  },

  /**
   * Fetch previous conversation history.
   */
  getHistory: async () => {
    const response = await apiClient.get("/llm/history");
    return response.data;
  }
};

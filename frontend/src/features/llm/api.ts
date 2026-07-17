import { apiClient } from "@/lib/api-client";

export interface LlmQueryRequest {
  query: string;
  dataset_id?: string;
}

export interface LlmQueryResponse {
  answer: string;
  query_intent?: string;
  visualizations?: any[];
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

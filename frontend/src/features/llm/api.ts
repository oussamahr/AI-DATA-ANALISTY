import { apiClient } from "@/lib/api-client";
import type { LLMQueryRequest, LLMQueryResponse, LLMHistoryItem } from "./types";

export const llmApi = {
  query: async (data: LLMQueryRequest): Promise<LLMQueryResponse> => {
    const res = await apiClient.post<LLMQueryResponse>("/llm/query", {
      prompt: data.prompt,
      dataset_id: data.dataset_id || null,
    });
    return res.data;
  },

  history: async (limit = 50, offset = 0): Promise<LLMHistoryItem[]> => {
    const res = await apiClient.get<LLMHistoryItem[]>("/llm/history", { params: { limit, offset } });
    return res.data;
  },
};

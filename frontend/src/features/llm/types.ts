export interface LLMQueryRequest {
  prompt: string;
  dataset_id?: string | null;
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

export interface LLMHistoryItem {
  id: string;
  prompt: string;
  response: string | null;
  model: string;
  success: boolean;
  created_at: string;
}

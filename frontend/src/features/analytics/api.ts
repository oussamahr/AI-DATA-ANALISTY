import { apiClient } from "@/lib/api-client";
import type { DatasetProfile, CorrelationResponse, AIInsightResponse, AnalysisRun } from "./types";

export const analyticsApi = {
  profile: async (datasetId: string, force = false): Promise<DatasetProfile> => {
    const res = await apiClient.post<DatasetProfile>(`/analytics/profile/${datasetId}`, null, { params: { force } });
    return res.data;
  },

  getProfile: async (datasetId: string): Promise<DatasetProfile> => {
    const res = await apiClient.get<DatasetProfile>(`/analytics/profile/${datasetId}`);
    return res.data;
  },

  correlate: async (datasetId: string): Promise<CorrelationResponse> => {
    const res = await apiClient.post<CorrelationResponse>(`/analytics/correlate/${datasetId}`);
    return res.data;
  },

  aiInsights: async (datasetId: string): Promise<AIInsightResponse> => {
    const res = await apiClient.post<AIInsightResponse>(`/analytics/insights/${datasetId}`);
    return res.data;
  },

  getAiInsights: async (datasetId: string): Promise<AIInsightResponse> => {
    const res = await apiClient.get<AIInsightResponse>(`/analytics/insights/${datasetId}`);
    return res.data;
  },

  runs: async (datasetId?: string): Promise<AnalysisRun[]> => {
    const res = await apiClient.get<AnalysisRun[]>("/analytics/runs", { params: { dataset_id: datasetId } });
    return res.data;
  },
};

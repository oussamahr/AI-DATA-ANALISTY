import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { analyticsApi } from "./api";

export const analyticsKeys = {
  profile: (datasetId: string) => ["analytics", "profile", datasetId] as const,
  correlation: (datasetId: string) => ["analytics", "correlation", datasetId] as const,
  insights: (datasetId: string) => ["analytics", "insights", datasetId] as const,
  runs: (datasetId?: string) => ["analytics", "runs", datasetId] as const,
};

export function useProfile(datasetId: string, enabled = true) {
  return useQuery({
    queryKey: analyticsKeys.profile(datasetId),
    queryFn: () => analyticsApi.getProfile(datasetId),
    enabled: !!datasetId && enabled,
    retry: false,
  });
}

export function useRunProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ datasetId, force }: { datasetId: string; force?: boolean }) => analyticsApi.profile(datasetId, !!force),
    onSuccess: (data) => {
      qc.setQueryData(analyticsKeys.profile(data.dataset_id), data);
      qc.invalidateQueries({ queryKey: analyticsKeys.runs(data.dataset_id) });
    },
  });
}

export function useRunCorrelation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (datasetId: string) => analyticsApi.correlate(datasetId),
    onSuccess: (data) => {
      qc.setQueryData(analyticsKeys.correlation(data.dataset_id), data);
    },
  });
}

export function useAiInsights(datasetId: string) {
  return useQuery({
    queryKey: analyticsKeys.insights(datasetId),
    queryFn: () => analyticsApi.getAiInsights(datasetId),
    enabled: !!datasetId,
    retry: false,
  });
}

export function useRunAiInsights() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (datasetId: string) => analyticsApi.aiInsights(datasetId),
    onSuccess: (data) => {
      qc.setQueryData(analyticsKeys.insights(data.dataset_id), data);
    },
  });
}

export function useAnalysisRuns(datasetId?: string) {
  return useQuery({
    queryKey: analyticsKeys.runs(datasetId),
    queryFn: () => analyticsApi.runs(datasetId),
  });
}

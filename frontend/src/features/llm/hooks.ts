import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { llmApi } from "./api";

export const llmKeys = {
  all: ["llm"] as const,
  history: (limit: number, offset: number) => [...llmKeys.all, "history", { limit, offset }] as const,
};

export function useLlmHistory(limit = 50, offset = 0) {
  return useQuery({
    queryKey: llmKeys.history(limit, offset),
    queryFn: () => llmApi.history(limit, offset),
  });
}

export function useAskLlm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: llmApi.query,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: llmKeys.all });
    },
  });
}

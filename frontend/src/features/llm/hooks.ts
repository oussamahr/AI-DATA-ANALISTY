import { useMutation, useQuery } from "@tanstack/react-query";
import { llmApi, type LlmQueryRequest } from "./api";

export const useAskQuestion = () => {
  return useMutation({
    mutationFn: (data: LlmQueryRequest) => llmApi.askQuestion(data),
  });
};

export const useLlmHistory = () => {
  return useQuery({
    queryKey: ["llm", "history"],
    queryFn: () => llmApi.getHistory(),
  });
};
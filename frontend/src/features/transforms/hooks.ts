import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { transformApi } from "./api";

export const transformKeys = {
  list: (datasetId: string) => ["transforms", datasetId] as const,
};

export function useTransforms(datasetId: string) {
  return useQuery({ queryKey: transformKeys.list(datasetId), queryFn: () => transformApi.list(datasetId), enabled: !!datasetId });
}

export function useCreateTransform(datasetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ type, config, name }: { type: string; config: Record<string, unknown>; name?: string }) => transformApi.create(datasetId, type, config, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: transformKeys.list(datasetId) }),
  });
}

export function useApplyTransforms(datasetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (outputName: string) => transformApi.apply(datasetId, outputName),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["datasets"] }),
  });
}

export function useDeleteTransform(datasetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => transformApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: transformKeys.list(datasetId) }),
  });
}

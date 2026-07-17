import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { datasetApi } from "./api";

export const datasetKeys = {
  all: ["datasets"] as const,
  lists: () => [...datasetKeys.all, "list"] as const,
  list: (page: number, pageSize: number) => [...datasetKeys.lists(), { page, pageSize }] as const,
  detail: (id: string) => [...datasetKeys.all, "detail", id] as const,
  preview: (id: string) => [...datasetKeys.all, "preview", id] as const,
};

export function useDatasets(page = 1, pageSize = 50) {
  return useQuery({
    queryKey: datasetKeys.list(page, pageSize),
    queryFn: () => datasetApi.list(page, pageSize),
  });
}

export function useDataset(id: string) {
  return useQuery({
    queryKey: datasetKeys.detail(id),
    queryFn: () => datasetApi.get(id),
    enabled: !!id,
  });
}

export function useDatasetPreview(id: string) {
  return useQuery({
    queryKey: datasetKeys.preview(id),
    queryFn: () => datasetApi.preview(id),
    enabled: !!id,
  });
}

export function useUploadDataset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: datasetApi.upload,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: datasetKeys.all });
    },
  });
}

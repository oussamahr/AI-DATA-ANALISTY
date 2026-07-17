import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { datasetApi } from "./api";

export const datasetKeys = {
  all: ["datasets"] as const,
  lists: () => [...datasetKeys.all, "list"] as const,
};

export const useDatasets = () => {
  return useQuery({
    queryKey: datasetKeys.lists(),
    queryFn: () => datasetApi.list(),
  });
};

export const useUploadDataset = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ file, onProgress }: { file: File, onProgress?: (p: number) => void }) => 
      datasetApi.upload(file, onProgress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: datasetKeys.all });
    },
  });
};
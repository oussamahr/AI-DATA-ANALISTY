import { apiClient } from "@/lib/api-client";
import type { Transform } from "./types";

export const transformApi = {
  list: async (datasetId: string): Promise<Transform[]> => {
    const res = await apiClient.get<Transform[]>(`/transforms/${datasetId}`);
    return res.data;
  },

  create: async (datasetId: string, type: string, config: Record<string, unknown>, name = ""): Promise<Transform> => {
    // Backend endpoints are per-type under /transforms/{type}?dataset_id=...
    const endpointMap: Record<string, string> = {
      impute: "/transforms/impute",
      remove_outliers: "/transforms/remove-outliers",
      cast: "/transforms/cast",
      filter: "/transforms/filter",
      rename: "/transforms/rename",
      drop: "/transforms/drop",
      normalize: "/transforms/normalize",
      encode: "/transforms/encode",
    };
    const endpoint = endpointMap[type] || `/transforms/${type}`;
    const res = await apiClient.post<Transform>(endpoint, config, { params: { dataset_id: datasetId, name } });
    return res.data;
  },

  apply: async (datasetId: string, outputName = ""): Promise<any> => {
    const res = await apiClient.post(`/transforms/apply`, { dataset_id: datasetId, output_name: outputName });
    return res.data;
  },

  delete: async (transformId: string): Promise<void> => {
    await apiClient.delete(`/transforms/${transformId}`);
  },
};

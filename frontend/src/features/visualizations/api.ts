import { apiClient } from "@/lib/api-client";
import type { BarChartData, HistogramData, ScatterData, LineData, HeatmapData, PieData, DatasetPreview } from "./types";

export const vizApi = {
  bar: async (datasetId: string, column: string, limit = 20): Promise<BarChartData> => {
    const res = await apiClient.post<BarChartData>("/visualizations/bar", { dataset_id: datasetId, column }, { params: { limit } });
    return res.data;
  },
  histogram: async (datasetId: string, column: string, bins = 20): Promise<HistogramData> => {
    const res = await apiClient.post<HistogramData>("/visualizations/histogram", { dataset_id: datasetId, column }, { params: { bins } });
    return res.data;
  },
  scatter: async (datasetId: string, x_column: string, y_column: string, limit = 1000): Promise<ScatterData> => {
    const res = await apiClient.post<ScatterData>("/visualizations/scatter", { dataset_id: datasetId, x_column, y_column }, { params: { limit } });
    return res.data;
  },
  line: async (datasetId: string, x_column: string, y_column: string, limit = 1000): Promise<LineData> => {
    const res = await apiClient.post<LineData>("/visualizations/line", { dataset_id: datasetId, x_column, y_column }, { params: { limit } });
    return res.data;
  },
  heatmap: async (datasetId: string, columns: string[]): Promise<HeatmapData> => {
    const res = await apiClient.post<HeatmapData>("/visualizations/heatmap", { dataset_id: datasetId, columns });
    return res.data;
  },
  pie: async (datasetId: string, column: string, limit = 10): Promise<PieData> => {
    const res = await apiClient.post<PieData>("/visualizations/pie", { dataset_id: datasetId, column }, { params: { limit } });
    return res.data;
  },
  preview: async (datasetId: string): Promise<DatasetPreview> => {
    const res = await apiClient.get<DatasetPreview>(`/visualizations/preview/${datasetId}`);
    return res.data;
  },
};

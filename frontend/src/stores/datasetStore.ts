import { create } from "zustand";
import api from "@/lib/api";
import type { Dataset } from "@/types/api";

interface DatasetState {
  datasets: Dataset[];
  selectedDataset: Dataset | null;
  isLoading: boolean;
  fetchDatasets: () => Promise<void>;
  selectDataset: (dataset: Dataset) => void;
  uploadDataset: (
    file: File,
    name: string,
    description: string,
    onProgress?: (pct: number) => void
  ) => Promise<Dataset>;
}

export const useDatasetStore = create<DatasetState>((set) => ({
  datasets: [],
  selectedDataset: null,
  isLoading: false,

  fetchDatasets: async () => {
    set({ isLoading: true });
    try {
      const res = await api.get<{ items: Dataset[] }>("/datasets/");
      set({ datasets: Array.isArray(res.data.items) ? res.data.items : [] });
    } catch {
      set({ datasets: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  selectDataset: (dataset) => set({ selectedDataset: dataset }),

  uploadDataset: async (file, name, description, onProgress) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", name);
    formData.append("description", description);

    const res = await api.post<Dataset>("/datasets/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (e) => {
        if (e.total && onProgress) {
          onProgress(Math.round((e.loaded * 100) / e.total));
        }
      },
    });

    set((state) => ({ datasets: [...state.datasets, res.data] }));
    return res.data;
  },
}));

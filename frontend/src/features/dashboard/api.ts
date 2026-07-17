import { apiClient } from "@/lib/api-client";

export interface DashboardStats {
  total_datasets: number;
  queries_run: number;
  avg_query_time: number;
}

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    // In a real app this would map to a dedicated dashboard stats endpoint
    // For now we will aggregate locally or rely on an existing endpoint if one was provided
    // Simulating since standard implementation plan doesn't mention a unified stats endpoint
    try {
        const response = await apiClient.get<DashboardStats>("/analytics/stats");
        return response.data;
    } catch (e) {
        // Fallback placeholder logic just in case the backend doesn't have this explicit endpoint yet
        return { total_datasets: 0, queries_run: 0, avg_query_time: 0 };
    }
  }
}
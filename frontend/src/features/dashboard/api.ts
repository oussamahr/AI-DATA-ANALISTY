import { apiClient } from "@/lib/api-client";
import type { DashboardStats } from "./types";

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const res = await apiClient.get<DashboardStats>("/analytics/stats");
    return res.data;
  },
  getAdminStats: async (): Promise<{ total_users: number; total_tenants: number }> => {
    const res = await apiClient.get("/admin/stats");
    return res.data;
  },
};

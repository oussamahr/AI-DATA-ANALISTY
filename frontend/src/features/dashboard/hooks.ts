import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "./api";

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: () => dashboardApi.getStats(),
  });
};
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useAuthStore } from "@/store";

export function useCurrentUser() {
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);

  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      try {
        const user = await api.getMe();
        setUser(user);
        return user;
      } catch {
        setUser(null);
        return null;
      } finally {
        setLoading(false);
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useDatasets(page = 1, pageSize = 50) {
  return useQuery({
    queryKey: ["datasets", page, pageSize],
    queryFn: () => api.getDatasets(page, pageSize),
  });
}

export function useDataset(id: string) {
  return useQuery({
    queryKey: ["datasets", id],
    queryFn: () => api.getDataset(id),
    enabled: !!id,
  });
}

export function useAnalyticsStats() {
  return useQuery({
    queryKey: ["analytics", "stats"],
    queryFn: () => api.getAnalyticsStats(),
  });
}

export function useAnalysisRuns(datasetId?: string) {
  return useQuery({
    queryKey: ["analytics", "runs", datasetId],
    queryFn: () => api.listRuns(datasetId),
  });
}

export function useLLMHistory(limit = 50, offset = 0) {
  return useQuery({
    queryKey: ["llm", "history", limit, offset],
    queryFn: () => api.getLLMHistory(limit, offset),
  });
}

export function useAdminStats() {
  return useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => api.getSystemStats(),
  });
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => api.getUsers(),
  });
}

export function useVerifyUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.verifyUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}

export function useRoles() {
  return useQuery({
    queryKey: ["roles"],
    queryFn: () => api.listRoles(),
  });
}

export function useAssignRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roleId, userId }: { roleId: string; userId: string }) =>
      api.assignRole(roleId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}

export function useDeleteDataset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteDataset(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["datasets"] });
      queryClient.invalidateQueries({ queryKey: ["analytics", "stats"] });
    },
  });
}

export function useUploadDataset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => api.uploadDataset(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["datasets"] });
      queryClient.invalidateQueries({ queryKey: ["analytics", "stats"] });
    },
  });
}

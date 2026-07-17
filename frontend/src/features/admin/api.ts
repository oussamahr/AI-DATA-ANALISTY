import { apiClient } from "@/lib/api-client";

export const adminApi = {
  stats: async (): Promise<{ total_users: number; total_tenants: number }> => {
    const res = await apiClient.get("/admin/stats");
    return res.data;
  },
  users: async (limit = 100, offset = 0): Promise<Array<{ id: string; email: string; first_name: string; last_name: string; is_verified: boolean; is_active: boolean }>> => {
    const res = await apiClient.get("/admin/users", { params: { limit, offset } });
    return res.data;
  },
  roles: async (): Promise<Array<{ id: string; name: string; description: string; permissions: string[] }>> => {
    const res = await apiClient.get("/roles");
    return res.data;
  },
  createRole: async (data: { name: string; description: string; permissions: string[] }) => {
    const res = await apiClient.post("/roles", data);
    return res.data;
  },
  assignRole: async (roleId: string, userId: string) => {
    const res = await apiClient.post(`/roles/${roleId}/assign/${userId}`);
    return res.data;
  },
};

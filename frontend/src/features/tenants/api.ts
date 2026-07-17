import { apiClient } from "@/lib/api-client";

export const tenantApi = {
  create: async (data: { name: string; domain?: string }) => {
    const res = await apiClient.post("/tenants", data);
    return res.data;
  },
  members: async () => {
    const res = await apiClient.get("/tenants/members");
    return res.data;
  },
  invitations: async () => {
    const res = await apiClient.get("/tenants/invitations");
    return res.data;
  },
  invite: async (email: string, role_id?: string) => {
    const res = await apiClient.post("/tenants/invitations", { email, role_id });
    return res.data;
  },
};

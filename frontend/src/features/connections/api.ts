import { apiClient } from "@/lib/api-client";

export const connectionsApi = {
  list: async () => {
    const res = await apiClient.get("/db-connections/");
    return res.data as { connections: any[] };
  },
  create: async (data: { name: string; host: string; port?: string; database_name: string; schema_name?: string; username: string; password: string; description?: string }) => {
    const res = await apiClient.post("/db-connections/", data);
    return res.data;
  },
  schema: async (id: string) => {
    const res = await apiClient.get(`/db-connections/${id}/schema`);
    return res.data;
  },
  query: async (id: string, query: string, limit = 100) => {
    const res = await apiClient.post(`/db-connections/${id}/query`, { query, limit });
    return res.data;
  },
};

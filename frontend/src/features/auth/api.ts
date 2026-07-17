import { apiClient } from "@/lib/api-client";
import type {
  User,
  LoginRequest,
  RegisterRequest,
  TokenResponse,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  VerifyEmailRequest,
  ChangePasswordRequest,
  UpdateProfileRequest,
} from "./types";

export const authApi = {
  login: async (data: LoginRequest): Promise<TokenResponse> => {
    const res = await apiClient.post<TokenResponse>("/auth/login", data);
    return res.data;
  },

  register: async (data: RegisterRequest): Promise<User> => {
    const res = await apiClient.post<User>("/auth/register", data);
    return res.data;
  },

  getMe: async (): Promise<User> => {
    const res = await apiClient.get<User>("/auth/me");
    return res.data;
  },

  updateProfile: async (data: UpdateProfileRequest): Promise<User> => {
    const res = await apiClient.patch<User>("/auth/me", data);
    return res.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post("/auth/logout");
  },

  refresh: async (): Promise<TokenResponse> => {
    const res = await apiClient.post<TokenResponse>("/auth/refresh");
    return res.data;
  },

  forgotPassword: async (data: ForgotPasswordRequest): Promise<{ message: string }> => {
    const res = await apiClient.post<{ message: string }>("/auth/forgot-password", data);
    return res.data;
  },

  resetPassword: async (data: ResetPasswordRequest): Promise<{ message: string }> => {
    const res = await apiClient.post<{ message: string }>("/auth/reset-password", data);
    return res.data;
  },

  verifyEmail: async (data: VerifyEmailRequest): Promise<{ message: string }> => {
    const res = await apiClient.post<{ message: string }>("/auth/verify-email", data);
    return res.data;
  },

  resendVerification: async (email: string): Promise<{ message: string }> => {
    const res = await apiClient.post<{ message: string }>("/auth/resend-verification", { email });
    return res.data;
  },

  changePassword: async (data: ChangePasswordRequest): Promise<{ message: string }> => {
    const res = await apiClient.post<{ message: string }>("/auth/change-password", data);
    return res.data;
  },

  oidcConfig: async (): Promise<{ issuer: string; client_id: string; scopes: string; audience: string; auth_mode: string }> => {
    const res = await apiClient.get("/auth/oidc/config");
    return res.data;
  },
};

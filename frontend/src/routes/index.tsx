import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/app-layout";
import { AuthLayout } from "@/components/layout/auth-layout";
import { LoginPage } from "@/features/auth/login-page";
import { RegisterPage } from "@/features/auth/register-page";
import { ForgotPasswordPage } from "@/features/auth/forgot-password-page";
import { SettingsPage } from "@/features/auth/settings-page";
import { ProfilePage } from "@/features/auth/profile-page";
import { AdminPage } from "@/features/auth/admin-page";
import { NotFoundPage } from "@/features/auth/not-found-page";
import { DashboardPage } from "@/features/dashboard/dashboard-page";
import { DatasetsPage } from "@/features/datasets/datasets-page";
import { UploadDatasetPage } from "@/features/datasets/upload-page";
import { DatasetDetailPage } from "@/features/datasets/dataset-detail-page";
import { AnalyticsPage } from "@/features/analytics/analytics-page";
import { VisualizationsPage } from "@/features/analytics/visualizations-page";
import { ChatPage } from "@/features/chat/chat-page";
import { HistoryPage } from "@/features/chat/history-page";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/dashboard" replace />,
  },
  {
    element: <AuthLayout />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
      { path: "/forgot-password", element: <ForgotPasswordPage /> },
    ],
  },
  {
    element: <AppLayout />,
    children: [
      { path: "/dashboard", element: <DashboardPage /> },
      { path: "/datasets", element: <DatasetsPage /> },
      { path: "/datasets/upload", element: <UploadDatasetPage /> },
      { path: "/datasets/:id", element: <DatasetDetailPage /> },
      { path: "/analytics", element: <AnalyticsPage /> },
      { path: "/visualizations", element: <VisualizationsPage /> },
      { path: "/chat", element: <ChatPage /> },
      { path: "/history", element: <HistoryPage /> },
      { path: "/settings", element: <SettingsPage /> },
      { path: "/profile", element: <ProfilePage /> },
      { path: "/admin", element: <AdminPage /> },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);

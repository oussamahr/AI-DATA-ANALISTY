import { createBrowserRouter } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { AuthLayout } from "@/components/layout/auth-layout";
import LandingApp from "@/features/landing/LandingApp";

// Lazy-loaded dashboard routes (only loaded when user navigates to them)
// Using wrapper imports since page components use named exports
const DashboardPage = lazy(() => import("@/features/dashboard/dashboard-page").then((m) => ({ default: m.DashboardPage })));
const DatasetsPage = lazy(() => import("@/features/datasets/datasets-page").then((m) => ({ default: m.DatasetsPage })));
const UploadDatasetPage = lazy(() => import("@/features/datasets/upload-page").then((m) => ({ default: m.UploadDatasetPage })));
const DatasetDetailPage = lazy(() => import("@/features/datasets/dataset-detail-page").then((m) => ({ default: m.DatasetDetailPage })));
const AnalyticsPage = lazy(() => import("@/features/analytics/analytics-page").then((m) => ({ default: m.AnalyticsPage })));
const VisualizationsPage = lazy(() => import("@/features/analytics/visualizations-page").then((m) => ({ default: m.VisualizationsPage })));
const ChatPage = lazy(() => import("@/features/chat/chat-page").then((m) => ({ default: m.ChatPage })));
const HistoryPage = lazy(() => import("@/features/chat/history-page").then((m) => ({ default: m.HistoryPage })));
const DbConnectionsPage = lazy(() => import("@/features/datasets/db-connections-page").then((m) => ({ default: m.DbConnectionsPage })));

// Lazy-loaded auth routes
const LoginPage = lazy(() => import("@/features/auth/login-page").then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import("@/features/auth/register-page").then((m) => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() => import("@/features/auth/forgot-password-page").then((m) => ({ default: m.ForgotPasswordPage })));
const SettingsPage = lazy(() => import("@/features/auth/settings-page").then((m) => ({ default: m.SettingsPage })));
const ProfilePage = lazy(() => import("@/features/auth/profile-page").then((m) => ({ default: m.ProfilePage })));
const AdminPage = lazy(() => import("@/features/auth/admin-page").then((m) => ({ default: m.AdminPage })));
const NotFoundPage = lazy(() => import("@/features/auth/not-found-page").then((m) => ({ default: m.NotFoundPage })));

export const router = createBrowserRouter([
  {
    path: "/",
    element: <LandingApp />,
  },
  {
    element: <AuthLayout />,
    children: [
      { path: "/login", element: <Suspense fallback={null}><LoginPage /></Suspense> },
      { path: "/register", element: <Suspense fallback={null}><RegisterPage /></Suspense> },
      { path: "/forgot-password", element: <Suspense fallback={null}><ForgotPasswordPage /></Suspense> },
    ],
  },
  {
    element: <AppLayout />,
    children: [
      { path: "/dashboard", element: <Suspense fallback={null}><DashboardPage /></Suspense> },
      { path: "/datasets", element: <Suspense fallback={null}><DatasetsPage /></Suspense> },
      { path: "/datasets/upload", element: <Suspense fallback={null}><UploadDatasetPage /></Suspense> },
      { path: "/datasets/:id", element: <Suspense fallback={null}><DatasetDetailPage /></Suspense> },
      { path: "/datasets/db-connections", element: <Suspense fallback={null}><DbConnectionsPage /></Suspense> },
      { path: "/analytics", element: <Suspense fallback={null}><AnalyticsPage /></Suspense> },
      { path: "/visualizations", element: <Suspense fallback={null}><VisualizationsPage /></Suspense> },
      { path: "/chat", element: <Suspense fallback={null}><ChatPage /></Suspense> },
      { path: "/history", element: <Suspense fallback={null}><HistoryPage /></Suspense> },
      { path: "/settings", element: <Suspense fallback={null}><SettingsPage /></Suspense> },
      { path: "/profile", element: <Suspense fallback={null}><ProfilePage /></Suspense> },
      { path: "/admin", element: <Suspense fallback={null}><AdminPage /></Suspense> },
    ],
  },
  { path: "*", element: <Suspense fallback={null}><NotFoundPage /></Suspense> },
]);

import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { AppLayout } from "./layouts/AppLayout";
import { AuthLayout } from "./layouts/AuthLayout";
import { ProtectedRoute, PublicRoute } from "@/features/auth/components/ProtectedRoute";
import { NotFoundPage } from "@/components/shared/NotFoundPage";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { Suspense, lazy } from "react";
import { PageSkeleton } from "@/components/shared/LoadingSpinner";

// Lazy pages for code-splitting
const DashboardPage = lazy(() => import("@/features/dashboard/pages/DashboardPage").then(m => ({ default: m.DashboardPage })));
const DatasetsPage = lazy(() => import("@/features/datasets/pages/DatasetsPage").then(m => ({ default: m.DatasetsPage })));
const AnalyticsPage = lazy(() => import("@/features/analytics/pages/AnalyticsPage").then(m => ({ default: m.AnalyticsPage })));
const VisualizationsPage = lazy(() => import("@/features/visualizations/pages/VisualizationsPage").then(m => ({ default: m.VisualizationsPage })));
const TransformsPage = lazy(() => import("@/features/transforms/pages/TransformsPage").then(m => ({ default: m.TransformsPage })));
const LLMPage = lazy(() => import("@/features/llm/pages/LLMPage").then(m => ({ default: m.LLMPage })));
const AdminPage = lazy(() => import("@/features/admin/pages/AdminPage").then(m => ({ default: m.AdminPage })));
const RolesPage = lazy(() => import("@/features/admin/pages/RolesPage").then(m => ({ default: m.RolesPage })));
const TenantsPage = lazy(() => import("@/features/tenants/pages/TenantsPage").then(m => ({ default: m.TenantsPage })));
const ConnectionsPage = lazy(() => import("@/features/connections/pages/ConnectionsPage").then(m => ({ default: m.ConnectionsPage })));

const LoginPage = lazy(() => import("@/features/auth/pages/LoginPage").then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import("@/features/auth/pages/RegisterPage").then(m => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() => import("@/features/auth/pages/ForgotPasswordPage").then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import("@/features/auth/pages/ResetPasswordPage").then(m => ({ default: m.ResetPasswordPage })));

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
    </ErrorBoundary>
  );
}

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      {
        path: "/login",
        element: (
          <PublicRoute>
            <SuspenseWrapper><LoginPage /></SuspenseWrapper>
          </PublicRoute>
        ),
      },
      {
        path: "/register",
        element: (
          <PublicRoute>
            <SuspenseWrapper><RegisterPage /></SuspenseWrapper>
          </PublicRoute>
        ),
      },
      {
        path: "/forgot-password",
        element: (
          <PublicRoute>
            <SuspenseWrapper><ForgotPasswordPage /></SuspenseWrapper>
          </PublicRoute>
        ),
      },
      {
        path: "/reset-password",
        element: (
          <PublicRoute>
            <SuspenseWrapper><ResetPasswordPage /></SuspenseWrapper>
          </PublicRoute>
        ),
      },
    ],
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    errorElement: <NotFoundPage />,
    children: [
      { index: true, element: <SuspenseWrapper><DashboardPage /></SuspenseWrapper> },
      { path: "datasets", element: <SuspenseWrapper><DatasetsPage /></SuspenseWrapper> },
      { path: "assistant", element: <SuspenseWrapper><LLMPage /></SuspenseWrapper> },
      { path: "analytics", element: <SuspenseWrapper><AnalyticsPage /></SuspenseWrapper> },
      { path: "visualizations", element: <SuspenseWrapper><VisualizationsPage /></SuspenseWrapper> },
      { path: "transforms", element: <SuspenseWrapper><TransformsPage /></SuspenseWrapper> },
      { path: "connections", element: <SuspenseWrapper><ConnectionsPage /></SuspenseWrapper> },
      { path: "tenants", element: <SuspenseWrapper><TenantsPage /></SuspenseWrapper> },
      {
        path: "admin",
        element: (
          <ProtectedRoute requireAdmin>
            <SuspenseWrapper><AdminPage /></SuspenseWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: "admin/roles",
        element: (
          <ProtectedRoute requireAdmin>
            <SuspenseWrapper><RolesPage /></SuspenseWrapper>
          </ProtectedRoute>
        ),
      },
      // Legacy redirects
      { path: "dashboard", element: <Navigate to="/" replace /> },
      { path: "llm", element: <Navigate to="/assistant" replace /> },
      { path: "analysis", element: <Navigate to="/analytics" replace /> },
      { path: "analyst", element: <Navigate to="/analytics" replace /> },
      { path: "reports", element: <Navigate to="/analytics" replace /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}

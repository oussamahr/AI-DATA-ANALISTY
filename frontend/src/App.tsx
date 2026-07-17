import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./app/layouts/AppLayout";
import { DashboardPage } from "./features/dashboard/pages/DashboardPage";
import { DatasetsPage } from "./features/datasets/pages/DatasetsPage";
import { AnalyticsPage } from "./features/analytics/pages/AnalyticsPage";
import { VisualizationsPage } from "./features/visualizations/pages/VisualizationsPage";
import { QueryConsole } from "./features/llm/components/QueryConsole";
import { LoginPage } from "./features/auth/pages/LoginPage";
import { RegisterPage } from "./features/auth/pages/RegisterPage";
import { AuthInitializer } from "./features/auth/components/AuthInitializer";
import { ProtectedRoute } from "./features/auth/components/ProtectedRoute";

export function App() {
  return (
    <BrowserRouter>
      <AuthInitializer>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }>
            <Route index element={<DashboardPage />} />
            <Route path="datasets" element={<DatasetsPage />} />
            <Route path="assistant" element={
              <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)]">
                <div className="mb-4">
                  <h2 className="text-2xl font-bold">AI Assistant</h2>
                  <p className="text-muted-foreground">Ask questions about your data in plain English.</p>
                </div>
                <QueryConsole />
              </div>
            } />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="visualizations" element={<VisualizationsPage />} />
          </Route>
        </Routes>
      </AuthInitializer>
    </BrowserRouter>
  );
}
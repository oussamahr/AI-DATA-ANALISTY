import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AppShell } from "@/components/layout/AppShell";
import { AmbientBackground } from "@/components/common/AmbientBackground";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { DatasetsPage } from "@/pages/DatasetsPage";
import { AnalyticsPage } from "@/pages/AnalyticsPage";
import { LLMPage } from "@/pages/LLMPage";
import { VisualizationsPage } from "@/pages/VisualizationsPage";
import { TransformsPage } from "@/pages/TransformsPage";
import { AdminPage } from "@/pages/AdminPage";

function App() {
  return (
    <BrowserRouter>
      <AmbientBackground />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AppShell>
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/dashboard" element={<Navigate to="/" replace />} />
                  <Route path="/datasets" element={<DatasetsPage />} />
                  <Route path="/analytics" element={<AnalyticsPage />} />
                  <Route path="/analysis" element={<Navigate to="/analytics" replace />} />
                  <Route path="/analyst" element={<Navigate to="/analytics" replace />} />
                  <Route path="/reports" element={<Navigate to="/analytics" replace />} />
                  <Route path="/visualizations" element={<VisualizationsPage />} />
                  <Route path="/transforms" element={<TransformsPage />} />
                  <Route path="/llm" element={<LLMPage />} />
                  <Route path="/admin" element={<AdminPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </AppShell>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

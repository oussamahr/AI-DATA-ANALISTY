import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'

// Layouts
import { AppLayout } from '@/components/layout/AppLayout'
import { AuthLayout } from '@/components/layout/AuthLayout'

// Auth Pages
import LoginPage from '@/app/login/page'
import RegisterPage from '@/app/register/page'
import ForgotPasswordPage from '@/app/forgot-password/page'

// Main Pages
import DashboardPage from '@/app/dashboard/page'
import DatasetsPage from '@/app/datasets/page'
import DatasetDetailPage from '@/app/datasets/[id]/page'
import UploadDatasetPage from '@/app/datasets/upload/page'
import AnalyticsPage from '@/app/analytics/page'
import VisualizationsPage from '@/app/visualizations/page'
import AIChatPage from '@/app/chat/page'
import HistoryPage from '@/app/history/page'
import SettingsPage from '@/app/settings/page'
import ProfilePage from '@/app/profile/page'
import AdminPage from '@/app/admin/page'

// 404
import NotFoundPage from '@/app/404/page'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitialized, isLoading } = useAuthStore()

  // TEMPORARY DEMO BYPASS — always allow access to see full design
  // Remove this block before production
  if (true) {
    return <>{children}</>
  }

  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F6F2]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3A4B41]" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuthStore()
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  if (!user?.is_superuser) {
    return <Navigate to="/dashboard" replace />
  }
  
  return <>{children}</>
}

export function AppRoutes() {
  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      {/* Protected Application Routes */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        
        {/* Datasets */}
        <Route path="/datasets" element={<DatasetsPage />} />
        <Route path="/datasets/upload" element={<UploadDatasetPage />} />
        <Route path="/datasets/:id" element={<DatasetDetailPage />} />
        
        {/* Analytics */}
        <Route path="/analytics" element={<AnalyticsPage />} />
        
        {/* Visualizations */}
        <Route path="/visualizations" element={<VisualizationsPage />} />
        
        {/* AI Chat */}
        <Route path="/chat" element={<AIChatPage />} />
        <Route path="/history" element={<HistoryPage />} />
        
        {/* Settings & Profile */}
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        
        {/* Admin */}
        <Route 
          path="/admin" 
          element={
            <AdminRoute>
              <AdminPage />
            </AdminRoute>
          } 
        />
        
        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

import { Outlet, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { MobileDrawer } from "@/components/layout/mobile-drawer";
import { PageSkeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-api";
import { api } from "@/services/api";
import { useAuthStore } from "@/store";
import { useEffect } from "react";

export function AppLayout() {
  const navigate = useNavigate();
  const { isLoading, data: user } = useCurrentUser();
  const logout = useAuthStore((s) => s.logout);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    const handler = () => {
      logout();
      navigate("/login");
    };
    window.addEventListener("auth:logout", handler);
    return () => window.removeEventListener("auth:logout", handler);
  }, [logout, navigate]);

  useEffect(() => {
    if (!isLoading && !user && !isAuthenticated) {
      navigate("/login", { replace: true });
    }
  }, [isLoading, user, isAuthenticated, navigate]);

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      /* proceed */
    }
    logout();
    navigate("/login");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background">
        <PageSkeleton />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <MobileDrawer onLogout={handleLogout} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Navbar />
        <motion.main
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className="flex-1 flex min-h-0 flex-col overflow-hidden"
        >
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
            <Outlet />
          </div>
        </motion.main>
      </div>
    </div>
  );
}

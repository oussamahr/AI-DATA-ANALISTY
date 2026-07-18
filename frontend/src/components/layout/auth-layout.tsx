import { Outlet, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";
import { useAuthStore } from "@/store";

export function AuthLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden w-1/2 flex-col justify-between bg-sidebar p-12 lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-accent/20">
            <BarChart3 className="size-6 text-accent" />
          </div>
          <div>
            <p className="text-xl font-semibold text-white">InsightAI</p>
            <p className="text-sm text-sidebar-foreground/60">Enterprise Analytics</p>
          </div>
        </div>

        <div className="max-w-md">
          <h2 className="text-4xl font-semibold leading-tight tracking-tight text-white">
            Transform data into intelligent insights
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-sidebar-foreground/70">
            Upload datasets, run advanced analytics, visualize trends, and converse with AI — all in one elegant platform.
          </p>
        </div>

        <p className="text-sm text-sidebar-foreground/50">
          Trusted by data teams worldwide
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center p-6 sm:p-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
              <BarChart3 className="size-5 text-primary" />
            </div>
            <span className="text-lg font-semibold text-foreground">InsightAI</span>
          </div>
          <Outlet />
        </motion.div>
      </div>
    </div>
  );
}

import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  Bot,
  Database,
  History,
  LayoutDashboard,
  LineChart,
  LogOut,
  Menu,
  Settings,
  Shield,
  Upload,
  X,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { useAuthStore, useSidebarStore } from "@/store";

const mobileNavItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/datasets", label: "Datasets", icon: Database },
  { to: "/datasets/upload", label: "Upload", icon: Upload },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/visualizations", label: "Visualizations", icon: LineChart },
  { to: "/chat", label: "AI Chat", icon: Bot },
  { to: "/history", label: "History", icon: History },
  { to: "/settings", label: "Settings", icon: Settings },
];

interface MobileDrawerProps {
  onLogout: () => void;
}

export function MobileDrawer({ onLogout }: MobileDrawerProps) {
  const isOpen = useSidebarStore((s) => s.isMobileOpen);
  const setOpen = useSidebarStore((s) => s.setMobileOpen);
  const user = useAuthStore((s) => s.user);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-sidebar text-sidebar-foreground lg:hidden"
            aria-label="Mobile navigation"
          >
            <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-accent/20">
                  <BarChart3 className="size-5 text-accent" />
                </div>
                <span className="font-semibold text-white">InsightAI</span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-sidebar-foreground/70 hover:bg-white/5 hover:text-white"
                aria-label="Close menu"
              >
                <X className="size-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
              {mobileNavItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition hover:bg-white/5 hover:text-white"
                >
                  <item.icon className="size-5" aria-hidden />
                  {item.label}
                </Link>
              ))}
              {user?.is_superuser && (
                <Link
                  to="/admin"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition hover:bg-white/5 hover:text-white"
                >
                  <Shield className="size-5" aria-hidden />
                  Admin
                </Link>
              )}
            </nav>

            <div className="border-t border-white/10 p-3">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onLogout();
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                  "text-sidebar-foreground/70 transition hover:bg-white/5 hover:text-white",
                )}
              >
                <LogOut className="size-5" aria-hidden />
                Sign out
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

export function MobileMenuButton() {
  const setOpen = useSidebarStore((s) => s.setMobileOpen);
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="rounded-xl p-2 text-muted transition hover:bg-muted-surface hover:text-foreground lg:hidden"
      aria-label="Open menu"
    >
      <Menu className="size-5" />
    </button>
  );
}

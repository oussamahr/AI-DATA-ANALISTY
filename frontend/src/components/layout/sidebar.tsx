import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BarChart3,
  Bot,
  ChevronLeft,
  Database,
  History,
  LayoutDashboard,
  LineChart,
  Settings,
  Shield,
  Upload,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { useAuthStore, useSidebarStore } from "@/store";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/datasets", label: "Datasets", icon: Database },
  { to: "/datasets/upload", label: "Upload", icon: Upload },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/visualizations", label: "Visualizations", icon: LineChart },
  { to: "/chat", label: "AI Chat", icon: Bot },
  { to: "/history", label: "History", icon: History },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const isOpen = useSidebarStore((s) => s.isOpen);
  const toggle = useSidebarStore((s) => s.toggle);
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.is_superuser;

  return (
    <motion.aside
      initial={false}
      animate={{ width: isOpen ? 260 : 80 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="relative hidden h-full shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:flex"
      aria-label="Main navigation"
    >
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent/20">
          <BarChart3 className="size-5 text-accent" />
        </div>
        {isOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-hidden">
            <p className="text-sm font-semibold text-foreground">Neuralytics</p>
            <p className="text-xs text-sidebar-foreground/60">AI Data Analytics</p>
          </motion.div>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-foreground/10 text-foreground"
                  : "text-sidebar-foreground/70 hover:bg-foreground/5 hover:text-foreground",
              )
            }
          >
            <item.icon className="size-5 shrink-0" aria-hidden />
            {isOpen && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}

        {isAdmin && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-accent/20 text-accent"
                  : "text-sidebar-foreground/70 hover:bg-foreground/5 hover:text-foreground",
              )
            }
          >
            <Shield className="size-5 shrink-0" aria-hidden />
            {isOpen && <span className="truncate">Admin</span>}
          </NavLink>
        )}
      </nav>

      <button
        type="button"
        onClick={toggle}
        className="absolute -right-3 top-20 flex size-6 items-center justify-center rounded-full border border-border bg-surface text-muted shadow-soft transition hover:text-foreground"
        aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
      >
        <ChevronLeft className={cn("size-3.5 transition-transform", !isOpen && "rotate-180")} />
      </button>
    </motion.aside>
  );
}

import { Outlet, Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Database, Activity, BarChart, Settings, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/datasets", label: "Datasets", icon: Database },
  { path: "/assistant", label: "AI Assistant", icon: Bot },
  { path: "/analytics", label: "Analytics", icon: Activity },
  { path: "/visualizations", label: "Visualizations", icon: BarChart },
];

export function AppLayout() {
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card hidden md:block">
        <div className="flex h-16 items-center px-6 border-b border-border">
          <span className="text-lg font-bold">DataAnalyst AI</span>
        </div>
        <nav className="p-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-background flex items-center justify-between px-6">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold capitalize">
              {location.pathname === "/" ? "Dashboard" : location.pathname.slice(1)}
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            {/* User profile placeholder */}
            <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center">
              <Settings className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
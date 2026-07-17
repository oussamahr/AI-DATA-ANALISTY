import {
  LayoutDashboard,
  Database,
  Bot,
  BarChart3,
  Activity,
  Wrench,
  ShieldCheck,
  Building2,
  Users,
  Plug,
} from "lucide-react";

export interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[]; // allowed roles, undefined = all
  description?: string;
  badge?: string;
  section?: "main" | "admin" | "system";
}

export const navigation: NavItem[] = [
  // Main
  { path: "/", label: "Dashboard", icon: LayoutDashboard, section: "main", description: "Overview & quick actions" },
  { path: "/datasets", label: "Datasets", icon: Database, section: "main", description: "Upload & manage data" },
  { path: "/assistant", label: "AI Assistant", icon: Bot, section: "main", description: "Natural language queries" },
  { path: "/analytics", label: "Analytics", icon: Activity, section: "main", description: "Profiles & insights" },
  { path: "/visualizations", label: "Visualize", icon: BarChart3, section: "main", description: "Charts & trends" },
  { path: "/transforms", label: "Transforms", icon: Wrench, section: "main", description: "Clean & transform" },
  { path: "/connections", label: "Connections", icon: Plug, section: "main", description: "External databases" },
  // Admin / System - role gated
  { path: "/tenants", label: "Tenants", icon: Building2, section: "admin", roles: ["admin", "owner"], description: "Tenant management" },
  { path: "/admin", label: "Admin", icon: ShieldCheck, section: "admin", roles: ["admin"], description: "Users & stats" },
  { path: "/admin/roles", label: "Roles", icon: Users, section: "admin", roles: ["admin"], description: "Role management" },
];

export function filterNavByRole(items: NavItem[], userRole?: string | null, isAdmin?: boolean): NavItem[] {
  return items.filter((item) => {
    if (!item.roles) return true;
    if (isAdmin) return true;
    if (!userRole) return false;
    return item.roles.includes(userRole);
  });
}

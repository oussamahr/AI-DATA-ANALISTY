import { useEffect, useState } from "react";
import api from "@/lib/api";
import type { User, DashboardStats } from "@/types/api";
import { GlassCard } from "@/components/common/GlassCard";
import { formatBytes, colorMap } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Database,
  Activity,
  HardDrive,
  Shield,
} from "lucide-react";

const statConfig = [
  { key: "users", label: "Users", icon: Users, color: "teal" as const },
  { key: "datasets", label: "Datasets", icon: Database, color: "violet" as const },
  { key: "queries", label: "LLM Queries", icon: Activity, color: "amber" as const },
  { key: "storage", label: "Storage", icon: HardDrive, color: "green" as const },
];

export function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, statsRes] = await Promise.all([
          api.get<{ items: User[] }>("/admin/users"),
          api.get<DashboardStats>("/admin/stats"),
        ]);
        setUsers(usersRes.data.items);
        setStats(statsRes.data);
      } catch {
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const statValues: Record<string, string> = stats
    ? {
        users: String(stats.total_users),
        datasets: String(stats.total_datasets),
        queries: String(stats.total_queries),
        storage: formatBytes(stats.storage_used_bytes),
      }
    : {};

  return (
    <div className="space-y-8 animate-fade-blur-in">
      <div>
        <h1 className="font-display text-[32px] leading-tight font-bold text-ink flex items-center gap-3">
          <Shield className="h-7 w-7 text-teal" />
          Admin Panel
        </h1>
        <p className="text-sm text-ink-dim mt-1.5">
          Platform administration and user management
        </p>
      </div>

      {stats && (
        <div className="grid gap-5 grid-cols-2 lg:grid-cols-4 stagger-children">
          {statConfig.map(({ key, label, icon: Icon, color }) => {
            const c = colorMap[color];
            return (
              <GlassCard key={key} elevation="default" animate={false}>
                <div className="flex items-start justify-between mb-5">
                  <span className="text-xs font-semibold text-ink-dim uppercase tracking-wider">
                    {label}
                  </span>
                  <div
                    className={`w-10 h-10 rounded-[var(--radius-sm)] ${c.bg} border ${c.border} flex items-center justify-center`}
                  >
                    <Icon className={`h-5 w-5 ${c.text}`} />
                  </div>
                </div>
                <div className="font-mono text-[36px] font-bold text-ink leading-none tracking-tight">
                  {statValues[key]}
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      <GlassCard elevation="default">
        <h2 className="text-sm font-semibold text-ink-dim uppercase tracking-wider mb-5">
          Users
        </h2>
        {isLoading ? (
          <div className="text-center py-10">
            <div className="h-6 w-6 border-2 border-glass-border-strong border-t-teal rounded-full animate-spin mx-auto" />
          </div>
        ) : users.length === 0 ? (
          <p className="text-sm text-ink-dim text-center py-10">
            No users found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-glass-border hover:bg-transparent">
                  <TableHead className="text-ink-faint font-mono text-xs uppercase">
                    Email
                  </TableHead>
                  <TableHead className="text-ink-faint font-mono text-xs uppercase">
                    Name
                  </TableHead>
                  <TableHead className="text-ink-faint font-mono text-xs uppercase">
                    Status
                  </TableHead>
                  <TableHead className="text-ink-faint font-mono text-xs uppercase">
                    Verified
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow
                    key={user.id}
                    className="border-glass-border hover:bg-glass-bg-strong"
                  >
                    <TableCell className="font-medium text-ink font-mono text-sm">
                      {user.email}
                    </TableCell>
                    <TableCell className="text-ink-dim">
                      {user.first_name} {user.last_name}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={`font-mono text-[10px] uppercase border ${
                          user.is_active
                            ? "bg-surface-success text-green-400 border-surface-success-border"
                            : "bg-surface-error text-red-400 border-surface-error-border"
                        }`}
                      >
                        {user.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={`font-mono text-[10px] uppercase border ${
                          user.is_verified
                            ? "bg-surface-success text-green-400 border-surface-success-border"
                            : "bg-glass-bg-strong text-ink-dim border-glass-border"
                        }`}
                      >
                        {user.is_verified ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}

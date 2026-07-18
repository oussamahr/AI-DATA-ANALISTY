import { Shield, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSkeleton } from "@/components/ui/skeleton";
import { DataTable, DataTableCell, DataTableRow } from "@/components/ui/table";
import { useAdminStats, useAdminUsers } from "@/hooks/use-api";
import { formatDate, formatNumber, getErrorMessage } from "@/utils/cn";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store";

export function AdminPage() {
  const user = useAuthStore((s) => s.user);
  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const { data: users, isLoading: usersLoading, error } = useAdminUsers();

  if (!user?.is_superuser) {
    return <Navigate to="/dashboard" replace />;
  }

  if (statsLoading || usersLoading) return <PageSkeleton />;

  return (
    <div className="page-container space-y-6">
      <div>
        <h1 className="page-title">Admin</h1>
        <p className="page-subtitle">System administration and user management</p>
      </div>

      {error && (
        <div className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
          {getErrorMessage(error)}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
              <Users className="size-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted">Total Users</p>
              <p className="text-2xl font-semibold text-foreground">{formatNumber(stats?.total_users)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex size-12 items-center justify-center rounded-xl bg-accent/30">
              <Shield className="size-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted">Total Tenants</p>
              <p className="text-2xl font-semibold text-foreground">{formatNumber(stats?.total_tenants)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Users</CardTitle></CardHeader>
        <CardContent className="p-0 pb-2">
          <DataTable
            columns={[
              { key: "email", header: "Email" },
              { key: "name", header: "Name" },
              { key: "status", header: "Status" },
              { key: "last_login", header: "Last Login" },
            ]}
          >
            {(users ?? []).map((u) => (
              <DataTableRow key={u.id}>
                <DataTableCell>{u.email}</DataTableCell>
                <DataTableCell>{u.first_name} {u.last_name}</DataTableCell>
                <DataTableCell>
                  <Badge variant={u.is_active ? "success" : "danger"}>
                    {u.is_active ? "Active" : "Inactive"}
                  </Badge>
                </DataTableCell>
                <DataTableCell className="text-muted">{formatDate(u.last_login_at)}</DataTableCell>
              </DataTableRow>
            ))}
          </DataTable>
        </CardContent>
      </Card>
    </div>
  );
}

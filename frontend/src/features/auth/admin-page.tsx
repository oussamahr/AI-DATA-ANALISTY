import { Shield, Users, Check, Search, Filter, MoreVertical, UserCheck, UserX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSkeleton } from "@/components/ui/skeleton";
import { DataTable, DataTableCell, DataTableRow } from "@/components/ui/table";
import { useAdminStats, useAdminUsers, useVerifyUser, useRoles, useAssignRole } from "@/hooks/use-api";
import { formatDate, formatNumber, getErrorMessage } from "@/utils/cn";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store";
import { useState } from "react";

export function AdminPage() {
  const user = useAuthStore((s) => s.user);
  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const { data: users, isLoading: usersLoading, error } = useAdminUsers();
  const { data: roles } = useRoles();
  const { mutate: verifyUser, isPending: isVerifying } = useVerifyUser();
  const { mutate: assignRole } = useAssignRole();
  const [filter, setFilter] = useState<"all" | "active" | "inactive" | "verified" | "unverified">("all");

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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex size-12 items-center justify-center rounded-xl bg-success/10">
              <UserCheck className="size-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted">Verified Users</p>
              <p className="text-2xl font-semibold text-foreground">
                {formatNumber((users ?? []).filter((u) => u.is_verified).length)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex size-12 items-center justify-center rounded-xl bg-danger/10">
              <UserX className="size-6 text-danger" />
            </div>
            <div>
              <p className="text-sm text-muted">Unverified Users</p>
              <p className="text-2xl font-semibold text-foreground">
                {formatNumber((users ?? []).filter((u) => !u.is_verified).length)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {(["all", "active", "inactive", "verified", "unverified"] as const).map((f) => (
                <Button
                  key={f}
                  variant={filter === f ? "accent" : "ghost"}
                  size="sm"
                  onClick={() => setFilter(f)}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 pb-2">
          <DataTable
            columns={[
              { key: "email", header: "Email" },
              { key: "name", header: "Name" },
              { key: "status", header: "Status" },
              { key: "verified", header: "Verified" },
              { key: "role", header: "Role" },
              { key: "last_login", header: "Last Login" },
            ]}
          >
            {(users ?? [])
              .filter((u) => {
                if (filter === "active") return u.is_active;
                if (filter === "inactive") return !u.is_active;
                if (filter === "verified") return u.is_verified;
                if (filter === "unverified") return !u.is_verified;
                return true;
              })
              .map((u) => (
                <DataTableRow key={u.id}>
                  <DataTableCell>{u.email}</DataTableCell>
                  <DataTableCell>{u.first_name} {u.last_name}</DataTableCell>
                  <DataTableCell>
                    <Badge variant={u.is_active ? "success" : "danger"}>
                      {u.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </DataTableCell>
                  <DataTableCell>
                    {u.is_verified ? (
                      <Badge variant="success">Verified</Badge>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => verifyUser(u.id)}
                        disabled={isVerifying}
                      >
                        <Check className="size-4" />
                        Verify
                      </Button>
                    )}
                  </DataTableCell>
                  <DataTableCell>
                    <Badge variant="outline">
                      {u.role_id ? (roles ?? []).find((r) => r.id === u.role_id)?.name || "Custom" : "None"}
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

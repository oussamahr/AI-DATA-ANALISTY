import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "../api";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export function AdminPage() {
  const statsQ = useQuery({ queryKey: ["admin", "stats"], queryFn: adminApi.stats });
  const usersQ = useQuery({ queryKey: ["admin", "users"], queryFn: () => adminApi.users(50, 0) });

  return (
    <div className="space-y-6">
      <PageHeader title="Admin" description="Restricted to superuser role. Audit-logged access." />

      <div className="grid gap-4 md:grid-cols-2">
        <Card><CardHeader><CardTitle className="text-sm">Total Users</CardTitle></CardHeader><CardContent>{statsQ.isLoading ? <LoadingSpinner /> : <div className="text-2xl font-semibold">{statsQ.data?.total_users ?? 0}</div>}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Total Tenants</CardTitle></CardHeader><CardContent>{statsQ.isLoading ? <LoadingSpinner /> : <div className="text-2xl font-semibold">{statsQ.data?.total_tenants ?? 0}</div>}</CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Users</CardTitle></CardHeader>
        <CardContent>
          {usersQ.isLoading ? <LoadingSpinner /> : (
            <Table><TableHeader><TableRow><TableHead>Email</TableHead><TableHead>Name</TableHead><TableHead>Verified</TableHead><TableHead>Active</TableHead></TableRow></TableHeader><TableBody>{usersQ.data?.map(u => <TableRow key={u.id}><TableCell>{u.email}</TableCell><TableCell>{u.first_name} {u.last_name}</TableCell><TableCell><Badge variant={u.is_verified ? "success" : "secondary"}>{u.is_verified ? "yes" : "no"}</Badge></TableCell><TableCell><Badge variant={u.is_active ? "success" : "destructive"}>{u.is_active ? "active" : "inactive"}</Badge></TableCell></TableRow>)}</TableBody></Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

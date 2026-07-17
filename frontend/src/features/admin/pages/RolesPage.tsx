import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../api";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { useState } from "react";
import { toast } from "sonner";
import { formatApiError } from "@/lib/api-error";
import { Badge } from "@/components/ui/badge";

export function RolesPage() {
  const qc = useQueryClient();
  const rolesQ = useQuery({ queryKey: ["roles"], queryFn: adminApi.roles });
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  const createMut = useMutation({
    mutationFn: adminApi.createRole,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["roles"] }); toast.success("Role created"); },
    onError: (e) => toast.error(formatApiError(e).userMessage),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Roles" description="RBAC roles: admin, analyst, viewer. System roles protected." />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Create role</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. analyst" /></div>
            <div className="space-y-2"><Label>Description</Label><Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description" /></div>
            <Button className="w-full" disabled={createMut.isPending || !name} onClick={() => createMut.mutate({ name, description: desc, permissions: [] })}>Create</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Existing roles</CardTitle></CardHeader>
          <CardContent>
            {rolesQ.isLoading ? <LoadingSpinner /> : (
              <div className="space-y-2">
                {rolesQ.data?.map(r => <div key={r.id} className="p-2 border rounded text-sm flex justify-between"><span className="font-medium">{r.name}</span><Badge variant="outline">{r.permissions.length} perms</Badge></div>)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

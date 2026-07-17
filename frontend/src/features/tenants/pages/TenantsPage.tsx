import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tenantApi } from "../api";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { useState } from "react";
import { toast } from "sonner";
import { formatApiError } from "@/lib/api-error";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function TenantsPage() {
  const qc = useQueryClient();
  const [tenantName, setTenantName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");

  const membersQ = useQuery({ queryKey: ["tenants", "members"], queryFn: tenantApi.members });
  const invitesQ = useQuery({ queryKey: ["tenants", "invites"], queryFn: tenantApi.invitations });

  const createMut = useMutation({
    mutationFn: tenantApi.create,
    onSuccess: () => { toast.success("Tenant created"); qc.invalidateQueries({ queryKey: ["tenants"] }); },
    onError: (e) => toast.error(formatApiError(e).userMessage),
  });

  const inviteMut = useMutation({
    mutationFn: ({ email }: { email: string }) => tenantApi.invite(email),
    onSuccess: () => { toast.success("Invitation sent"); qc.invalidateQueries({ queryKey: ["tenants", "invites"] }); },
    onError: (e) => toast.error(formatApiError(e).userMessage),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Tenants" description="Tenant management with RLS isolation. Owner role required." />

      <div className="grid gap-6 md:grid-cols-2">
        <Card><CardHeader><CardTitle className="text-base">Create tenant</CardTitle></CardHeader><CardContent className="space-y-3"><div className="space-y-2"><Label>Name</Label><Input value={tenantName} onChange={e => setTenantName(e.target.value)} placeholder="Acme Corp" /></div><Button className="w-full" onClick={() => createMut.mutate({ name: tenantName })} disabled={createMut.isPending || !tenantName}>Create</Button></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Invite user</CardTitle></CardHeader><CardContent className="space-y-3"><div className="space-y-2"><Label>Email</Label><Input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="user@company.com" /></div><Button className="w-full" onClick={() => inviteMut.mutate({ email: inviteEmail })} disabled={inviteMut.isPending || !inviteEmail}>Invite</Button></CardContent></Card>
      </div>

      <Card><CardHeader><CardTitle className="text-base">Members</CardTitle></CardHeader><CardContent>{membersQ.isLoading ? <LoadingSpinner /> : <Table><TableHeader><TableRow><TableHead>Email</TableHead><TableHead>Name</TableHead></TableRow></TableHeader><TableBody>{(membersQ.data as any[])?.map((m: any) => <TableRow key={m.id}><TableCell>{m.email}</TableCell><TableCell>{m.first_name} {m.last_name}</TableCell></TableRow>)}</TableBody></Table>}</CardContent></Card>

      <Card><CardHeader><CardTitle className="text-base">Invitations</CardTitle></CardHeader><CardContent>{invitesQ.isLoading ? <LoadingSpinner /> : <Table><TableHeader><TableRow><TableHead>Email</TableHead><TableHead>Accepted</TableHead><TableHead>Expires</TableHead></TableRow></TableHeader><TableBody>{(invitesQ.data as any[])?.map((inv: any) => <TableRow key={inv.id}><TableCell>{inv.email}</TableCell><TableCell>{inv.is_accepted ? "yes" : "no"}</TableCell><TableCell>{new Date(inv.expires_at).toLocaleString()}</TableCell></TableRow>)}</TableBody></Table>}</CardContent></Card>
    </div>
  );
}

import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { connectionsApi } from "../api";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { useState } from "react";
import { toast } from "sonner";
import { formatApiError } from "@/lib/api-error";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function ConnectionsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", host: "", port: "5432", database_name: "", username: "", password: "", description: "" });
  const [query, setQuery] = useState("SELECT * FROM information_schema.tables LIMIT 10");
  const [selectedId, setSelectedId] = useState("");

  const listQ = useQuery({ queryKey: ["connections"], queryFn: connectionsApi.list });
  const schemaQ = useQuery({ queryKey: ["connections", selectedId, "schema"], queryFn: () => connectionsApi.schema(selectedId), enabled: !!selectedId });

  const createMut = useMutation({
    mutationFn: connectionsApi.create,
    onSuccess: () => { toast.success("Connection created"); qc.invalidateQueries({ queryKey: ["connections"] }); },
    onError: (e) => toast.error(formatApiError(e).userMessage),
  });

  const queryMut = useMutation({
    mutationFn: () => connectionsApi.query(selectedId, query, 100),
    onError: (e) => toast.error(formatApiError(e).userMessage),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Connections" description="Read-only external PostgreSQL connections. SQL validation blocks DROP/DELETE/INSERT etc. Requires verified email." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">New connection</CardTitle><CardDescription>Credentials encrypted, read-only role enforced server-side</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Host</Label><Input value={form.host} onChange={e => setForm({ ...form, host: e.target.value })} placeholder="db.example.com" /></div>
              <div className="space-y-2"><Label>Port</Label><Input value={form.port} onChange={e => setForm({ ...form, port: e.target.value })} /></div>
              <div className="space-y-2"><Label>Database</Label><Input value={form.database_name} onChange={e => setForm({ ...form, database_name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Username</Label><Input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} /></div>
              <div className="space-y-2"><Label>Password</Label><Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <Button className="w-full" disabled={createMut.isPending} onClick={() => createMut.mutate(form as any)}>{createMut.isPending ? "Creating..." : "Create connection"}</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Existing connections</CardTitle></CardHeader>
          <CardContent>
            {listQ.isLoading ? <LoadingSpinner /> : (
              <div className="space-y-2">
                {(listQ.data?.connections as any[])?.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">No connections</p> :
                  (listQ.data?.connections as any[])?.map((c: any) => <div key={c.id || c.name} className={`p-2 border rounded cursor-pointer ${selectedId === c.id ? "border-primary" : ""}`} onClick={() => setSelectedId(c.id)}><p className="text-sm font-medium">{c.name}</p><p className="text-xs text-muted-foreground">{c.host}:{c.port} / {c.database_name}</p></div>)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedId && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Schema: {selectedId.slice(0,8)}</CardTitle></CardHeader>
            <CardContent>
              {schemaQ.isLoading ? <LoadingSpinner /> : schemaQ.data ? <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-[300px]">{JSON.stringify(schemaQ.data, null, 2)}</pre> : <p className="text-sm text-muted-foreground">No schema data</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Query</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Textarea value={query} onChange={e => setQuery(e.target.value)} rows={5} />
              <Button onClick={() => queryMut.mutate()} disabled={queryMut.isPending} className="w-full">{queryMut.isPending ? "Running..." : "Execute read-only"}</Button>
              {queryMut.data && <div className="max-h-[300px] overflow-auto border rounded"><Table><TableHeader><TableRow>{queryMut.data.columns?.map((col: string) => <TableHead key={col}>{col}</TableHead>)}</TableRow></TableHeader><TableBody>{queryMut.data.rows?.slice(0,20).map((row: any, idx: number) => <TableRow key={idx}>{queryMut.data.columns.map((col: string) => <TableCell key={col} className="text-xs">{String(row[col] ?? "")}</TableCell>)}</TableRow>)}</TableBody></Table></div>}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

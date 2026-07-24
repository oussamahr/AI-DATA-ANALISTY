"use client";

import { useState, useEffect } from "react";
import {
  Database,
  Plus,
  Save,
  Search,
  Table,
  Columns,
  Play,
  Trash2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PageSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { api } from "@/services/api";
import { getErrorMessage } from "@/utils/cn";

interface DbConnection {
  id: string;
  name: string;
  status: string;
}

interface TableColumn {
  name: string;
  type: string;
}

interface SchemaInfo {
  schema: string;
  tables: string[];
  columns: Record<string, TableColumn[]>;
}

interface QueryResult {
  columns: string[];
  rows: Record<string, any>[];
  row_count: number;
  truncated: boolean;
}

export function DbConnectionsPage() {
  const [connections, setConnections] = useState<DbConnection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<DbConnection | null>(null);
  const [schema, setSchema] = useState<SchemaInfo | null>(null);
  const [query, setQuery] = useState("");
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    host: "",
    port: "5432",
    database_name: "",
    schema_name: "public",
    username: "",
    password: "",
  });

  const loadConnections = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.listDbConnections();
      setConnections(data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConnections();
  }, []);

  const handleCreate = async () => {
    if (!formData.name || !formData.host || !formData.database_name || !formData.username) {
      setError("Please fill in all required fields");
      return;
    }
    setIsCreating(true);
    setError(null);
    try {
      await api.createDbConnection(formData);
      setShowCreateForm(false);
      setFormData({
        name: "",
        description: "",
        host: "",
        port: "5432",
        database_name: "",
        schema_name: "public",
        username: "",
        password: "",
      });
      await loadConnections();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectConnection = async (conn: DbConnection) => {
    setSelectedConnection(conn);
    setSchema(null);
    setQueryResult(null);
    setQuery("");
    setError(null);

    try {
      const data = await api.introspectDbSchema(conn.id);
      setSchema(data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleExecuteQuery = async () => {
    if (!selectedConnection || !query.trim()) return;

    setQueryResult(null);
    setError(null);
    try {
      const data = await api.executeDbQuery(selectedConnection.id, query);
      setQueryResult(data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  if (isLoading && !connections.length) return <PageSkeleton />;

  return (
    <div className="page-container space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Database Connections</h1>
          <p className="page-subtitle">Connect to external databases and run safe read-only queries</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)} variant="default">
          <Plus className="mr-2 size-4" />
          Add Connection
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger flex items-start gap-2">
          <AlertCircle className="size-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>New Database Connection</CardTitle>
            <CardDescription>Add a read-only database connection for analysis</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="name">Connection Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Production DB"
                />
              </div>
              <div>
                <Label htmlFor="host">Host *</Label>
                <Input
                  id="host"
                  value={formData.host}
                  onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                  placeholder="e.g., db.example.com"
                />
              </div>
              <div>
                <Label htmlFor="port">Port</Label>
                <Input
                  id="port"
                  value={formData.port}
                  onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="database_name">Database Name *</Label>
                <Input
                  id="database_name"
                  value={formData.database_name}
                  onChange={(e) => setFormData({ ...formData, database_name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="schema_name">Schema</Label>
                <Input
                  id="schema_name"
                  value={formData.schema_name}
                  onChange={(e) => setFormData({ ...formData, schema_name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                  rows={2}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={isCreating}>
                {isCreating ? "Creating..." : "Create Connection"}
              </Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {/* Connection list */}
        <div className="md:col-span-1 space-y-3">
          <h2 className="text-sm font-semibold text-muted">Connections</h2>
          {connections.length === 0 ? (
            <EmptyState
              icon={Database}
              title="No connections"
              description="Add your first database connection to get started."
            />
          ) : (
            <div className="space-y-2">
              {connections.map((conn) => (
                <Card
                  key={conn.id}
                  className={`cursor-pointer transition-all hover:shadow-soft ${
                    selectedConnection?.id === conn.id ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => handleSelectConnection(conn)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Database className="size-4" />
                      {conn.name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant={conn.status === "active" ? "success" : "secondary"}>
                        {conn.status}
                      </Badge>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Schema and query panel */}
        <div className="md:col-span-2 space-y-4">
          {selectedConnection ? (
            <>
              {/* Schema browser */}
              {schema && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Table className="size-4" />
                      Schema: {schema.schema}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <span className="text-xs font-medium text-muted">Tables ({schema.tables.length})</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {schema.tables.map((table) => (
                            <Badge key={table} variant="outline" className="text-xs">
                              {table}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      {schema.tables.map((table) => (
                        <div key={table} className="border-t pt-2">
                          <span className="text-xs font-medium text-muted">{table}</span>
                          <div className="mt-1 grid grid-cols-1 gap-1 sm:grid-cols-2 md:grid-cols-3">
                            {schema.columns[table]?.map((col) => (
                              <div key={col.name} className="flex items-center gap-1 text-xs">
                                <Columns className="size-3 text-muted" />
                                <span className="font-mono">{col.name}</span>
                                <Badge variant="secondary" className="text-xs">
                                  {col.type}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Query editor */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">SQL Query Editor</CardTitle>
                  <CardDescription>
                    Write read-only SQL queries. Results are limited to 10,000 rows.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="SELECT * FROM table_name LIMIT 100;"
                    rows={6}
                    className="font-mono text-sm"
                  />
                  <div className="mt-3 flex gap-2">
                    <Button onClick={handleExecuteQuery} variant="default">
                      <Play className="mr-2 size-4" />
                      Run Query
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setQuery("SELECT * FROM " + (schema?.tables[0] || "table_name") + " LIMIT 100;")}
                    >
                      <RefreshCw className="mr-2 size-4" />
                      Template
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Query results */}
              {queryResult && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span>Query Results</span>
                      <Badge variant="secondary">
                        {queryResult.row_count} rows
                        {queryResult.truncated && " (truncated)"}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr>
                            {queryResult.columns.map((col) => (
                              <th key={col} className="border-b px-2 py-1 text-left font-medium">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {queryResult.rows.map((row, i) => (
                            <tr key={i}>
                              {queryResult.columns.map((col) => (
                                <td key={col} className="border-b px-2 py-1">
                                  {row[col] !== null && row[col] !== undefined
                                    ? String(row[col])
                                    : "NULL"}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <EmptyState
              icon={Search}
              title="Select a connection"
              description="Choose a database connection from the list to browse schema and run queries."
            />
          )}
        </div>
      </div>
    </div>
  );
}

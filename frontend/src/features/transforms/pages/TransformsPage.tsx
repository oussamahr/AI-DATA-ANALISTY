import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDatasets } from "@/features/datasets/hooks";
import { useTransforms, useCreateTransform, useApplyTransforms, useDeleteTransform } from "../hooks";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatApiError } from "@/lib/api-error";
import { Trash2, Plus, Wand2 } from "lucide-react";

export function TransformsPage() {
  const [datasetId, setDatasetId] = useState("");
  const [type, setType] = useState("impute");
  const [col, setCol] = useState("");
  const [strategy, setStrategy] = useState("mean");
  const [newName, setNewName] = useState("");
  const [outputName, setOutputName] = useState("");

  const { data: datasets } = useDatasets(1, 100);
  const { data: transforms } = useTransforms(datasetId);
  const createMut = useCreateTransform(datasetId);
  const applyMut = useApplyTransforms(datasetId);
  const deleteMut = useDeleteTransform(datasetId);

  const handleCreate = async () => {
    if (!datasetId || !col) { toast.error("Dataset and column required"); return; }
    let config: any = {};
    switch (type) {
      case "impute": config = { column: col, strategy }; break;
      case "cast": config = { column: col, target_type: "numeric" }; break;
      case "rename": config = { column: col, new_name: newName }; break;
      case "drop": config = { columns: [col] }; break;
      case "normalize": config = { column: col, method: "minmax" }; break;
      case "encode": config = { column: col }; break;
      default: config = { column: col };
    }
    try {
      await createMut.mutateAsync({ type, config, name: newName || `${type}_${col}` });
      toast.success("Transform added");
      setCol(""); setNewName("");
    } catch (e) { toast.error(formatApiError(e).userMessage); }
  };

  const handleApply = async () => {
    try {
      await applyMut.mutateAsync(outputName);
      toast.success("Transforms applied, new dataset created");
    } catch (e) { toast.error(formatApiError(e).userMessage); }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Transforms" description="Build a cleaning pipeline. All transforms validated, ordered, and audit-logged." />

      <Card>
        <CardHeader><CardTitle className="text-base">Dataset</CardTitle></CardHeader>
        <CardContent className="flex gap-3">
          <Select value={datasetId} onValueChange={setDatasetId}><SelectTrigger className="max-w-md"><SelectValue placeholder="Select dataset" /></SelectTrigger><SelectContent>{datasets?.items.map(ds => <SelectItem key={ds.id} value={ds.id}>{ds.name}</SelectItem>)}</SelectContent></Select>
        </CardContent>
      </Card>

      {datasetId && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Plus className="h-4 w-4" /> Add transform</CardTitle><CardDescription>Types: impute, outliers, cast, filter, rename, drop, normalize, encode</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Type</Label><Select value={type} onValueChange={setType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="impute">Impute</SelectItem><SelectItem value="remove_outliers">Remove outliers</SelectItem><SelectItem value="cast">Cast</SelectItem><SelectItem value="rename">Rename</SelectItem><SelectItem value="drop">Drop</SelectItem><SelectItem value="normalize">Normalize</SelectItem><SelectItem value="encode">Encode</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>Column</Label><Input value={col} onChange={e => setCol(e.target.value)} placeholder="column_name" /></div>
              </div>
              {(type === "impute") && (<div className="space-y-2"><Label>Strategy</Label><Select value={strategy} onValueChange={setStrategy}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="mean">Mean</SelectItem><SelectItem value="median">Median</SelectItem><SelectItem value="mode">Mode</SelectItem><SelectItem value="drop">Drop</SelectItem></SelectContent></Select></div>)}
              {(type === "rename") && (<div className="space-y-2"><Label>New name</Label><Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="new_column" /></div>)}
              <Button onClick={handleCreate} disabled={createMut.isPending} className="w-full">{createMut.isPending ? "Adding..." : "Add to pipeline"}</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Pipeline ({transforms?.length || 0})</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {!transforms || transforms.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">No transforms yet</p> : (
                <div className="space-y-2 max-h-[300px] overflow-auto">
                  {transforms.map(t => (
                    <div key={t.id} className="flex items-center justify-between p-2 border rounded text-sm">
                      <div><Badge variant="outline" className="mr-2 text-[11px]">{t.transform_type}</Badge><span className="font-medium">{t.name}</span><span className="text-muted-foreground ml-2 text-xs">{JSON.stringify(t.config).slice(0,80)}</span></div>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteMut.mutate(t.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="pt-4 border-t space-y-2">
                <Label>Output dataset name</Label>
                <Input value={outputName} onChange={e => setOutputName(e.target.value)} placeholder="e.g. cleaned_sales" />
                <Button onClick={handleApply} disabled={applyMut.isPending || !transforms || transforms.length===0} className="w-full"><Wand2 className="h-4 w-4 mr-2" />Apply pipeline</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

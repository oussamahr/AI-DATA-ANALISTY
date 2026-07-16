import { useEffect, useState } from "react";
import api from "@/lib/api-client";
import { useDatasetStore } from "@/stores/datasetStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/common/GlassCard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Play, Wand2, Layers } from "lucide-react";

interface Transform {
  id: string;
  type: string;
  params: Record<string, unknown>;
  created_at: string;
}

const transformTypes = [
  { value: "impute", label: "Impute Missing Values", needsValue: true },
  { value: "filter", label: "Filter Rows", needsValue: true },
  { value: "cast", label: "Cast Column Type", needsValue: true },
  { value: "rename", label: "Rename Column", needsValue: true },
  { value: "drop", label: "Drop Columns", needsValue: false },
  { value: "normalize", label: "Normalize", needsValue: false },
  { value: "encode", label: "One-Hot Encode", needsValue: false },
  { value: "remove-outliers", label: "Remove Outliers", needsValue: false },
];

export function TransformsPage() {
  const { datasets, fetchDatasets } = useDatasetStore();
  const [selectedDatasetId, setSelectedDatasetId] = useState("");
  const [transforms, setTransforms] = useState<Transform[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [transformType, setTransformType] = useState("");
  const [transformCol, setTransformCol] = useState("");
  const [transformValue, setTransformValue] = useState("");
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    fetchDatasets();
  }, [fetchDatasets]);

  const fetchTransforms = async () => {
    if (!selectedDatasetId) return;
    try {
      const res = await api.get<{ items: Transform[] }>(
        `/transforms/${selectedDatasetId}`
      );
      setTransforms(res.data.items);
    } catch {
      setTransforms([]);
    }
  };

  useEffect(() => {
    fetchTransforms();
  }, [selectedDatasetId]);

  const addTransform = async () => {
    if (!transformType || !transformCol) return;
    try {
      const params: Record<string, unknown> = { column: transformCol };
      if (transformValue) params.value = transformValue;

      await api.post(`/transforms/${transformType}`, {
        dataset_id: selectedDatasetId,
        ...params,
      });
      await fetchTransforms();
      setAddOpen(false);
      setTransformType("");
      setTransformCol("");
      setTransformValue("");
    } catch {}
  };

  const deleteTransform = async (id: string) => {
    try {
      await api.delete(`/transforms/${id}`);
      await fetchTransforms();
    } catch {}
  };

  const applyTransforms = async () => {
    if (!selectedDatasetId) return;
    setIsApplying(true);
    try {
      await api.post(`/transforms/apply`, {
        dataset_id: selectedDatasetId,
      });
    } catch {
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-blur-in">
      <div>
        <h1 className="page-heading">Data Transforms</h1>
        <p className="page-subheading mt-1">
          Clean and transform your datasets
        </p>
      </div>

      <GlassCard elevation="strong">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-violet-glow border border-violet/20 flex items-center justify-center">
            <Wand2 className="h-4 w-4 text-violet" />
          </div>
          <p className="section-heading">Pipeline</p>
        </div>

        <div className="space-y-4">
          <Select
            value={selectedDatasetId}
            onValueChange={setSelectedDatasetId}
          >
            <SelectTrigger className="h-10 rounded-[var(--radius-sm)] bg-glass-bg border-glass-border text-ink text-[13px] focus:border-teal focus:ring-1 focus:ring-teal">
              <SelectValue placeholder="Select a dataset..." />
            </SelectTrigger>
            <SelectContent className="glass-strong border-glass-border text-ink">
              {datasets.map((ds) => (
                <SelectItem key={ds.id} value={ds.id}>
                  {ds.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex flex-wrap gap-2.5">
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="gap-2 rounded-[var(--radius-sm)] border-glass-border text-ink-dim hover:text-ink hover:border-teal"
                  disabled={!selectedDatasetId}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Transform
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-strong text-ink rounded-[var(--radius-xl)] max-w-md p-0 overflow-hidden">
                <DialogHeader className="px-6 pt-6 pb-0">
                  <DialogTitle className="font-display text-lg font-semibold text-ink">
                    Add Transform
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 p-6 pt-4">
                  <div className="space-y-1.5">
                    <Label className="text-[12px] font-medium text-ink-dim uppercase tracking-wider">
                      Type
                    </Label>
                    <Select
                      value={transformType}
                      onValueChange={setTransformType}
                    >
                      <SelectTrigger className="h-10 rounded-[var(--radius-sm)] bg-glass-bg border-glass-border text-ink text-[13px] focus:border-teal focus:ring-1 focus:ring-teal">
                        <SelectValue placeholder="Select transform type..." />
                      </SelectTrigger>
                      <SelectContent className="glass-strong border-glass-border text-ink">
                        {transformTypes.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[12px] font-medium text-ink-dim uppercase tracking-wider">
                      Column
                    </Label>
                    <Input
                      placeholder="column_name"
                      value={transformCol}
                      onChange={(e) => setTransformCol(e.target.value)}
                      className="h-10 rounded-[var(--radius-sm)] bg-glass-bg border-glass-border text-ink placeholder:text-ink-faint focus:border-teal focus:ring-1 focus:ring-teal"
                    />
                  </div>
                  {transformTypes.find((t) => t.value === transformType)
                    ?.needsValue && (
                    <div className="space-y-1.5">
                      <Label className="text-[12px] font-medium text-ink-dim uppercase tracking-wider">
                        Value
                      </Label>
                      <Input
                        placeholder="value"
                        value={transformValue}
                        onChange={(e) => setTransformValue(e.target.value)}
                        className="h-10 rounded-[var(--radius-sm)] bg-glass-bg border-glass-border text-ink placeholder:text-ink-faint focus:border-teal focus:ring-1 focus:ring-teal"
                      />
                    </div>
                  )}
                  <Button
                    className="w-full h-10 btn-glow"
                    onClick={addTransform}
                    disabled={!transformType || !transformCol}
                  >
                    Add to Pipeline
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <button
              onClick={applyTransforms}
              disabled={
                !selectedDatasetId || transforms.length === 0 || isApplying
              }
              className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-teal hover:bg-teal/90 text-void px-4 py-2 text-[13px] font-medium transition-all disabled:opacity-40 disabled:pointer-events-none"
            >
              <Play className="h-3.5 w-3.5" />
              {isApplying ? "Applying..." : "Apply All"}
            </button>
          </div>
        </div>
      </GlassCard>

      <section>
        <p className="section-heading mb-4">
          Queued Transforms ({transforms.length})
        </p>
        {transforms.length === 0 ? (
          <GlassCard elevation="default" className="text-center py-14">
            <Layers className="h-10 w-10 mx-auto mb-3 text-ink-faint opacity-20" />
            <p className="text-[13px] text-ink-dim">
              No transforms queued. Add one above.
            </p>
          </GlassCard>
        ) : (
          <div className="space-y-2.5 stagger-children">
            {transforms.map((t, i) => (
              <GlassCard key={t.id} elevation="default" animate={false}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-mono text-ink-faint w-5">
                      #{i + 1}
                    </span>
                    <Badge
                      variant="secondary"
                      className="font-mono text-[10px] uppercase"
                    >
                      {t.type}
                    </Badge>
                    <span className="text-[13px] text-ink">
                      {t.params.column as string}
                      {t.params.value ? (
                        <span className="text-ink-faint">
                          {" "}
                          → {t.params.value as string}
                        </span>
                      ) : null}
                    </span>
                  </div>
                  <button
                    onClick={() => deleteTransform(t.id)}
                    className="p-1.5 rounded text-ink-faint hover:text-red-400 hover:bg-surface-error transition-colors"
                    aria-label={`Delete transform ${t.type}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

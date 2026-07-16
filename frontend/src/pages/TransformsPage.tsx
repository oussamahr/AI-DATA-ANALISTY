import { useEffect, useState } from "react";
import api from "@/lib/api";
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
    <div className="space-y-8 animate-fade-blur-in">
      <div>
        <h1 className="font-display text-[32px] leading-tight font-bold text-ink">
          Data Transforms
        </h1>
        <p className="text-sm text-ink-dim mt-1.5">
          Clean and transform your datasets
        </p>
      </div>

      <GlassCard elevation="strong">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-[var(--radius-sm)] bg-violet-glow border border-violet/20 flex items-center justify-center">
            <Wand2 className="h-5 w-5 text-violet" />
          </div>
          <h2 className="text-sm font-semibold text-ink-dim uppercase tracking-wider">
            Pipeline
          </h2>
        </div>

        <div className="space-y-5">
          <Select
            value={selectedDatasetId}
            onValueChange={setSelectedDatasetId}
          >
            <SelectTrigger className="h-11 rounded-full bg-glass-bg border-glass-border text-ink focus:border-teal focus:ring-1 focus:ring-teal">
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

          <div className="flex gap-3">
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="gap-2.5 rounded-full border-glass-border text-ink-dim hover:text-ink hover:border-teal"
                  disabled={!selectedDatasetId}
                >
                  <Plus className="h-4 w-4" />
                  Add Transform
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-strong text-ink rounded-[var(--radius-lg)] max-w-md">
                <DialogHeader>
                  <DialogTitle className="font-display text-lg font-bold text-ink">
                    Add Transform
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-5 pt-2">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-ink-dim uppercase tracking-wider">
                      Type
                    </Label>
                    <Select
                      value={transformType}
                      onValueChange={setTransformType}
                    >
                      <SelectTrigger className="h-11 rounded-full bg-glass-bg border-glass-border text-ink focus:border-teal focus:ring-1 focus:ring-teal">
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
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-ink-dim uppercase tracking-wider">
                      Column
                    </Label>
                    <Input
                      placeholder="column_name"
                      value={transformCol}
                      onChange={(e) => setTransformCol(e.target.value)}
                      className="h-11 rounded-full bg-glass-bg border-glass-border text-ink placeholder:text-ink-faint focus:border-teal focus:ring-1 focus:ring-teal"
                    />
                  </div>
                  {transformTypes.find((t) => t.value === transformType)
                    ?.needsValue && (
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-ink-dim uppercase tracking-wider">
                        Value
                      </Label>
                      <Input
                        placeholder="value"
                        value={transformValue}
                        onChange={(e) => setTransformValue(e.target.value)}
                        className="h-11 rounded-full bg-glass-bg border-glass-border text-ink placeholder:text-ink-faint focus:border-teal focus:ring-1 focus:ring-teal"
                      />
                    </div>
                  )}
                  <Button
                    className="w-full h-11 rounded-full bg-teal hover:bg-teal/90 text-void font-medium transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_26px_rgba(45,212,191,0.5)]"
                    onClick={addTransform}
                    disabled={!transformType || !transformCol}
                  >
                    Add to Pipeline
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button
              onClick={applyTransforms}
              disabled={
                !selectedDatasetId || transforms.length === 0 || isApplying
              }
              className="gap-2.5 rounded-full bg-teal hover:bg-teal/90 text-void font-medium transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_26px_rgba(45,212,191,0.5)]"
            >
              <Play className="h-4 w-4" />
              {isApplying ? "Applying..." : "Apply All"}
            </Button>
          </div>
        </div>
      </GlassCard>

      <div>
        <h2 className="text-sm font-semibold text-ink-dim uppercase tracking-wider mb-5">
          Queued Transforms ({transforms.length})
        </h2>
        {transforms.length === 0 ? (
          <GlassCard elevation="default" className="text-center py-16">
            <Layers className="h-14 w-14 mx-auto mb-4 text-ink-faint opacity-25" />
            <p className="text-sm text-ink-dim">
              No transforms queued. Add one above.
            </p>
          </GlassCard>
        ) : (
          <div className="space-y-3 stagger-children">
            {transforms.map((t, i) => (
              <GlassCard key={t.id} elevation="default" animate={false}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-mono text-ink-faint w-6">
                      #{i + 1}
                    </span>
                    <Badge
                      variant="secondary"
                      className="bg-glass-bg-strong text-ink-dim border border-glass-border font-mono text-[10px] uppercase"
                    >
                      {t.type}
                    </Badge>
                    <span className="text-sm text-ink">
                      {t.params.column as string}
                      {t.params.value ? (
                        <span className="text-ink-faint">
                          {" "}
                          → {t.params.value as string}
                        </span>
                      ) : null}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteTransform(t.id)}
                    className="h-9 w-9 text-ink-faint hover:text-red-400 hover:bg-surface-error"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

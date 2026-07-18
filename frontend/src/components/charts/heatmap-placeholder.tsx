import { cn } from "@/utils/cn";

interface HeatmapPlaceholderProps {
  title?: string;
  height?: number;
  className?: string;
}

export function HeatmapPlaceholder({ title = "Heatmap", height = 280, className }: HeatmapPlaceholderProps) {
  const rows = 6;
  const cols = 8;

  return (
    <div className={cn("rounded-xl border border-border bg-muted-surface/30 p-4", className)} style={{ minHeight: height }}>
      <p className="mb-4 text-sm font-medium text-foreground">{title}</p>
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {Array.from({ length: rows * cols }).map((_, i) => {
          const intensity = ((i * 17) % 100) / 100;
          return (
            <div
              key={i}
              className="aspect-square rounded-md"
              style={{ backgroundColor: `rgba(58, 75, 65, ${0.15 + intensity * 0.65})` }}
              aria-hidden
            />
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted">Configure X and Y columns to render correlation heatmap</p>
    </div>
  );
}

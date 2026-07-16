import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevation?: "subtle" | "default" | "strong";
  animate?: boolean;
}

const elevationClasses = {
  subtle: "glass-subtle",
  default: "glass",
  strong: "glass-strong",
};

export function GlassCard({
  elevation = "default",
  animate = true,
  className,
  children,
  ...props
}: GlassCardProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-md)] p-5",
        elevationClasses[elevation],
        "transition-all duration-200 ease-out",
        "hover:border-glass-border-strong hover:-translate-y-[2px]",
        "active:translate-y-0 active:scale-[0.98]",
        animate && "animate-fade-blur-in",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

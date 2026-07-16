import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-teal focus:ring-offset-2 focus:ring-offset-void",
  {
    variants: {
      variant: {
        default: "border-transparent bg-teal/15 text-teal",
        secondary: "border-transparent bg-glass-bg text-ink-dim",
        destructive: "border-transparent bg-rose/15 text-rose",
        outline: "border-glass-border text-ink-dim",
        success: "border-transparent bg-teal/15 text-teal",
        warning: "border-transparent bg-amber/15 text-amber",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }

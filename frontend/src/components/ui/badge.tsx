import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-[#F1F0EC] text-[#6B7280]",
        success: "bg-[#E8F0E9] text-[#5C8A67]",
        warning: "bg-[#F5EDE3] text-[#C69B4A]",
        destructive: "bg-[#F5E5E5] text-[#C65B5B]",
        outline: "border border-[#D9D9D9] text-[#1F2937]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }

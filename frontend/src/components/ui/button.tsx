import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-sm)] text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-void disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-teal text-void hover:bg-teal-hover shadow-sm hover:shadow-md active:scale-[0.98]",
        destructive: "bg-rose text-white shadow-sm hover:bg-rose/90 hover:shadow-md active:scale-[0.98]",
        outline: "border border-glass-border-strong bg-transparent text-ink hover:bg-glass-bg-strong active:scale-[0.98]",
        secondary: "bg-glass-bg text-ink-dim border border-glass-border hover:text-ink hover:bg-glass-bg-strong active:scale-[0.98]",
        ghost: "text-ink-dim hover:text-ink hover:bg-glass-bg active:scale-[0.98]",
        link: "text-teal underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-[var(--radius-sm)] px-3 text-[13px]",
        lg: "h-11 rounded-[var(--radius-sm)] px-6",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }

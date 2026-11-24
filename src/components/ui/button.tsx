import * as React from "react"
import { motion, useReducedMotion } from "motion/react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { motionTokens, springs } from "@/lib/motion-tokens"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[12px] font-medium transition-[background-color,color,border-color,box-shadow] duration-150 ease-[var(--ease-swift)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground shadow-[0_1px_0_rgb(255_255_255/0.18)_inset,0_8px_20px_-12px_rgb(37_71_244/0.7)] hover:brightness-[1.06]",
        secondary: "bg-secondary text-secondary-foreground border border-border hover:bg-muted",
        outline: "border border-border bg-transparent hover:bg-secondary/60",
        ghost: "hover:bg-secondary/70 text-foreground",
        danger: "bg-destructive text-destructive-foreground hover:brightness-105",
        signal: "bg-signal text-signal-foreground hover:brightness-105",
      },
      size: {
        sm: "h-8 px-3 text-[13px]",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-[15px]",
        icon: "size-10",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => {
    const reduce = useReducedMotion()
    const motionButtonProps = {
      ...props,
      type,
      whileHover: reduce ? undefined : { scale: motionTokens.scale.pop },
      whileTap: reduce ? undefined : { scale: motionTokens.scale.press },
      transition: { ...springs.snappy, type: "spring" },
    } as React.ComponentProps<typeof motion.button>
    return (
      <motion.button
        {...motionButtonProps}
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
      />
    )
  },
)
Button.displayName = "Button"

export { buttonVariants }

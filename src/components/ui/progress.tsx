import * as React from "react"
import { cn } from "@/lib/utils"

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  indeterminate?: boolean
}

export function Progress({ value = 0, indeterminate, className, ...props }: ProgressProps) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={indeterminate ? undefined : Math.round(pct)}
      className={cn("relative h-1.5 w-full overflow-hidden rounded-full bg-secondary", className)}
      {...props}
    >
      <div
        className={cn(
          "h-full rounded-full bg-primary transition-[width] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
          indeterminate && "w-1/3 animate-[slide_1.1s_ease-in-out_infinite]",
        )}
        style={indeterminate ? undefined : { width: `${pct}%` }}
      />
    </div>
  )
}

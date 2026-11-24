import * as React from "react"
import { cn } from "@/lib/utils"

export interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string
  valueLabel?: string
}

export function Slider({ className, label, valueLabel, ...props }: SliderProps) {
  return (
    <label className="block">
      <span className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-medium text-foreground">{label}</span>
        {valueLabel ? (
          <span className="font-mono text-[12px] tabular-nums text-muted-foreground">{valueLabel}</span>
        ) : null}
      </span>
      <input type="range" className={cn("range w-full", className)} {...props} />
    </label>
  )
}

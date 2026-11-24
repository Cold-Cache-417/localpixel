import * as React from "react"
import { cn } from "@/lib/utils"

export function Field({
  label,
  hint,
  htmlFor,
  children,
  className,
}: {
  label: string
  hint?: string
  htmlFor?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-[13px] font-medium text-foreground">
          {label}
        </label>
        {hint ? <span className="font-mono text-[11px] text-muted-foreground">{hint}</span> : null}
      </div>
      {children}
    </div>
  )
}

const controlClass =
  "h-10 w-full rounded-[10px] border border-input bg-card px-3 text-sm text-foreground shadow-[0_1px_0_rgb(255_255_255/0.5)_inset] transition-colors placeholder:text-muted-foreground/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"

export const TextInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(controlClass, className)} {...props} />
  ),
)
TextInput.displayName = "TextInput"

export function NativeSelect({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        className={cn(controlClass, "appearance-none pr-9 [&>option]:bg-card", className)}
        {...props}
      >
        {children}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 12 8"
        className="pointer-events-none absolute right-3 top-1/2 h-2 w-3 -translate-y-1/2 text-muted-foreground"
      >
        <path d="M1 1.5 6 6.5l5-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </div>
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  size = "md",
}: {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
  label: string
  size?: "sm" | "md"
}) {
  const groupId = React.useId()
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex flex-wrap items-center gap-0.5 rounded-[10px] border border-border bg-secondary/60 p-0.5"
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            id={`${groupId}-${option.value}`}
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative rounded-[8px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
              size === "sm" ? "h-7 px-2.5 text-[12px]" : "h-8 px-3 text-[13px]",
              active
                ? "bg-card text-foreground shadow-[0_1px_3px_rgb(18_20_15/0.12)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export function Switch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
}) {
  const id = React.useId()
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <label htmlFor={id} className="block text-[13px] font-medium">
          {label}
        </label>
        {description ? (
          <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-10 shrink-0 rounded-full border transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          checked ? "border-primary bg-primary" : "border-input bg-secondary",
        )}
      >
        <span
          className={cn(
            "absolute top-1/2 size-4 -translate-y-1/2 rounded-full bg-white shadow-sm transition-[left] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
            checked ? "left-[21px]" : "left-[3px]",
          )}
        />
      </button>
    </div>
  )
}

export function Checkbox({
  checked,
  onChange,
  label,
  id,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: React.ReactNode
  id?: string
}) {
  const generated = React.useId()
  const inputId = id ?? generated
  return (
    <div className="flex items-start gap-2.5">
      <input
        id={inputId}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]"
      />
      <label htmlFor={inputId} className="text-[13px] leading-relaxed text-muted-foreground">
        {label}
      </label>
    </div>
  )
}

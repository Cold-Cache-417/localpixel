import * as React from "react"
import { motion, useReducedMotion } from "motion/react"
import { Check, Download, Loader2, Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ToolMeta } from "@/tools"
import { Badge } from "@/components/ui/badge"
import { Button, type ButtonProps } from "@/components/ui/button"

export function ToolPage({
  tool,
  children,
  aside,
  meta,
}: {
  tool: ToolMeta
  children: React.ReactNode
  aside?: React.ReactNode
  meta?: React.ReactNode
}) {
  const Icon = tool.icon
  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 pb-24 pt-8 sm:px-8 sm:pt-12">
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
        className="grid gap-6 border-b border-line pb-8 lg:grid-cols-[1fr_auto] lg:items-end"
      >
        <div className="max-w-2xl">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] text-muted-foreground">{tool.number}</span>
            <span className="h-px w-8 bg-line" />
            <Badge tone="neutral">
              <Lock className="size-2.5" /> stays in this tab
            </Badge>
          </div>
          <div className="mt-4 flex items-start gap-3">
            <span className="mt-1 grid size-10 shrink-0 place-items-center rounded-[12px] border border-border bg-card text-primary shadow-[var(--shadow-raise)] sm:size-11">
              <Icon className="size-5" />
            </span>
            <div>
              <h1 className="text-balance font-display text-[clamp(1.9rem,4vw,2.9rem)] font-semibold leading-[1.02] tracking-[-0.035em]">
                {tool.name}
              </h1>
              <p className="mt-2 max-w-xl text-pretty text-[14.5px] leading-relaxed text-muted-foreground">
                {tool.blurb}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground lg:justify-end">
          <span>in · {tool.input}</span>
          <span className="hidden h-3 w-px bg-line sm:block" />
          <span>out · {tool.output}</span>
        </div>
      </motion.header>

      <div
        className={cn(
          "mt-8 grid gap-6",
          aside ? "lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start" : "",
        )}
      >
        <div className="min-w-0 space-y-6">{children}</div>
        {aside ? <div className="space-y-6 lg:sticky lg:top-24">{aside}</div> : null}
      </div>
      {meta ? <div className="mt-10 border-t border-line pt-6">{meta}</div> : null}
    </div>
  )
}

export function Panel({
  title,
  step,
  actions,
  children,
  className,
  tone = "default",
}: {
  title?: string
  step?: string
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
  tone?: "default" | "quiet"
}) {
  return (
    <motion.section
      layout="position"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className={cn(
        "overflow-hidden rounded-[18px] border shadow-[var(--shadow-raise)]",
        tone === "default" ? "border-border bg-card" : "border-line bg-secondary/25",
        className,
      )}
    >
      {title ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5 sm:px-6">
          <div className="flex items-center gap-2.5">
            {step ? <span className="font-mono text-[10.5px] text-muted-foreground">{step}</span> : null}
            <h2 className="font-display text-[14px] font-semibold tracking-[-0.01em]">{title}</h2>
          </div>
          {actions}
        </div>
      ) : null}
      <div className="p-5 sm:p-6">{children}</div>
    </motion.section>
  )
}

export function Stat({
  label,
  value,
  tone = "default",
  className,
}: {
  label: string
  value: React.ReactNode
  tone?: "default" | "signal" | "primary"
  className?: string
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-1 truncate font-display text-[17px] font-semibold tabular-nums tracking-[-0.02em]",
          tone === "signal" && "text-signal",
          tone === "primary" && "text-primary",
        )}
      >
        {value}
      </div>
    </div>
  )
}

export function RunButton({
  running,
  children,
  className,
  ...props
}: ButtonProps & { running?: boolean }) {
  return (
    <Button className={cn("min-w-[150px]", className)} disabled={running || props.disabled} {...props}>
      {running ? (
        <>
          <Loader2 className="animate-spin" aria-hidden="true" />
          Working…
        </>
      ) : (
        children
      )}
    </Button>
  )
}

export function DownloadButton({
  onDownload,
  children = "Download",
  ...props
}: ButtonProps & { onDownload: () => void }) {
  return (
    <Button variant="signal" onClick={onDownload} {...props}>
      <Download aria-hidden="true" />
      {children}
    </Button>
  )
}

export function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[12px] border border-dashed border-line bg-secondary/25 px-4 py-5 text-center text-[12.5px] leading-relaxed text-muted-foreground">
      {children}
    </div>
  )
}

export function Notice({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "warn" | "signal"
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "rounded-[12px] border px-3.5 py-3 text-[12.5px] leading-relaxed",
        tone === "neutral" && "border-border bg-secondary/35 text-muted-foreground",
        tone === "warn" && "border-destructive/25 bg-destructive/5 text-destructive",
        tone === "signal" && "border-signal/25 bg-signal/5 text-signal",
      )}
    >
      {children}
    </div>
  )
}

export function SuccessMark({ label }: { label: string }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 30 }}
      className="inline-flex items-center gap-1.5 rounded-full border border-signal/25 bg-signal/10 px-2.5 py-1 text-[11px] font-medium text-signal"
    >
      <Check className="size-3" strokeWidth={2.5} />
      {label}
    </motion.div>
  )
}

/** Sequential reveal used for lists of results. */
export function Stagger({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.045 } } }}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 8 },
        show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.23, 1, 0.32, 1] } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

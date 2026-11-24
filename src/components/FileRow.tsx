import * as React from "react"
import { motion } from "motion/react"
import { FileImage, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useObjectUrl } from "@/hooks/useObjectUrl"

export function FileRow({
  name,
  meta,
  preview,
  badge,
  trailing,
  onRemove,
  className,
}: {
  name: string
  meta: React.ReactNode
  preview?: Blob | null
  badge?: React.ReactNode
  trailing?: React.ReactNode
  onRemove?: () => void
  className?: string
}) {
  const url = useObjectUrl(preview ?? null)
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginTop: 0, transition: { duration: 0.18 } }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      className={cn(
        "flex items-center gap-3 rounded-[12px] border border-border bg-card px-3 py-2.5",
        className,
      )}
    >
      <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-[8px] border border-border bg-secondary/50">
        {url ? (
          <img src={url} alt="" className="size-full object-cover" />
        ) : (
          <FileImage className="size-4 text-muted-foreground" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[13px] font-medium">{name}</p>
          {badge}
        </div>
        <p className="mt-0.5 truncate font-mono text-[10.5px] text-muted-foreground">{meta}</p>
      </div>
      {trailing}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${name}`}
          className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </motion.div>
  )
}

import * as React from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { ArrowUpRight, Upload } from "lucide-react"
import { cn } from "@/lib/utils"

export interface DropzoneProps {
  onFiles: (files: File[]) => void
  accept?: string
  multiple?: boolean
  title: string
  hint: string
  compact?: boolean
  disabled?: boolean
  validate?: (file: File) => string | null
}

export function Dropzone({
  onFiles,
  accept,
  multiple = true,
  title,
  hint,
  compact = false,
  disabled,
  validate,
}: DropzoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const reduce = useReducedMotion()
  const dragDepth = React.useRef(0)

  const acceptFiles = React.useCallback(
    (list: FileList | File[] | null) => {
      if (!list) return
      const files = Array.from(list)
      if (!files.length) return
      const accepted: File[] = []
      for (const file of files) {
        const message = validate?.(file) ?? null
        if (message) {
          setError(message)
          continue
        }
        accepted.push(file)
        if (!multiple) break
      }
      if (accepted.length) {
        setError(null)
        onFiles(accepted)
      }
    },
    [multiple, onFiles, validate],
  )

  return (
    <div>
      <motion.div
        layout
        onDragEnter={(event) => {
          event.preventDefault()
          dragDepth.current += 1
          setDragging(true)
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          event.preventDefault()
          dragDepth.current -= 1
          if (dragDepth.current <= 0) {
            dragDepth.current = 0
            setDragging(false)
          }
        }}
        onDrop={(event) => {
          event.preventDefault()
          dragDepth.current = 0
          setDragging(false)
          acceptFiles(event.dataTransfer.files)
        }}
        className={cn(
          "group relative flex flex-col items-center justify-center overflow-hidden rounded-[16px] border border-dashed text-center transition-colors duration-200",
          compact ? "gap-1 px-4 py-6" : "gap-3 px-6 py-12 sm:py-16",
          dragging ? "border-primary bg-accent/60" : "border-line bg-card/60 hover:border-muted-foreground/45 hover:bg-card",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-2.5 top-2.5 size-2 border-l border-t border-line"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-2.5 top-2.5 size-2 border-r border-t border-line"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-2.5 left-2.5 size-2 border-b border-l border-line"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-2.5 right-2.5 size-2 border-b border-r border-line"
        />

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={dragging ? "active" : "idle"}
            initial={reduce ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: 0.16 }}
            className="flex flex-col items-center gap-3"
          >
            <span
              className={cn(
                "grid place-items-center rounded-full border transition-colors",
                compact ? "size-8" : "size-11",
                dragging ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-secondary/70 text-muted-foreground",
              )}
            >
              {dragging ? <ArrowUpRight className="size-4" /> : <Upload className={compact ? "size-3.5" : "size-4"} />}
            </span>
            <div>
              <p className={cn("font-display font-semibold tracking-[-0.01em]", compact ? "text-sm" : "text-[1.05rem]")}>
                {dragging ? "Drop to add" : title}
              </p>
              <p className="mt-1 text-[12.5px] text-muted-foreground">{hint}</p>
            </div>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="mt-0.5 inline-flex h-8 items-center rounded-full border border-border bg-card px-3.5 text-[12.5px] font-medium text-foreground shadow-[var(--shadow-raise)] transition-colors hover:bg-secondary/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Choose files
            </button>
          </motion.div>
        </AnimatePresence>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="sr-only"
          disabled={disabled}
          onChange={(event) => {
            acceptFiles(event.target.files)
            event.target.value = ""
          }}
        />
      </motion.div>
      {error ? (
        <p role="alert" className="mt-2 text-[12.5px] text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}

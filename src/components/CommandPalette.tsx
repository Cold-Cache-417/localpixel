import * as React from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { useNavigate } from "react-router-dom"
import { ArrowUpRight, Search } from "lucide-react"
import { TOOLS, type ToolMeta } from "@/tools"
import { cn } from "@/lib/utils"

function score(tool: ToolMeta, query: string) {
  const haystack = `${tool.name} ${tool.slug} ${tool.tags.join(" ")} ${tool.output} ${tool.input}`.toLowerCase()
  const needle = query.toLowerCase().trim()
  if (!needle) return 1
  return needle.split(/\s+/).every((word) => haystack.includes(word)) ? 1 : 0
}

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [query, setQuery] = React.useState("")
  const [active, setActive] = React.useState(0)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const reduce = useReducedMotion()
  const navigate = useNavigate()

  const results = React.useMemo(
    () => TOOLS.filter((tool) => score(tool, query) > 0),
    [query],
  )

  React.useEffect(() => {
    if (!open) return
    setQuery("")
    setActive(0)
    const timer = window.setTimeout(() => inputRef.current?.focus(), 40)
    const previouslyFocused = document.activeElement as HTMLElement | null
    document.body.style.overflow = "hidden"
    return () => {
      window.clearTimeout(timer)
      document.body.style.overflow = ""
      previouslyFocused?.focus?.()
    }
  }, [open])

  const go = React.useCallback(
    (tool: ToolMeta) => {
      onOpenChange(false)
      navigate(`/${tool.slug}`)
    },
    [navigate, onOpenChange],
  )

  React.useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        onOpenChange(false)
      } else if (event.key === "ArrowDown") {
        event.preventDefault()
        setActive((prev) => (results.length ? (prev + 1) % results.length : 0))
      } else if (event.key === "ArrowUp") {
        event.preventDefault()
        setActive((prev) => (results.length ? (prev - 1 + results.length) % results.length : 0))
      } else if (event.key === "Enter" && results[active]) {
        event.preventDefault()
        go(results[active])
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [active, go, onOpenChange, open, results])

  React.useEffect(() => {
    setActive(0)
  }, [query])

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]">
          <motion.button
            type="button"
            aria-label="Close search"
            onClick={() => onOpenChange(false)}
            className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            transition={{ duration: 0.18 }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Find a tool"
            initial={reduce ? false : { opacity: 0, y: -8, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: -6, scale: 0.99 }}
            transition={{ type: "spring", stiffness: 480, damping: 34, mass: 0.7 }}
            className="relative z-10 w-full max-w-[560px] overflow-hidden rounded-[16px] border border-border bg-popover shadow-[0_24px_80px_-24px_rgb(18_20_15/0.45)]"
          >
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search ten tools…"
                aria-label="Search tools"
                className="h-12 w-full bg-transparent text-[14px] outline-none placeholder:text-muted-foreground/70"
              />
              <kbd className="rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[9.5px] text-muted-foreground">
                esc
              </kbd>
            </div>
            <div className="max-h-[52vh] overflow-y-auto p-2">
              {results.length === 0 ? (
                <p className="px-3 py-8 text-center text-[13px] text-muted-foreground">
                  Nothing matches “{query}”. Try “pdf”, “compress” or “qr”.
                </p>
              ) : (
                results.map((tool, index) => (
                  <button
                    key={tool.slug}
                    type="button"
                    onMouseEnter={() => setActive(index)}
                    onClick={() => go(tool)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left transition-colors",
                      index === active ? "bg-secondary" : "hover:bg-secondary/60",
                    )}
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-[8px] border border-border bg-card text-primary">
                      <tool.icon className="size-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium">{tool.name}</span>
                      <span className="block truncate text-[11.5px] text-muted-foreground">{tool.blurb}</span>
                    </span>
                    <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground" />
                  </button>
                ))
              )}
            </div>
            <div className="flex items-center justify-between border-t border-line px-4 py-2 font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground">
              <span>↑↓ to move · ↵ to open</span>
              <span>runs locally</span>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  )
}

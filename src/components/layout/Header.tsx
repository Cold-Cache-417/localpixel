import * as React from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { Link, useLocation } from "react-router-dom"
import { Menu, Moon, Search, Sun, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { TOOLS, TOOL_GROUPS } from "@/tools"
import { useTheme } from "@/hooks/useTheme"
import { Wordmark } from "@/components/Wordmark"

const NAV = [
  { to: "/#desk", label: "The desk" },
  { to: "/about", label: "About" },
  { to: "/privacy", label: "Privacy" },
]

export function Header({ onOpenPalette }: { onOpenPalette: () => void }) {
  const { theme, toggle } = useTheme()
  const location = useLocation()
  const reduce = useReducedMotion()
  const [menuOpen, setMenuOpen] = React.useState(false)

  React.useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  React.useEffect(() => {
    if (!menuOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false)
    }
    window.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [menuOpen])

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line/70 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-[1240px] items-center justify-between gap-4 px-5 sm:px-8">
          <Link to="/" className="group flex items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
            <Wordmark />
            <span className="hidden rounded-full border border-line px-1.5 py-px font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground sm:inline">
              v1.0
            </span>
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-6 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="group relative py-1 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
              >
                {item.label}
                <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-foreground transition-[width] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:w-full" />
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
            <span className="mr-1 hidden items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground lg:flex">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-signal opacity-60" />
                <span className="relative inline-flex size-1.5 rounded-full bg-signal" />
              </span>
              local only
            </span>
            <button
              type="button"
              onClick={onOpenPalette}
              className="group flex h-8 items-center gap-2 rounded-full border border-border bg-card/70 pl-2.5 pr-2 text-[12.5px] text-muted-foreground transition-colors hover:border-muted-foreground/40 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              aria-label="Search tools"
            >
              <Search className="size-3.5" />
              <span className="hidden sm:inline">Find a tool</span>
              <kbd className="hidden rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[9.5px] sm:inline">
                ⌘K
              </kbd>
            </button>
            <button
              type="button"
              onClick={toggle}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
              className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={theme}
                  initial={reduce ? false : { rotate: -30, opacity: 0, scale: 0.8 }}
                  animate={{ rotate: 0, opacity: 1, scale: 1 }}
                  exit={reduce ? undefined : { rotate: 30, opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.18 }}
                  className="grid place-items-center"
                >
                  {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
                </motion.span>
              </AnimatePresence>
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:hidden"
            >
              <Menu className="size-4" />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {menuOpen ? (
          <motion.div
            className="fixed inset-0 z-50 flex flex-col bg-background md:hidden"
            initial={reduce ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex h-14 items-center justify-between border-b border-line px-5">
              <Wordmark />
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                className="grid size-9 place-items-center rounded-full border border-border"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-6">
              <p className="eyebrow">All ten tools</p>
              <div className="mt-4 space-y-5">
                {TOOL_GROUPS.map((group, groupIndex) => (
                  <div key={group.id}>
                    <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      {group.label}
                    </p>
                    <div className="space-y-1">
                      {TOOLS.filter((tool) => tool.group === group.id).map((tool, index) => (
                        <motion.div
                          key={tool.slug}
                          initial={reduce ? false : { opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.03 * (groupIndex * 3 + index), duration: 0.25 }}
                        >
                          <Link
                            to={`/${tool.slug}`}
                            className="flex items-center justify-between rounded-[10px] px-2 py-2.5 hover:bg-secondary"
                          >
                            <span className="flex items-center gap-3">
                              <tool.icon className="size-4 text-muted-foreground" />
                              <span className="text-sm font-medium">{tool.name}</span>
                            </span>
                            <span className="font-mono text-[10px] text-muted-foreground">{tool.number}</span>
                          </Link>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className={cn("mt-7 flex flex-wrap gap-2 border-t border-line pt-5")}>
                {NAV.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="rounded-full border border-border px-3 py-1.5 text-[12.5px] text-muted-foreground"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  )
}

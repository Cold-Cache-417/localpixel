import * as React from "react"
import { Link, useNavigate } from "react-router-dom"
import { motion, useReducedMotion } from "motion/react"
import { ArrowDownRight, ArrowRight, ArrowUpRight, Check, FileImage, Lock, ShieldCheck } from "lucide-react"
import { TOOLS, TOOL_GROUPS, type ToolMeta } from "@/tools"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay, ease: [0.23, 1, 0.32, 1] }}
    >
      {children}
    </motion.div>
  )
}

function WordReveal({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  const reduce = useReducedMotion()
  const words = text.split(" ")
  return (
    <span className={className}>
      {words.map((word, index) => (
        <span key={`${word}-${index}`} className="inline-block overflow-hidden pb-[0.06em] align-bottom">
          <motion.span
            className="inline-block"
            initial={reduce ? false : { y: "108%" }}
            animate={{ y: 0 }}
            transition={{ duration: 0.75, delay: delay + index * 0.055, ease: [0.16, 1, 0.3, 1] }}
          >
            {word}
            {index < words.length - 1 ? "\u00A0" : ""}
          </motion.span>
        </span>
      ))}
    </span>
  )
}

function PixelField() {
  const reduce = useReducedMotion()
  const cells = 96
  return (
    <div aria-hidden="true" className="grid grid-cols-12 gap-[5px]">
      {Array.from({ length: cells }).map((_, index) => {
        const hot = index % 17 === 3 || index % 23 === 7 || index === 42 || index === 43 || index === 54 || index === 55
        const muted = index % 7 === 0
        return (
          <motion.span
            key={index}
            className={cn(
              "aspect-square rounded-[2px]",
              hot ? "bg-primary" : muted ? "bg-foreground/15" : "bg-foreground/10",
            )}
            initial={reduce ? false : { opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.4,
              delay: 0.18 + (index % 12) * 0.014 + Math.floor(index / 12) * 0.02,
              ease: [0.23, 1, 0.32, 1],
            }}
          />
        )
      })}
    </div>
  )
}

function HeroPlate() {
  const reduce = useReducedMotion()
  return (
    <div className="relative mx-auto w-full max-w-[440px] lg:mx-0">
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 26, rotate: 1.5 }}
        animate={{ opacity: 1, y: 0, rotate: 0 }}
        transition={{ duration: 0.9, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="grain relative overflow-hidden rounded-[20px] border border-border bg-card p-5 shadow-[var(--shadow-lift)]"
      >
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            bench / 01
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-signal/25 bg-signal/10 px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.08em] text-signal">
            <Lock className="size-2.5" /> offline
          </span>
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-[12px] border border-border bg-background/60 p-3">
          <span className="grid size-9 place-items-center rounded-[8px] border border-border bg-card">
            <FileImage className="size-4 text-primary" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-medium">field-notes.jpg</p>
            <p className="font-mono text-[10.5px] text-muted-foreground">2400 × 1600 · 2.4 MB</p>
          </div>
          <span className="font-mono text-[10px] text-muted-foreground">q82</span>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground">
            <span>original</span>
            <span>2.4 MB</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <motion.div
              className="h-full rounded-full bg-foreground/25"
              initial={reduce ? { width: "100%" } : { width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 0.7, delay: 0.5 }}
            />
          </div>
          <div className="flex items-center justify-between font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground">
            <span className="text-signal">compressed</span>
            <span className="text-signal">780 KB</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <motion.div
              className="h-full rounded-full bg-signal"
              initial={reduce ? { width: "32%" } : { width: 0 }}
              animate={{ width: "32%" }}
              transition={{ duration: 1, delay: 0.85, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 divide-x divide-line rounded-[10px] border border-line bg-background/50 py-2.5 text-center">
          {[
            { label: "saved", value: "−68%" },
            { label: "tags", value: "0" },
            { label: "uploads", value: "0" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="font-display text-[15px] font-semibold tabular-nums">{stat.value}</p>
              <p className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-muted-foreground">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={reduce ? false : { opacity: 0, x: 20, y: 10 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ duration: 0.6, delay: 1.15, ease: [0.16, 1, 0.3, 1] }}
        className="absolute -bottom-5 -left-3 flex items-center gap-2 rounded-[10px] border border-border bg-popover px-3 py-2 shadow-[var(--shadow-lift)] sm:-left-6"
      >
        <ShieldCheck className="size-3.5 text-signal" />
        <span className="text-[11px] font-medium">GPS + camera data removed</span>
      </motion.div>

      <motion.div
        initial={reduce ? false : { opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1.35, ease: [0.16, 1, 0.3, 1] }}
        className="absolute -right-3 -top-4 flex items-center gap-1.5 rounded-full border border-primary/25 bg-accent px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-[0.08em] text-accent-foreground shadow-[var(--shadow-raise)] sm:-right-6"
      >
        <span className="size-1.5 rounded-full bg-primary" />
        no network
      </motion.div>
    </div>
  )
}

function ToolCard({ tool, index }: { tool: ToolMeta; index: number }) {
  const reduce = useReducedMotion()
  const Icon = tool.icon
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.04, 0.3), ease: [0.23, 1, 0.32, 1] }}
    >
      <Link
        to={`/${tool.slug}`}
        className="group relative flex h-full min-h-[168px] flex-col justify-between overflow-hidden rounded-[16px] border border-border bg-card p-5 shadow-[var(--shadow-raise)] transition-[transform,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-[3px] hover:border-muted-foreground/40 hover:shadow-[var(--shadow-lift)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <span className="absolute inset-x-0 top-0 h-[2px] origin-left scale-x-0 bg-primary transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-x-100" />
        <div className="flex items-start justify-between">
          <span className="grid size-9 place-items-center rounded-[10px] border border-border bg-secondary/50 text-foreground transition-colors duration-300 group-hover:border-primary/30 group-hover:bg-accent group-hover:text-primary">
            <Icon className="size-[17px]" />
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">{tool.number}</span>
        </div>
        <div className="mt-6">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-[16.5px] font-semibold tracking-[-0.02em]">{tool.name}</h3>
            <ArrowUpRight className="size-3.5 -translate-x-1 text-muted-foreground opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
          </div>
          <p className="mt-1.5 text-pretty text-[12.5px] leading-relaxed text-muted-foreground">{tool.blurb}</p>
          <div className="mt-3 flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.08em] text-muted-foreground/80">
            <span>{tool.input}</span>
            <ArrowRight className="size-2.5" />
            <span>{tool.output}</span>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

function FormatTicker() {
  const items = ["JPEG", "PNG", "WebP", "AVIF", "GIF", "BMP", "SVG", "PDF", "DOCX", "EXIF", "GPS", "ZIP"]
  return (
    <div className="overflow-hidden border-y border-line bg-secondary/20">
      <div className="flex w-max animate-[marquee_38s_linear_infinite] items-center gap-6 py-2.5">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex items-center gap-6" aria-hidden={copy === 1}>
            {items.map((item) => (
              <span
                key={`${copy}-${item}`}
                className="flex items-center gap-6 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
              >
                {item}
                <span className="size-[3px] rounded-full bg-muted-foreground/40" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function Home() {
  const reduce = useReducedMotion()
  const navigate = useNavigate()
  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-[0.55] [background-image:linear-gradient(to_right,var(--line)_1px,transparent_1px),linear-gradient(to_bottom,var(--line)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,#000_20%,transparent_75%)]" />
        <div className="relative mx-auto grid w-full max-w-[1240px] items-center gap-14 px-5 pb-16 pt-14 sm:px-8 sm:pb-20 sm:pt-20 lg:grid-cols-[1.15fr_0.85fr] lg:gap-10">
          <div>
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground"
            >
              <span className="size-1.5 rounded-full bg-signal" />
              a browser-native file workshop
            </motion.div>

            <h1 className="mt-6 font-display text-[clamp(2.9rem,7.2vw,5.4rem)] font-semibold leading-[0.94] tracking-[-0.045em]">
              <WordReveal text="Your files stay" />
              <br />
              <span className="relative inline-block">
                <WordReveal text="in this tab." delay={0.18} className="text-primary" />
                <motion.svg
                  aria-hidden="true"
                  viewBox="0 0 420 14"
                  className="absolute -bottom-1 left-0 w-full text-primary/45"
                  fill="none"
                >
                  <motion.path
                    d="M3 10C76 4 164 3 243 6c60 2 114 4 174 1"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    initial={reduce ? { pathLength: 1 } : { pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.1, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  />
                </motion.svg>
              </span>
            </h1>

            <motion.p
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.45 }}
              className="mt-7 max-w-[46ch] text-pretty text-[15px] leading-relaxed text-muted-foreground sm:text-[16px]"
            >
              Ten precision tools for images and PDFs. Compress, convert, crop, strip metadata and
              assemble documents — all computed by the browser you are already using. Nothing is
              uploaded, because there is nowhere to upload it to.
            </motion.p>

            <motion.div
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.55 }}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <Button
                size="lg"
                onClick={() => document.getElementById("desk")?.scrollIntoView({ behavior: "smooth" })}
              >
                Open the desk
                <ArrowDownRight aria-hidden="true" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/compress-image")}>
                Start compressing
              </Button>
            </motion.div>

            <motion.div
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.75 }}
              className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground"
            >
              {["0 uploads", "0 accounts", "works offline"].map((item) => (
                <span key={item} className="inline-flex items-center gap-1.5">
                  <Check className="size-3 text-signal" />
                  {item}
                </span>
              ))}
            </motion.div>
          </div>

          <div className="relative lg:pl-6">
            <div aria-hidden="true" className="absolute -left-10 top-10 hidden w-24 opacity-70 lg:block">
              <PixelField />
            </div>
            <HeroPlate />
          </div>
        </div>
      </section>

      <FormatTicker />

      <section id="desk" className="mx-auto w-full max-w-[1240px] scroll-mt-20 px-5 py-16 sm:px-8 sm:py-20">
        <div className="flex flex-col gap-6 border-b border-line pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">The desk</p>
            <h2 className="mt-3 max-w-[22ch] text-balance font-display text-[clamp(1.9rem,4.4vw,3rem)] font-semibold leading-[1.02] tracking-[-0.035em]">
              Ten tools. One quiet tab.
            </h2>
          </div>
          <p className="max-w-[34ch] text-pretty text-[13.5px] leading-relaxed text-muted-foreground">
            Pick a bench. Each tool takes files by drag-and-drop, keeps them in memory, and hands
            back a download when you are done.
          </p>
        </div>

        <div className="mt-10 space-y-12">
          {TOOL_GROUPS.map((group) => (
            <div key={group.id}>
              <div className="mb-4 flex items-baseline justify-between gap-4">
                <div className="flex items-baseline gap-3">
                  <h3 className="font-display text-[15px] font-semibold tracking-[-0.01em]">{group.label}</h3>
                  <span className="text-[12px] text-muted-foreground">{group.note}</span>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                  {String(TOOLS.filter((tool) => tool.group === group.id).length).padStart(2, "0")} tools
                </span>
              </div>
              <div
                className={cn(
                  "grid gap-3",
                  group.id === "images" ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2",
                )}
              >
                {TOOLS.filter((tool) => tool.group === group.id).map((tool, index) => (
                  <ToolCard key={tool.slug} tool={tool} index={index} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-line bg-card/50">
        <div className="mx-auto grid w-full max-w-[1240px] gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <p className="eyebrow">How it works</p>
            <h2 className="mt-3 text-balance font-display text-[clamp(1.8rem,4vw,2.6rem)] font-semibold leading-[1.03] tracking-[-0.03em]">
              The file never leaves your machine.
            </h2>
            <p className="mt-4 max-w-[40ch] text-pretty text-[13.5px] leading-relaxed text-muted-foreground">
              No upload step exists in the code. Your browser reads the bytes, does the work with
              Canvas, PDF.js and pdf-lib, and writes a new file back to your downloads folder.
            </p>
            <Link
              to="/about"
              className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-primary underline-offset-4 hover:underline"
            >
              How the workshop is built
              <ArrowUpRight className="size-3.5" />
            </Link>
          </div>

          <div className="space-y-0">
            {[
              { n: "01", title: "Drop a file", body: "Drag it in or pick it from disk. The tool checks type and size before doing anything." },
              { n: "02", title: "Set the output", body: "Quality, format, page size, crop frame — only the controls that matter for that tool." },
              { n: "03", title: "Take it home", body: "Preview the result, read the real numbers, then download. Object URLs are released after." },
            ].map((step, index) => (
              <Reveal key={step.n} delay={index * 0.06}>
                <div className="grid grid-cols-[auto_1fr] gap-5 border-t border-line py-5 last:border-b">
                  <span className="font-mono text-[11px] text-muted-foreground">{step.n}</span>
                  <div>
                    <h3 className="font-display text-[16px] font-semibold tracking-[-0.015em]">{step.title}</h3>
                    <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{step.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1240px] px-5 py-16 sm:px-8 sm:py-20">
        <Reveal>
          <div className="grain relative overflow-hidden rounded-[24px] bg-ink px-6 py-10 text-paper sm:px-12 sm:py-14">
            <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full border border-paper/10" />
            <div className="pointer-events-none absolute -bottom-32 -left-16 size-80 rounded-full border border-paper/10" />
            <div className="relative grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-paper/50">
                  Privacy receipt · this session
                </p>
                <div className="mt-5 flex flex-wrap items-end gap-x-10 gap-y-6">
                  {[
                    { value: "0", label: "files uploaded" },
                    { value: "0", label: "servers contacted" },
                    { value: "0", label: "cookies set" },
                    { value: "1", label: "tab used" },
                  ].map((item) => (
                    <div key={item.label}>
                      <p className="font-display text-[clamp(2.4rem,5vw,3.6rem)] font-semibold leading-none tracking-[-0.04em]">
                        {item.value}
                      </p>
                      <p className="mt-2 font-mono text-[9.5px] uppercase tracking-[0.12em] text-paper/50">
                        {item.label}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="mt-8 max-w-[52ch] text-pretty text-[13.5px] leading-relaxed text-paper/65">
                  No account, no storage bucket, no analytics on your files. The only network traffic
                  is the page itself and its fonts.
                </p>
              </div>
              <Button
                size="lg"
                className="w-full bg-paper text-ink hover:bg-paper/90 lg:w-auto"
                onClick={() => document.getElementById("desk")?.scrollIntoView({ behavior: "smooth" })}
              >
                Choose a tool
                <ArrowRight />
              </Button>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  )
}

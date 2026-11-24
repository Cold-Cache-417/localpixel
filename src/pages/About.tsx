import { Link } from "react-router-dom"
import { ArrowLeft, ArrowUpRight, Cpu, Lock, Zap } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"

const LAYERS = [
  { name: "Canvas 2D", role: "Decode, scale and re-encode every image. WebP, JPEG and PNG encoding come from the browser itself." },
  { name: "PDF.js", role: "Parses PDFs, counts pages, extracts text layers and rasterises pages for previews and exports." },
  { name: "pdf-lib", role: "Merges documents, copies page trees and writes new PDFs without touching a server." },
  { name: "exifr", role: "Reads EXIF, GPS, XMP and IPTC blocks, then re-reads every export to prove they are gone." },
  { name: "qrcode", role: "Builds the QR matrix in JavaScript; the logo and colours are composited on a local canvas." },
  { name: "docx + JSZip", role: "Assembles Word documents and multi-file archives entirely in memory." },
]

export function About() {
  return (
    <div className="mx-auto w-full max-w-[920px] px-5 pb-24 pt-10 sm:px-8 sm:pt-14">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3" />
        back to the desk
      </Link>

      <header className="mt-8 border-b border-line pb-10">
        <p className="eyebrow">Studio note · 2026</p>
        <h1 className="mt-4 max-w-[18ch] text-balance font-display text-[clamp(2.4rem,6vw,4.2rem)] font-semibold leading-[0.96] tracking-[-0.04em]">
          A workshop with no back door.
        </h1>
        <p className="mt-6 max-w-[58ch] text-pretty text-[15px] leading-relaxed text-muted-foreground">
          Localpixel is ten file tools rebuilt around a single constraint: the bytes never leave the
          machine. Not as a marketing promise, but as an architectural one — there is no upload
          endpoint to call.
        </p>
      </header>

      <div className="grid gap-4 py-10 sm:grid-cols-3">
        {[
          { icon: Lock, title: "Local by construction", body: "No API keys, no storage bucket, no server-side renderer." },
          { icon: Zap, title: "No queue", body: "Work starts on the click. Large batches are the only wait." },
          { icon: Cpu, title: "Native primitives", body: "Canvas, Workers and Web APIs instead of remote processing." },
        ].map((item) => (
          <div key={item.title} className="rounded-[14px] border border-border bg-card p-4 shadow-[var(--shadow-raise)]">
            <item.icon className="size-4 text-primary" />
            <h2 className="mt-3 font-display text-[14.5px] font-semibold tracking-[-0.01em]">{item.title}</h2>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">{item.body}</p>
          </div>
        ))}
      </div>

      <section className="border-t border-line py-10">
        <h2 className="font-display text-[24px] font-semibold tracking-[-0.025em]">What is actually running</h2>
        <p className="mt-2 max-w-[62ch] text-[13.5px] leading-relaxed text-muted-foreground">
          Every tool is a thin interface over a small set of well-understood browser libraries. When a
          conversion happens, these are the components that touch your file.
        </p>
        <div className="mt-6 divide-y divide-line border-y border-line">
          {LAYERS.map((layer) => (
            <div key={layer.name} className="grid gap-1 py-4 sm:grid-cols-[180px_1fr] sm:gap-6">
              <p className="font-mono text-[11.5px] text-foreground">{layer.name}</p>
              <p className="text-[13px] leading-relaxed text-muted-foreground">{layer.role}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-line py-10">
        <h2 className="font-display text-[24px] font-semibold tracking-[-0.025em]">What we deliberately left out</h2>
        <ul className="mt-4 space-y-3">
          {[
            "Accounts, sign-in and saved history — there is no database to store them in.",
            "Cloud processing for “bigger files” — it would break the one guarantee that matters.",
            "Fake progress bars — if a job is instant, the interface says so.",
            "Automatic uploads of any kind, including telemetry on file names or sizes.",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-[13.5px] leading-relaxed text-muted-foreground">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-4 rounded-[18px] border border-border bg-card p-6 shadow-[var(--shadow-raise)] sm:p-8">
        <h2 className="font-display text-[20px] font-semibold tracking-[-0.02em]">Known limits, stated plainly</h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Scanned PDFs have no text layer, so PDF to Word cannot invent one. PDF pages are rendered
            from their vectors, but complex embedded fonts may substitute during extraction.
          </p>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Image formats depend on the browser: AVIF can usually be decoded and WebP encoded, but not
            the other way around. GIF output is quantised to 256 colours.
          </p>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link to="/#desk" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Browse the tools
            <ArrowUpRight className="size-3.5" />
          </Link>
          <a
            href="https://developer.mozilla.org/en-US/docs/Web/API"
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex h-8 items-center gap-1.5 rounded-[12px] px-3 text-[13px] text-muted-foreground hover:text-foreground"
          >
            Web API reference
            <ArrowUpRight className="size-3.5" />
          </a>
        </div>
      </section>

      <p className="mt-10 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        Built with React 19 · Vite · Motion · Tailwind CSS · PDF.js · pdf-lib
      </p>
    </div>
  )
}

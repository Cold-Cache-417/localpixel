import { Link } from "react-router-dom"
import { ArrowUpRight } from "lucide-react"
import { TOOLS } from "@/tools"
import { Wordmark } from "@/components/Wordmark"

export function Footer() {
  return (
    <footer className="border-t border-line bg-secondary/25">
      <div className="mx-auto w-full max-w-[1240px] px-5 py-12 sm:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Wordmark />
            <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-muted-foreground">
              A private file workshop. Ten everyday image and PDF tools that run entirely inside your
              browser — no uploads, no accounts, no queues.
            </p>
            <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
              <span className="size-1.5 rounded-full bg-signal" />
              0 bytes uploaded
            </p>
          </div>

          <div>
            <p className="eyebrow">Image desk</p>
            <ul className="mt-3 space-y-2">
              {TOOLS.filter((tool) => tool.group === "images").map((tool) => (
                <li key={tool.slug}>
                  <Link
                    to={`/${tool.slug}`}
                    className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {tool.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="eyebrow">Document desk</p>
            <ul className="mt-3 space-y-2">
              {TOOLS.filter((tool) => tool.group === "pdf").map((tool) => (
                <li key={tool.slug}>
                  <Link
                    to={`/${tool.slug}`}
                    className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {tool.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  to="/qr-generator"
                  className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  QR Generator
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="eyebrow">Studio</p>
            <ul className="mt-3 space-y-2">
              <li>
                <Link to="/about" className="text-[13px] text-muted-foreground hover:text-foreground">
                  About the workshop
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-[13px] text-muted-foreground hover:text-foreground">
                  Privacy note
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-[13px] text-muted-foreground hover:text-foreground">
                  Terms
                </Link>
              </li>
              <li>
                <a
                  href="https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground"
                >
                  Built on web APIs
                  <ArrowUpRight className="size-3" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-line pt-5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Localpixel · a browser-native workshop</span>
          <span>Canvas · PDF.js · pdf-lib · WebAssembly-free</span>
        </div>
      </div>
    </footer>
  )
}

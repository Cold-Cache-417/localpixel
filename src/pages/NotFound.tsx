import { Link } from "react-router-dom"
import { ArrowRight } from "lucide-react"
import { TOOLS } from "@/tools"
import { buttonVariants } from "@/components/ui/button"

export function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col items-start px-5 pb-24 pt-20 sm:px-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Error 404</p>
      <div className="mt-6 grid grid-cols-3 gap-1.5" aria-hidden="true">
        {Array.from({ length: 9 }).map((_, index) => (
          <span
            key={index}
            className={`size-4 rounded-[2px] ${index === 4 ? "bg-primary" : "bg-foreground/15"}`}
          />
        ))}
      </div>
      <h1 className="mt-8 text-balance font-display text-[clamp(2.2rem,6vw,3.6rem)] font-semibold leading-[1] tracking-[-0.04em]">
        This bench does not exist.
      </h1>
      <p className="mt-4 max-w-[42ch] text-[14px] leading-relaxed text-muted-foreground">
        The page you asked for is not part of the workshop. The ten real tools are one click away.
      </p>
      <div className="mt-7 flex flex-wrap gap-2">
        <Link to="/" className={buttonVariants({ size: "md" })}>
          Return home
          <ArrowRight />
        </Link>
        <Link to="/compress-image" className={buttonVariants({ variant: "outline", size: "md" })}>
          Open the compressor
        </Link>
      </div>
      <div className="mt-12 w-full border-t border-line pt-6">
        <p className="eyebrow">Jump to a tool</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {TOOLS.map((tool) => (
            <Link
              key={tool.slug}
              to={`/${tool.slug}`}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
            >
              {tool.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

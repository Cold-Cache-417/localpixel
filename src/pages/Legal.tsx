import { Link } from "react-router-dom"
import { ArrowLeft } from "lucide-react"

const CONTENT = {
  privacy: {
    eyebrow: "Privacy note",
    title: "Nothing is collected, because nothing is sent.",
    updated: "24 November 2026",
    sections: [
      {
        heading: "Your files",
        body: "Every tool reads the file you choose directly into browser memory, processes it there, and writes a new download back to your device. There is no upload request in the application, no file storage, and no server-side copy. When you close or reload the tab, the in-memory file data is released by the browser.",
      },
      {
        heading: "What is stored",
        body: "One preference: whether you chose the light or dark interface. It is kept in localStorage on your device and never transmitted. There are no accounts, cookies for tracking, or analytics scripts.",
      },
      {
        heading: "Network requests",
        body: "Loading the site fetches its own HTML, CSS, JavaScript and bundled font files. That is the complete list. If you open an external link (for example a Web API reference), your browser contacts that site under its own privacy policy.",
      },
      {
        heading: "Third parties",
        body: "There are no advertising networks, tag managers, session recorders or third-party file processors in this build. The libraries used for conversion (PDF.js, pdf-lib, exifr, qrcode) execute locally as part of the page.",
      },
      {
        heading: "Your responsibilities",
        body: "Local processing protects the file in transit, but your device, browser extensions and downloads folder are still your responsibility. Be cautious with files from untrusted sources, and keep your browser current.",
      },
    ],
  },
  terms: {
    eyebrow: "Terms of use",
    title: "A free workshop, provided as it is.",
    updated: "24 November 2026",
    sections: [
      {
        heading: "The service",
        body: "Localpixel provides browser-based file conversion tools free of charge. The software runs on your device; we do not operate a processing service and cannot access your files.",
      },
      {
        heading: "No warranty",
        body: "The tools are provided “as is”, without warranties of any kind. Conversion can alter pixels, formatting, metadata or page structure. Always keep an original copy of anything important, and verify outputs before relying on them.",
      },
      {
        heading: "Acceptable use",
        body: "You may use the tools for personal or commercial work. You are responsible for holding the rights to the files you process and for complying with the law that applies to you.",
      },
      {
        heading: "Limitation of liability",
        body: "To the maximum extent permitted by law, Localpixel is not liable for data loss, corrupted outputs, lost profits or indirect damages arising from use of the tools.",
      },
      {
        heading: "Changes",
        body: "These terms may be updated as the application evolves. The date above records the current revision.",
      },
    ],
  },
}

export function Legal({ kind }: { kind: "privacy" | "terms" }) {
  const content = CONTENT[kind]
  return (
    <article className="mx-auto w-full max-w-[760px] px-5 pb-24 pt-10 sm:px-8 sm:pt-14">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3" />
        back to the desk
      </Link>
      <header className="mt-8 border-b border-line pb-8">
        <p className="eyebrow">{content.eyebrow}</p>
        <h1 className="mt-4 text-balance font-display text-[clamp(2.1rem,5.4vw,3.4rem)] font-semibold leading-[1] tracking-[-0.035em]">
          {content.title}
        </h1>
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          Last updated {content.updated}
        </p>
      </header>

      <div className="divide-y divide-line">
        {content.sections.map((section) => (
          <section key={section.heading} className="py-7">
            <h2 className="font-display text-[19px] font-semibold tracking-[-0.02em]">{section.heading}</h2>
            <p className="mt-2.5 text-pretty text-[14px] leading-[1.75] text-muted-foreground">{section.body}</p>
          </section>
        ))}
      </div>

      <div className="mt-8 rounded-[14px] border border-border bg-card px-5 py-4 shadow-[var(--shadow-raise)]">
        <p className="text-[12.5px] leading-relaxed text-muted-foreground">
          A practical way to verify this yourself: open your browser’s developer tools, switch to the
          Network tab, and run a conversion. You will see no outbound request carrying the file.
        </p>
      </div>
    </article>
  )
}

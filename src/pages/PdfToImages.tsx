import * as React from "react"
import { motion } from "motion/react"
import { Archive, Download, FileImage, Images, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import type { PDFDocumentProxy } from "pdfjs-dist"
import { toolBySlug } from "@/tools"
import {
  DownloadButton,
  EmptyHint,
  Notice,
  Panel,
  RunButton,
  Stat,
  ToolPage,
} from "@/components/ToolUI"
import { Dropzone } from "@/components/Dropzone"
import { FileRow } from "@/components/FileRow"
import { Segmented, TextInput } from "@/components/ui/field"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { loadPdf, releasePdf, renderPageToCanvas } from "@/lib/pdf"
import { parseRanges } from "@/lib/pdf-text"
import { encodeCanvas, type RasterFormat } from "@/lib/image"
import { useObjectUrl } from "@/hooks/useObjectUrl"
import { downloadBlob, formatBytes } from "@/lib/utils"
import { makeZip } from "@/lib/zip"

const TOOL = toolBySlug("pdf-to-images")!
const MAX_PAGES = 60

interface Rendered {
  page: number
  blob: Blob
  width: number
  height: number
}

function PageCard({
  item,
  onDownload,
}: {
  item: Rendered
  onDownload: () => void
}) {
  const url = useObjectUrl(item.blob)
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="group overflow-hidden rounded-[10px] border border-border bg-card"
    >
      <div className="relative bg-secondary/30">
        {url ? <img src={url} alt={`Page ${item.page}`} className="w-full" /> : null}
        <button
          type="button"
          onClick={onDownload}
          aria-label={`Download page ${item.page}`}
          className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-full border border-border bg-card/95 text-muted-foreground opacity-0 shadow-sm transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
        >
          <Download className="size-3" />
        </button>
      </div>
      <div className="flex items-center justify-between gap-1 border-t border-line px-2 py-1">
        <span className="font-mono text-[9px] text-muted-foreground">p.{item.page}</span>
        <span className="font-mono text-[9px] text-muted-foreground">{formatBytes(item.blob.size, 0)}</span>
      </div>
    </motion.div>
  )
}

export function PdfToImages() {
  const [file, setFile] = React.useState<File | null>(null)
  const [pdf, setPdf] = React.useState<PDFDocumentProxy | null>(null)
  const [format, setFormat] = React.useState<RasterFormat>("png")
  const [dpi, setDpi] = React.useState("150")
  const [range, setRange] = React.useState("")
  const [results, setResults] = React.useState<Rendered[]>([])
  const [running, setRunning] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    return () => {
      void releasePdf(pdf)
    }
  }, [pdf])

  async function accept(files: File[]) {
    const next = files[0]
    if (!next) return
    if (!next.name.toLowerCase().endsWith(".pdf") && next.type !== "application/pdf") {
      setError("That file is not a PDF.")
      return
    }
    if (next.size > 100 * 1024 * 1024) {
      setError("This PDF is larger than 100 MB.")
      return
    }
    setLoading(true)
    setError(null)
    setResults([])
    try {
      const doc = await loadPdf(next)
      setPdf(doc)
      setFile(next)
      setRange(`1-${doc.numPages}`)
      toast.success(`Loaded ${doc.numPages} page${doc.numPages > 1 ? "s" : ""}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "This PDF could not be read.")
      setFile(null)
      setPdf(null)
    } finally {
      setLoading(false)
    }
  }

  const pages = pdf ? parseRanges(range, pdf.numPages) : []
  const totalSize = results.reduce((sum, item) => sum + item.blob.size, 0)

  async function render() {
    if (!pdf) return
    if (!pages.length) {
      toast.error("Choose at least one page.")
      return
    }
    if (pages.length > MAX_PAGES) {
      toast.error(`Limit is ${MAX_PAGES} pages per run. Narrow the range.`)
      return
    }
    setRunning(true)
    setProgress(0)
    setResults([])
    const out: Rendered[] = []
    const scale = Number(dpi) / 72
    try {
      for (let index = 0; index < pages.length; index++) {
        const pageNumber = pages[index]
        const canvas = await renderPageToCanvas(pdf, pageNumber, scale)
        const blob = await encodeCanvas(canvas, format, 0.92)
        out.push({ page: pageNumber, blob, width: canvas.width, height: canvas.height })
        setProgress((index + 1) / pages.length)
        if (index % 2 === 0) await new Promise((resolve) => window.setTimeout(resolve, 0))
      }
      setResults(out)
      toast.success(`Rendered ${out.length} page${out.length > 1 ? "s" : ""}.`)
    } catch {
      toast.error("A page could not be rendered.")
      setResults(out)
    } finally {
      setRunning(false)
    }
  }

  function downloadAll() {
    if (!results.length) return
    if (results.length === 1) {
      downloadBlob(results[0].blob, `page-${results[0].page}.${format === "jpeg" ? "jpg" : "png"}`)
      return
    }
    void makeZip(
      results.map((item) => ({
        name: `page-${String(item.page).padStart(3, "0")}.${format === "jpeg" ? "jpg" : "png"}`,
        blob: item.blob,
      })),
    ).then((zip) => {
      downloadBlob(zip, `localpixel-pages-${format}.zip`)
      toast.success("ZIP ready.")
    })
  }

  function reset() {
    void releasePdf(pdf)
    setPdf(null)
    setFile(null)
    setResults([])
    setError(null)
    setRange("")
  }

  return (
    <ToolPage
      tool={TOOL}
      aside={
        <>
          <Panel title="Render settings" step="settings">
            <div className="space-y-5">
              <div>
                <p className="mb-2 text-[13px] font-medium">Image format</p>
                <Segmented
                  label="Image format"
                  value={format}
                  onChange={setFormat}
                  options={[
                    { value: "png", label: "PNG" },
                    { value: "jpeg", label: "JPG" },
                    { value: "webp", label: "WebP" },
                  ]}
                />
              </div>
              <div>
                <p className="mb-2 text-[13px] font-medium">Resolution</p>
                <Segmented
                  label="Resolution"
                  value={dpi}
                  onChange={setDpi}
                  options={[
                    { value: "96", label: "96 dpi" },
                    { value: "150", label: "150 dpi" },
                    { value: "300", label: "300 dpi" },
                  ]}
                />
                <p className="mt-2 text-[11.5px] text-muted-foreground">
                  {dpi === "300" ? "Print quality — large files and slower rendering." : "Screen quality."}
                </p>
              </div>
              <div>
                <p className="mb-2 text-[13px] font-medium">Pages</p>
                <TextInput
                  value={range}
                  onChange={(event) => setRange(event.target.value)}
                  placeholder="1-3, 5"
                  aria-label="Pages to render"
                  spellCheck={false}
                  disabled={!pdf}
                />
                {pdf ? (
                  <div className="mt-2 flex items-center justify-between">
                    <Button size="sm" variant="outline" onClick={() => setRange(`1-${pdf.numPages}`)}>
                      All pages
                    </Button>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {pages.length} of {pdf.numPages}
                    </span>
                  </div>
                ) : null}
              </div>
              <RunButton className="w-full" running={running} onClick={render} disabled={!pdf || !pages.length}>
                <Images />
                Render pages
              </RunButton>
              {running ? (
                <div>
                  <div className="mb-1.5 flex justify-between font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                    <span>rasterising</span>
                    <span>{Math.round(progress * 100)}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                    <motion.div
                      className="h-full rounded-full bg-primary"
                      animate={{ width: `${progress * 100}%` }}
                      transition={{ duration: 0.2 }}
                    />
                  </div>
                </div>
              ) : null}
              <Notice>
                Pages are rendered from the PDF vector data at the selected DPI, not screenshots of a
                scaled preview.
              </Notice>
            </div>
          </Panel>

          <Panel title="Output" step="readout" tone="quiet">
            <div className="grid grid-cols-2 gap-4">
              <Stat label="Rendered" value={`${results.length}${pdf ? `/${pages.length}` : ""}`} />
              <Stat label="Total" value={results.length ? formatBytes(totalSize) : "—"} />
              <Stat label="Format" value={format.toUpperCase()} />
              <Stat label="DPI" value={dpi} />
            </div>
          </Panel>
        </>
      }
    >
      <Panel
        title="PDF source"
        step="01"
        actions={file ? <Badge tone="neutral">{pdf?.numPages} pages</Badge> : null}
      >
        {!file ? (
          <Dropzone
            onFiles={(files) => void accept(files)}
            accept="application/pdf,.pdf"
            multiple={false}
            title="Drop a PDF to render"
            hint="Every page becomes a PNG, JPG or WebP · 100 MB maximum"
            disabled={loading}
          />
        ) : (
          <div className="space-y-3">
            <FileRow
              name={file.name}
              meta={`${formatBytes(file.size)} · ${pdf?.numPages ?? "…"} pages`}
              badge={<Badge tone="signal">local</Badge>}
              onRemove={reset}
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => document.querySelector<HTMLInputElement>("#pdf-img-replace")?.click()}>
                Replace PDF
              </Button>
              <input
                id="pdf-img-replace"
                type="file"
                accept="application/pdf,.pdf"
                className="sr-only"
                onChange={(event) => {
                  if (event.target.files?.[0]) void accept([event.target.files[0]])
                  event.target.value = ""
                }}
              />
              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcw />
                Clear
              </Button>
            </div>
          </div>
        )}
        {error ? (
          <div className="mt-4">
            <Notice tone="warn">{error}</Notice>
          </div>
        ) : null}
      </Panel>

      <Panel
        title="Rendered pages"
        step="02"
        actions={
          results.length ? (
            <DownloadButton size="sm" onDownload={downloadAll}>
              <Archive />
              {results.length > 1 ? "Download ZIP" : "Download"}
            </DownloadButton>
          ) : null
        }
      >
        {results.length ? (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-3 font-mono text-[10.5px] text-muted-foreground">
              <span>{results.length} pages</span>
              <span className="size-1 rounded-full bg-line" />
              <span>{format.toUpperCase()}</span>
              <span className="size-1 rounded-full bg-line" />
              <span>{dpi} dpi</span>
              <span className="size-1 rounded-full bg-line" />
              <span>{formatBytes(totalSize)}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {results.map((item) => (
                <PageCard
                  key={item.page}
                  item={item}
                  onDownload={() =>
                    downloadBlob(item.blob, `page-${item.page}.${format === "jpeg" ? "jpg" : "png"}`)
                  }
                />
              ))}
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
              <Button variant="outline" size="sm" onClick={downloadAll}>
                <Archive />
                Save all as ZIP
              </Button>
              <span className="flex items-center gap-1.5 font-mono text-[10.5px] text-muted-foreground">
                <FileImage className="size-3" /> individual pages download from their card
              </span>
            </div>
          </>
        ) : (
          <EmptyHint>
            Load a PDF, choose a resolution and page range, then render. Each page is drawn from the
            document’s own vector data.
          </EmptyHint>
        )}
      </Panel>
    </ToolPage>
  )
}

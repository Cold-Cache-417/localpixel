import * as React from "react"
import { AnimatePresence, motion } from "motion/react"
import { AlertTriangle, Download, FileText, Loader2, RotateCcw } from "lucide-react"
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
import { Switch, TextInput } from "@/components/ui/field"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { loadPdf, releasePdf, renderPageToCanvas } from "@/lib/pdf"
import { extractPdfText } from "@/lib/pdf-text"
import { textToDocx } from "@/lib/docx"
import { useObjectUrl } from "@/hooks/useObjectUrl"
import { downloadBlob, formatBytes, stripExtension } from "@/lib/utils"

const TOOL = toolBySlug("pdf-to-word")!

export function PdfToWord() {
  const [file, setFile] = React.useState<File | null>(null)
  const [pdf, setPdf] = React.useState<PDFDocumentProxy | null>(null)
  const [pages, setPages] = React.useState<string[]>([])
  const [thumb, setThumb] = React.useState<Blob | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [running, setRunning] = React.useState(false)
  const [result, setResult] = React.useState<{ blob: Blob; name: string } | null>(null)
  const [title, setTitle] = React.useState("")
  const [pageBreaks, setPageBreaks] = React.useState(true)
  const [docText, setDocText] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const thumbUrl = useObjectUrl(thumb)

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
    setResult(null)
    setPages([])
    setThumb(null)
    try {
      const doc = await loadPdf(next)
      setPdf(doc)
      setFile(next)
      setTitle(stripExtension(next.name))
      const text = await extractPdfText(doc)
      setPages(text)
      setDocText(text.map((page) => page.trim()).filter(Boolean).join("\n\n---\n\n"))
      const canvas = await renderPageToCanvas(doc, 1, 0.7)
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"))
      setThumb(blob)
      toast.success(`Read ${doc.numPages} page${doc.numPages > 1 ? "s" : ""}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "This PDF could not be read.")
      setFile(null)
      setPdf(null)
    } finally {
      setLoading(false)
    }
  }

  const totalChars = pages.reduce((sum, page) => sum + page.trim().length, 0)
  const pagesWithText = pages.filter((page) => page.trim().length > 20).length

  async function generate() {
    if (!pages.length) return
    setRunning(true)
    try {
      const docPages = docText.split(/\n\s*---\s*\n/).map((page) => page.trim()).filter(Boolean)
      const blob = await textToDocx(docPages, {
        pageBreaks,
        title: title.trim() || "Converted document",
      })
      setResult({
        blob,
        name: `${stripExtension(file?.name ?? "document")}.docx`,
      })
      toast.success("Word document built.")
    } catch {
      toast.error("The DOCX could not be generated.")
    } finally {
      setRunning(false)
    }
  }

  function reset() {
    void releasePdf(pdf)
    setPdf(null)
    setFile(null)
    setPages([])
    setDocText("")
    setThumb(null)
    setResult(null)
    setError(null)
  }

  return (
    <ToolPage
      tool={TOOL}
      aside={
        <>
          <Panel title="Word document" step="settings">
            <div className="space-y-5">
              <div>
                <label htmlFor="doc-title" className="mb-2 block text-[13px] font-medium">
                  Document title
                </label>
                <TextInput
                  id="doc-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Converted document"
                />
              </div>
              <Switch
                checked={pageBreaks}
                onChange={setPageBreaks}
                label="Page breaks"
                description="Start each PDF page on a new Word page."
              />
              <RunButton className="w-full" running={running} onClick={generate} disabled={!pages.length}>
                <FileText />
                Build DOCX
              </RunButton>
              <Notice>
                This extracts the text layer. Columns and tables are flattened into paragraphs —
                complex layouts may need tidying once opened in Word.
              </Notice>
            </div>
          </Panel>

          <Panel title="Source" step="readout" tone="quiet">
            <div className="grid grid-cols-2 gap-4">
              <Stat label="Pages" value={pdf?.numPages ?? "—"} />
              <Stat label="With text" value={pages.length ? pagesWithText : "—"} />
              <Stat label="Characters" value={pages.length ? totalChars.toLocaleString() : "—"} />
              <Stat label="Size" value={file ? formatBytes(file.size) : "—"} />
            </div>
          </Panel>
        </>
      }
    >
      <Panel
        title="PDF source"
        step="01"
        actions={file ? <Badge tone="neutral">PDF</Badge> : null}
      >
        {!file ? (
          <Dropzone
            onFiles={(files) => void accept(files)}
            accept="application/pdf,.pdf"
            multiple={false}
            title="Drop a PDF to read"
            hint="Text-based PDFs convert best · 100 MB maximum"
            disabled={loading}
          />
        ) : (
          <div className="space-y-3">
            <FileRow
              name={file.name}
              meta={`${formatBytes(file.size)} · ${pdf?.numPages ?? "…"} pages`}
              badge={<Badge tone="signal">loaded locally</Badge>}
              onRemove={reset}
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => document.querySelector<HTMLInputElement>("#pdf-word-replace")?.click()}>
                Replace PDF
              </Button>
              <input
                id="pdf-word-replace"
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

        {loading ? (
          <div className="mt-4 flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            reading pages…
          </div>
        ) : null}
        {error ? (
          <div className="mt-4">
            <Notice tone="warn">{error}</Notice>
          </div>
        ) : null}
      </Panel>

      {pdf ? (
        <>
          <Panel
            title="Extracted text"
            step="02"
            actions={null}
          >
            <div className="grid gap-4 sm:grid-cols-[132px_1fr]">
              <div>
                <div className="overflow-hidden rounded-[10px] border border-border bg-secondary/40">
                  {thumbUrl ? (
                    <motion.img
                      key={thumbUrl}
                      src={thumbUrl}
                      alt="First page preview"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="w-full"
                    />
                  ) : (
                    <div className="grid aspect-[0.71] place-items-center">
                      <FileText className="size-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <p className="mt-2 font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground">
                  page 1 render
                </p>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted-foreground">
                    editable text
                  </p>
                  <span className="font-mono text-[9.5px] text-muted-foreground">
                    {docText.length} chars
                  </span>
                </div>
                <textarea
                  value={docText}
                  onChange={(event) => setDocText(event.target.value)}
                  rows={14}
                  aria-label="Editable extracted text"
                  placeholder="No text layer on this page."
                  className="max-h-[280px] w-full resize-y rounded-[10px] border border-line bg-secondary/20 p-3 font-mono text-[11.5px] leading-relaxed text-muted-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                />
                <p className="mt-2 font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted-foreground">
                  Pages are separated by a line containing ——
                </p>
              </div>
            </div>

            {totalChars < 40 ? (
              <div className="mt-4 flex items-start gap-2.5 rounded-[10px] border border-destructive/25 bg-destructive/5 px-3.5 py-3">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
                <p className="text-[12px] leading-relaxed text-muted-foreground">
                  Almost no text was found. This PDF is probably a scan or an image-only export, so the
                  Word file will be empty. OCR is not part of this tool.
                </p>
              </div>
            ) : null}
          </Panel>

          <Panel
            title="Word export"
            step="03"
            actions={
              result ? (
                <DownloadButton size="sm" onDownload={() => downloadBlob(result.blob, result.name)}>
                  Download DOCX
                </DownloadButton>
              ) : null
            }
          >
            <AnimatePresence mode="wait">
              {result ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-[10px] border border-signal/25 bg-signal/10 text-signal">
                      <FileText className="size-4" />
                    </span>
                    <div>
                      <p className="text-[13px] font-medium">{result.name}</p>
                      <p className="font-mono text-[10.5px] text-muted-foreground">
                        {formatBytes(result.blob.size)} · {pdf.numPages} pages ·{" "}
                        {totalChars.toLocaleString()} characters
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => downloadBlob(result.blob, result.name)}>
                    <Download />
                    Save .docx
                  </Button>
                </motion.div>
              ) : (
                <EmptyHint>
                  Press “Build DOCX” to assemble the text into a Word document. Nothing leaves the
                  browser.
                </EmptyHint>
              )}
            </AnimatePresence>
          </Panel>
        </>
      ) : null}
    </ToolPage>
  )
}

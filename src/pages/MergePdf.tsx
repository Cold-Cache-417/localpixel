import * as React from "react"
import { AnimatePresence, motion } from "motion/react"
import { Archive, Combine, Download, FileText, Scissors, Trash2 } from "lucide-react"
import { toast } from "sonner"
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
import { extractPages, mergePdfs } from "@/lib/pdf-ops"
import { useObjectUrl } from "@/hooks/useObjectUrl"
import { downloadBlob, formatBytes, uid } from "@/lib/utils"
import { makeZip } from "@/lib/zip"

const TOOL = toolBySlug("merge-pdf")!

interface Item {
  id: string
  file: File
  pages: number
}

function PageThumb({ blob, label }: { blob: Blob; label: number }) {
  const url = useObjectUrl(blob)
  return (
    <div className="overflow-hidden rounded-[8px] border border-border bg-card">
      <div className="bg-secondary/40">
        {url ? <img src={url} alt={`Page ${label}`} className="w-full" /> : null}
      </div>
      <p className="border-t border-line px-2 py-1 text-center font-mono text-[9px] text-muted-foreground">
        p.{label}
      </p>
    </div>
  )
}

export function MergePdf() {
  const [mode, setMode] = React.useState<"merge" | "split">("merge")
  const [items, setItems] = React.useState<Item[]>([])
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [range, setRange] = React.useState("")
  const [running, setRunning] = React.useState(false)
  const [thumbs, setThumbs] = React.useState<{ page: number; blob: Blob }[]>([])
  const [mergeResult, setMergeResult] = React.useState<{ blob: Blob; pages: number } | null>(null)
  const [splitResult, setSplitResult] = React.useState<{ blob: Blob; name: string; label: string } | null>(null)

  const selected = items.find((item) => item.id === selectedId) ?? items[0] ?? null
  const selectedPages = selected ? parseRanges(range, selected.pages) : []

  const addFiles = React.useCallback(async (files: File[]) => {
    const accepted: Item[] = []
    for (const file of files) {
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
      if (!isPdf) {
        toast.error(`${file.name} is not a PDF.`)
        continue
      }
      if (file.size > 100 * 1024 * 1024) {
        toast.error(`${file.name} is larger than 100 MB.`)
        continue
      }
      try {
        const doc = await loadPdf(file)
        accepted.push({ id: uid("pdf"), file, pages: doc.numPages })
        releasePdf(doc)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : `${file.name} could not be read.`)
      }
    }
    setItems((prev) => [...prev, ...accepted].slice(0, 30))
    setMergeResult(null)
    setSplitResult(null)
    if (accepted.length && !selectedId) setSelectedId(accepted[0].id)
  }, [selectedId])

  React.useEffect(() => {
    if (mode !== "split" || !selected || !selectedPages.length) {
      setThumbs([])
      return
    }
    let cancelled = false
    const timer = window.setTimeout(async () => {
      try {
        const doc = await loadPdf(selected.file)
        const out: { page: number; blob: Blob }[] = []
        for (const pageNumber of selectedPages.slice(0, 12)) {
          const canvas = await renderPageToCanvas(doc, pageNumber, 0.32)
          const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"))
          if (blob) out.push({ page: pageNumber, blob })
          if (cancelled) break
        }
        releasePdf(doc)
        if (!cancelled) setThumbs(out)
      } catch {
        if (!cancelled) setThumbs([])
      }
    }, 240)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, selected?.id, range])

  async function merge() {
    if (items.length < 1) return
    setRunning(true)
    try {
      const buffers: ArrayBuffer[] = []
      for (const item of items) buffers.push(await item.file.arrayBuffer())
      const blob = await mergePdfs(buffers)
      const check = await loadPdf(new File([blob], "check.pdf", { type: "application/pdf" }))
      const pages = check.numPages
      releasePdf(check)
      setMergeResult({ blob, pages })
      toast.success(`Merged into ${pages} pages.`)
    } catch {
      toast.error("Those PDFs could not be merged. One may be encrypted or damaged.")
    } finally {
      setRunning(false)
    }
  }

  async function extract() {
    if (!selected || !selectedPages.length) return
    setRunning(true)
    try {
      const blob = await extractPages(await selected.file.arrayBuffer(), selectedPages)
      setSplitResult({
        blob,
        name: "localpixel-pages.pdf",
        label: `${selectedPages.length} page${selectedPages.length > 1 ? "s" : ""}`,
      })
      toast.success("Pages extracted.")
    } catch {
      toast.error("Pages could not be extracted from this PDF.")
    } finally {
      setRunning(false)
    }
  }

  async function splitEvery() {
    if (!selected) return
    if (selected.pages > 100) {
      toast.error("This PDF has more than 100 pages. Extract a range instead.")
      return
    }
    setRunning(true)
    try {
      const buffer = await selected.file.arrayBuffer()
      const entries: { name: string; blob: Blob }[] = []
      for (let page = 1; page <= selected.pages; page++) {
        const blob = await extractPages(buffer, [page])
        entries.push({
          name: `page-${String(page).padStart(2, "0")}.pdf`,
          blob,
        })
      }
      const zip = await makeZip(entries)
      setSplitResult({
        blob: zip,
        name: "localpixel-split-pages.zip",
        label: `${selected.pages} single-page PDFs`,
      })
      toast.success("Per-page ZIP ready.")
    } catch {
      toast.error("This PDF could not be split.")
    } finally {
      setRunning(false)
    }
  }

  function reset() {
    setItems([])
    setSelectedId(null)
    setRange("")
    setThumbs([])
    setMergeResult(null)
    setSplitResult(null)
  }

  return (
    <ToolPage
      tool={TOOL}
      aside={
        <>
          <Panel title="Operation" step="settings">
            <div className="space-y-5">
              <Segmented
                label="Operation"
                value={mode}
                onChange={(next) => {
                  setMode(next)
                  setSplitResult(null)
                }}
                options={[
                  { value: "merge", label: "Merge" },
                  { value: "split", label: "Split" },
                ]}
              />
              {mode === "merge" ? (
                <>
                  <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                    Documents are combined in the order shown. Pages, bookmarks and rotations are
                    preserved by pdf-lib.
                  </p>
                  <RunButton className="w-full" running={running} onClick={merge} disabled={items.length < 1}>
                    <Combine />
                    Merge {items.length || ""} PDFs
                  </RunButton>
                </>
              ) : (
                <>
                  <div>
                    <p className="mb-2 text-[13px] font-medium">Pages to extract</p>
                    <TextInput
                      value={range}
                      onChange={(event) => setRange(event.target.value)}
                      placeholder="1-3, 5, 8-10"
                      spellCheck={false}
                      aria-label="Pages to extract"
                    />
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => selected && setRange(`1-${selected.pages}`)}
                        disabled={!selected}
                      >
                        All pages
                      </Button>
                      {selected ? (
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {selectedPages.length} selected · {selected.pages} total
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <RunButton
                    className="w-full"
                    running={running}
                    onClick={extract}
                    disabled={!selectedPages.length}
                  >
                    <Scissors />
                    Extract pages
                  </RunButton>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={splitEvery}
                    disabled={!selected || running}
                  >
                    <Archive />
                    Split every page (ZIP)
                  </Button>
                  <Notice>
                    Extraction starts a fresh PDF containing only the pages you list. The source is
                    untouched.
                  </Notice>
                </>
              )}
            </div>
          </Panel>

          <Panel title="Working set" step="readout" tone="quiet">
            <div className="grid grid-cols-2 gap-4">
              <Stat label="Files" value={items.length} />
              <Stat label="Pages" value={items.reduce((sum, item) => sum + item.pages, 0)} />
              <Stat label="Input" value={formatBytes(items.reduce((sum, item) => sum + item.file.size, 0))} />
              <Stat
                label="Output"
                value={
                  mergeResult
                    ? formatBytes(mergeResult.blob.size)
                    : splitResult
                      ? formatBytes(splitResult.blob.size)
                      : "—"
                }
              />
            </div>
          </Panel>
        </>
      }
    >
      <Panel
        title={mode === "merge" ? "Documents in order" : "Choose a document"}
        step="01"
        actions={
          items.length ? (
            <Button size="sm" variant="ghost" onClick={reset}>
              <Trash2 />
              Clear
            </Button>
          ) : null
        }
      >
        <Dropzone
          onFiles={addFiles}
          accept="application/pdf,.pdf"
          multiple={mode === "merge"}
          title={items.length ? "Add another PDF" : "Drop PDF files here"}
          hint={
            mode === "merge"
              ? "Two or more documents · 100 MB each · merged in list order"
              : "Pick one document, then choose the pages to keep"
          }
          compact={items.length > 0}
          disabled={running}
        />

        <div className="mt-4 space-y-2">
          {items.map((item) => {
            const active = mode === "split" && item.id === selected?.id
            return (
              <div key={item.id} onClick={() => mode === "split" && setSelectedId(item.id)}>
                <FileRow
                  name={item.file.name}
                  meta={`${formatBytes(item.file.size)} · ${item.pages} pages`}
                  badge={active ? <Badge tone="primary">selected</Badge> : <Badge tone="neutral">PDF</Badge>}
                  className={mode === "split" ? "cursor-pointer" : undefined}
                  onRemove={() => {
                    setItems((prev) => prev.filter((entry) => entry.id !== item.id))
                    setMergeResult(null)
                    setSplitResult(null)
                  }}
                />
              </div>
            )
          })}
        </div>

        {mode === "merge" && items.length > 1 ? (
          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
            {items.map((item) => item.file.name).join("  →  ")}
          </p>
        ) : null}
      </Panel>

      <AnimatePresence mode="wait">
        {mode === "split" && selected && selectedPages.length ? (
          <motion.div key="preview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Panel title="Page preview" step="02" actions={<span className="font-mono text-[10px] text-muted-foreground">{selectedPages.length > 12 ? "first 12 shown" : `${selectedPages.length} pages`}</span>}>
              <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
                {thumbs.map((thumb) => (
                  <PageThumb key={thumb.page} blob={thumb.blob} label={thumb.page} />
                ))}
                {!thumbs.length ? (
                  <div className="col-span-full grid h-24 place-items-center font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                    rendering previews…
                  </div>
                ) : null}
              </div>
            </Panel>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <Panel
        title="Result"
        step={mode === "merge" ? "02" : "03"}
        actions={
          mergeResult ? (
            <DownloadButton size="sm" onDownload={() => downloadBlob(mergeResult.blob, "localpixel-merged.pdf")}>
              Download PDF
            </DownloadButton>
          ) : splitResult ? (
            <DownloadButton size="sm" onDownload={() => downloadBlob(splitResult.blob, splitResult.name)}>
              Download
            </DownloadButton>
          ) : null
        }
      >
        {mergeResult ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-[10px] border border-signal/25 bg-signal/10 text-signal">
                <FileText className="size-4" />
              </span>
              <div>
                <p className="text-[13.5px] font-medium">Merged document</p>
                <p className="font-mono text-[10.5px] text-muted-foreground">
                  {mergeResult.pages} pages · {formatBytes(mergeResult.blob.size)} · verified by reopening
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => downloadBlob(mergeResult.blob, "localpixel-merged.pdf")}>
              <Download />
              Save
            </Button>
          </div>
        ) : splitResult ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-[10px] border border-signal/25 bg-signal/10 text-signal">
                <Scissors className="size-4" />
              </span>
              <div>
                <p className="text-[13.5px] font-medium">{splitResult.name}</p>
                <p className="font-mono text-[10.5px] text-muted-foreground">
                  {splitResult.label} · {formatBytes(splitResult.blob.size)}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => downloadBlob(splitResult.blob, splitResult.name)}>
              <Download />
              Save
            </Button>
          </div>
        ) : (
          <EmptyHint>
            {mode === "merge"
              ? "Add two or more PDFs, then merge. Page counts are read before anything is combined."
              : "Pick a document and a page range to preview and extract."}
          </EmptyHint>
        )}
      </Panel>
    </ToolPage>
  )
}

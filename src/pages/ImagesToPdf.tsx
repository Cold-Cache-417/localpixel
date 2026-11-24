import * as React from "react"
import { AnimatePresence, motion } from "motion/react"
import { ArrowDown, ArrowUp, Download, FileText, GripVertical, RotateCcw, Trash2 } from "lucide-react"
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
import { Segmented } from "@/components/ui/field"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { decodeImage } from "@/lib/image"
import { imagesToPdf, type ImagesToPdfOptions, type PageOrientation, type PagePreset } from "@/lib/pdf-ops"
import { loadPdf, releasePdf, renderPageToCanvas } from "@/lib/pdf"
import { useObjectUrl } from "@/hooks/useObjectUrl"
import { downloadBlob, formatBytes, uid } from "@/lib/utils"

const TOOL = toolBySlug("images-to-pdf")!

interface Item {
  id: string
  file: File
  width: number
  height: number
}

export function ImagesToPdf() {
  const [items, setItems] = React.useState<Item[]>([])
  const [preset, setPreset] = React.useState<PagePreset>("a4")
  const [orientation, setOrientation] = React.useState<PageOrientation>("auto")
  const [margin, setMargin] = React.useState(28)
  const [running, setRunning] = React.useState(false)
  const [result, setResult] = React.useState<{ blob: Blob; pages: number } | null>(null)
  const [thumb, setThumb] = React.useState<Blob | null>(null)
  const [dragId, setDragId] = React.useState<string | null>(null)
  const thumbUrl = useObjectUrl(thumb)

  const addFiles = React.useCallback(async (files: File[]) => {
    const accepted: Item[] = []
    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image.`)
        continue
      }
      if (file.size > 40 * 1024 * 1024) {
        toast.error(`${file.name} is larger than 40 MB.`)
        continue
      }
      try {
        const img = await decodeImage(file)
        accepted.push({ id: uid("page"), file, width: img.naturalWidth, height: img.naturalHeight })
      } catch {
        toast.error(`${file.name} could not be decoded.`)
      }
    }
    setItems((prev) => [...prev, ...accepted].slice(0, 60))
    setResult(null)
  }, [])

  React.useEffect(() => {
    setResult(null)
  }, [preset, orientation, margin])

  function move(fromId: string, toId: string) {
    setItems((prev) => {
      const from = prev.findIndex((item) => item.id === fromId)
      const to = prev.findIndex((item) => item.id === toId)
      if (from < 0 || to < 0 || from === to) return prev
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }

  function nudge(id: string, direction: -1 | 1) {
    setItems((prev) => {
      const index = prev.findIndex((item) => item.id === id)
      const target = index + direction
      if (index < 0 || target < 0 || target >= prev.length) return prev
      const next = [...prev]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  const options: ImagesToPdfOptions = { preset, orientation, margin }

  async function run() {
    if (!items.length) return
    setRunning(true)
    setResult(null)
    setThumb(null)
    try {
      const blob = await imagesToPdf(items.map((item) => item.file), options)
      const check = await loadPdf(new File([blob], "check.pdf", { type: "application/pdf" }))
      const pages = check.numPages
      const canvas = await renderPageToCanvas(check, 1, 0.9)
      const preview = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"))
      releasePdf(check)
      setResult({ blob, pages })
      setThumb(preview)
      toast.success(`PDF built with ${pages} page${pages > 1 ? "s" : ""}.`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "The PDF could not be built.")
    } finally {
      setRunning(false)
    }
  }

  return (
    <ToolPage
      tool={TOOL}
      aside={
        <>
          <Panel title="Page setup" step="settings">
            <div className="space-y-5">
              <div>
                <p className="mb-2 text-[13px] font-medium">Page size</p>
                <Segmented
                  label="Page size"
                  value={preset}
                  onChange={setPreset}
                  options={[
                    { value: "a4", label: "A4" },
                    { value: "letter", label: "Letter" },
                    { value: "fit", label: "Fit image" },
                  ]}
                />
              </div>
              <div>
                <p className="mb-2 text-[13px] font-medium">Orientation</p>
                <Segmented
                  label="Orientation"
                  value={orientation}
                  onChange={setOrientation}
                  options={[
                    { value: "auto", label: "Auto" },
                    { value: "portrait", label: "Portrait" },
                    { value: "landscape", label: "Landscape" },
                  ]}
                />
              </div>
              <Slider
                label="Margin"
                valueLabel={`${margin} pt`}
                min={0}
                max={72}
                step={2}
                value={margin}
                onChange={(event) => setMargin(Number(event.target.value))}
                disabled={preset === "fit"}
              />
              <RunButton className="w-full" running={running} onClick={run} disabled={!items.length}>
                <FileText />
                Build PDF
              </RunButton>
              <Notice>
                Each image becomes one page, centred and scaled to fit inside the margin. Images keep
                their aspect ratio.
              </Notice>
            </div>
          </Panel>

          <Panel title="Document" step="readout" tone="quiet">
            <div className="grid grid-cols-2 gap-4">
              <Stat label="Pages" value={items.length} />
              <Stat label="Images" value={formatBytes(items.reduce((sum, item) => sum + item.file.size, 0))} />
              <Stat label="Output" value={result ? formatBytes(result.blob.size) : "—"} />
              <Stat label="Size" value={preset === "fit" ? "per image" : preset.toUpperCase()} />
            </div>
          </Panel>
        </>
      }
    >
      <Panel
        title="Pages in order"
        step="01"
        actions={
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
              {items.length}/60
            </span>
            {items.length ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setItems([])
                  setResult(null)
                }}
              >
                <Trash2 />
                Clear
              </Button>
            ) : null}
          </div>
        }
      >
        <Dropzone
          onFiles={addFiles}
          accept="image/*"
          title={items.length ? "Add more pages" : "Drop images to assemble"}
          hint="Each image becomes a page · drag rows or use arrows to reorder"
          compact={items.length > 0}
          disabled={running}
        />

        <div className="mt-4 space-y-2">
          {items.map((item, index) => (
            <div
              key={item.id}
              draggable
              onDragStart={() => setDragId(item.id)}
              onDragEnd={() => setDragId(null)}
              onDragOver={(event) => {
                event.preventDefault()
                if (dragId && dragId !== item.id) move(dragId, item.id)
              }}
              className={`transition-opacity ${dragId === item.id ? "opacity-40" : "opacity-100"}`}
            >
              <FileRow
                name={item.file.name}
                preview={item.file}
                meta={`${formatBytes(item.file.size)} · ${item.width} × ${item.height}`}
                badge={<Badge tone="neutral">p.{String(index + 1).padStart(2, "0")}</Badge>}
                trailing={
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      aria-label={`Move ${item.file.name} up`}
                      disabled={index === 0}
                      onClick={() => {
                        nudge(item.id, -1)
                        setResult(null)
                      }}
                      className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30"
                    >
                      <ArrowUp className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${item.file.name} down`}
                      disabled={index === items.length - 1}
                      onClick={() => {
                        nudge(item.id, 1)
                        setResult(null)
                      }}
                      className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30"
                    >
                      <ArrowDown className="size-3.5" />
                    </button>
                    <GripVertical className="ml-0.5 size-3.5 cursor-grab text-muted-foreground/50" />
                  </div>
                }
                onRemove={() => {
                  setItems((prev) => prev.filter((entry) => entry.id !== item.id))
                  setResult(null)
                }}
              />
            </div>
          ))}
        </div>

        <AnimatePresence>
          {items.length > 1 ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-3 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground"
            >
              page order reads top to bottom
            </motion.p>
          ) : null}
        </AnimatePresence>
      </Panel>

      <Panel
        title="Document output"
        step="02"
        actions={
          result ? (
            <DownloadButton size="sm" onDownload={() => downloadBlob(result.blob, "localpixel-images.pdf")}>
              Download PDF
            </DownloadButton>
          ) : null
        }
      >
        {result ? (
          <div className="flex flex-wrap items-start gap-6">
            <div className="w-[132px] overflow-hidden rounded-[10px] border border-border bg-secondary/40 shadow-[var(--shadow-raise)]">
              {thumbUrl ? (
                <img src={thumbUrl} alt="First page of the generated PDF" className="w-full" />
              ) : null}
            </div>
            <div className="min-w-[200px] flex-1 space-y-4">
              <div>
                <p className="font-display text-[18px] font-semibold tracking-[-0.02em]">
                  {result.pages} page{result.pages > 1 ? "s" : ""} · {formatBytes(result.blob.size)}
                </p>
                <p className="mt-1 font-mono text-[10.5px] text-muted-foreground">
                  first page rendered back from the exported bytes
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => downloadBlob(result.blob, "localpixel-images.pdf")}>
                  <Download />
                  Save PDF
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setResult(null)
                    setThumb(null)
                  }}
                >
                  <RotateCcw />
                  Rebuild
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <EmptyHint>
            Add images in the order you want them to appear, choose a page size, then build. The result
            is verified by re-opening it with PDF.js.
          </EmptyHint>
        )}
      </Panel>
    </ToolPage>
  )
}

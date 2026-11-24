import * as React from "react"
import { AnimatePresence, motion } from "motion/react"
import { Archive, Download, ImageDown, RotateCcw, Sparkles } from "lucide-react"
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
import { Slider } from "@/components/ui/slider"
import { Segmented } from "@/components/ui/field"
import { Button } from "@/components/ui/button"
import { decodeImage, drawToCanvas, encodeCanvas } from "@/lib/image"
import { downloadBlob, formatBytes, percentSaving, stripExtension, uid } from "@/lib/utils"
import { makeZip } from "@/lib/zip"

const TOOL = toolBySlug("png-to-webp")!
const MAX_BYTES = 40 * 1024 * 1024

interface Item {
  id: string
  file: File
  width: number
  height: number
}

interface Result {
  id: string
  sourceName: string
  name: string
  blob: Blob
  width: number
  height: number
  sourceBytes: number
}

function validate(file: File) {
  const isPng = file.type === "image/png" || file.name.toLowerCase().endsWith(".png")
  if (!isPng) return `${file.name} is not a PNG. This bench only accepts PNG input.`
  if (file.size > MAX_BYTES) return `${file.name} is larger than 40 MB.`
  return null
}

export function PngToWebp() {
  const [items, setItems] = React.useState<Item[]>([])
  const [quality, setQuality] = React.useState(0.85)
  const [maxWidth, setMaxWidth] = React.useState("0")
  const [results, setResults] = React.useState<Result[]>([])
  const [running, setRunning] = React.useState(false)
  const [progress, setProgress] = React.useState(0)

  const addFiles = React.useCallback(async (files: File[]) => {
    const accepted: Item[] = []
    for (const file of files) {
      if (validate(file)) continue
      try {
        const img = await decodeImage(file)
        accepted.push({ id: uid("png"), file, width: img.naturalWidth, height: img.naturalHeight })
      } catch {
        toast.error(`${file.name} could not be decoded.`)
      }
    }
    setItems((prev) => [...prev, ...accepted].slice(0, 40))
    setResults([])
  }, [])

  React.useEffect(() => {
    setResults([])
  }, [quality, maxWidth])

  const totalIn = items.reduce((sum, item) => sum + item.file.size, 0)
  const totalOut = results.reduce((sum, item) => sum + item.blob.size, 0)
  const saving = percentSaving(totalIn, totalOut)

  async function run() {
    if (!items.length) return
    setRunning(true)
    setProgress(0)
    const next: Result[] = []
    for (let index = 0; index < items.length; index++) {
      const item = items[index]
      try {
        const img = await decodeImage(item.file)
        const canvas = drawToCanvas(img, maxWidth === "0" ? {} : { maxWidth: Number(maxWidth) })
        const blob = await encodeCanvas(canvas, "webp", quality)
        next.push({
          id: item.id,
          sourceName: item.file.name,
          name: `${stripExtension(item.file.name)}.webp`,
          blob,
          width: canvas.width,
          height: canvas.height,
          sourceBytes: item.file.size,
        })
      } catch {
        toast.error(`${item.file.name} failed to encode.`)
      }
      setProgress((index + 1) / items.length)
    }
    setResults(next)
    setRunning(false)
    if (next.length) toast.success("WebP files ready.")
  }

  function downloadAll() {
    if (results.length === 1) {
      downloadBlob(results[0].blob, results[0].name)
      return
    }
    void makeZip(results.map((result) => ({ name: result.name, blob: result.blob }))).then((zip) => {
      downloadBlob(zip, "localpixel-webp.zip")
    })
  }

  return (
    <ToolPage
      tool={TOOL}
      aside={
        <>
          <Panel title="WebP settings" step="settings">
            <div className="space-y-6">
              <Slider
                label="Quality"
                valueLabel={`${Math.round(quality * 100)}%`}
                min={10}
                max={100}
                step={1}
                value={Math.round(quality * 100)}
                onChange={(event) => setQuality(Number(event.target.value) / 100)}
                disabled={running}
              />
              <div>
                <p className="mb-2 text-[13px] font-medium">Maximum width</p>
                <Segmented
                  label="Maximum width"
                  value={maxWidth}
                  onChange={setMaxWidth}
                  options={[
                    { value: "0", label: "Original" },
                    { value: "1920", label: "1920" },
                    { value: "1280", label: "1280" },
                    { value: "800", label: "800" },
                  ]}
                />
              </div>
              <Notice>
                Alpha transparency is preserved. WebP at 85% is usually 25–50% smaller than the source
                PNG with no visible difference at normal viewing size.
              </Notice>
              <RunButton className="w-full" running={running} onClick={run} disabled={!items.length}>
                Convert to WebP
              </RunButton>
            </div>
          </Panel>
          <Panel title="Ledger" step="readout" tone="quiet">
            <div className="grid grid-cols-2 gap-4">
              <Stat label="PNG in" value={formatBytes(totalIn)} />
              <Stat label="WebP out" value={results.length ? formatBytes(totalOut) : "—"} />
              <Stat label="Files" value={items.length} />
              <Stat
                label="Saved"
                value={results.length ? `${saving > 0 ? "−" : "+"}${Math.abs(saving)}%` : "—"}
                tone={results.length && saving > 0 ? "signal" : "default"}
              />
            </div>
          </Panel>
        </>
      }
    >
      <Panel
        title="PNG files"
        step="01"
        actions={
          items.length ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setItems([])
                setResults([])
              }}
            >
              <RotateCcw />
              Clear
            </Button>
          ) : null
        }
      >
        <Dropzone
          onFiles={addFiles}
          accept="image/png,.png"
          title={items.length ? "Add more PNGs" : "Drop PNG files here"}
          hint="PNG only · up to 40 files · 40 MB each"
          compact={items.length > 0}
          disabled={running}
          validate={validate}
        />
        <AnimatePresence initial={false}>
          {items.length ? (
            <motion.div layout className="mt-4 space-y-2">
              {items.map((item) => (
                <FileRow
                  key={item.id}
                  name={item.file.name}
                  preview={item.file}
                  meta={`${formatBytes(item.file.size)} · ${item.width} × ${item.height}`}
                  onRemove={() => {
                    setItems((prev) => prev.filter((entry) => entry.id !== item.id))
                    setResults([])
                  }}
                />
              ))}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </Panel>

      <Panel
        title="WebP output"
        step="02"
        actions={
          results.length ? (
            <DownloadButton size="sm" onDownload={downloadAll}>
              {results.length > 1 ? "Download ZIP" : "Download"}
            </DownloadButton>
          ) : null
        }
      >
        {running ? (
          <div className="mb-4">
            <div className="mb-1.5 flex justify-between font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
              <span>encoding</span>
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

        {results.length ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-[12px] border border-signal/25 bg-signal/5 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-full bg-signal/15 text-signal">
                  <Sparkles className="size-4" />
                </span>
                <div>
                  <p className="text-[13px] font-medium">
                    {saving > 0 ? `${Math.abs(saving)}% lighter` : "Conversion complete"}
                  </p>
                  <p className="font-mono text-[10.5px] text-muted-foreground">
                    {formatBytes(totalIn)} → {formatBytes(totalOut)} across {results.length} file
                    {results.length > 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <ImageDown className="size-5 text-signal/60" />
            </div>

            {results.map((result) => {
              const rowSaving = percentSaving(result.sourceBytes, result.blob.size)
              const width = Math.max(4, Math.min(100, (result.blob.size / result.sourceBytes) * 100))
              return (
                <motion.div
                  key={result.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-[12px] border border-border bg-card px-3.5 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium">{result.name}</p>
                      <p className="mt-0.5 font-mono text-[10.5px] text-muted-foreground">
                        {formatBytes(result.sourceBytes)} → {formatBytes(result.blob.size)} ·{" "}
                        {result.width} × {result.height}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={`font-mono text-[11px] tabular-nums ${
                          rowSaving > 0 ? "text-signal" : "text-muted-foreground"
                        }`}
                      >
                        {rowSaving > 0 ? "−" : "+"}
                        {Math.abs(rowSaving)}%
                      </span>
                      <button
                        type="button"
                        onClick={() => downloadBlob(result.blob, result.name)}
                        aria-label={`Download ${result.name}`}
                        className="grid size-8 place-items-center rounded-[8px] border border-border text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        <Download className="size-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-secondary">
                    <motion.div
                      className="h-full rounded-full bg-signal"
                      initial={{ width: 0 }}
                      animate={{ width: `${width}%` }}
                      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                </motion.div>
              )
            })}

            <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
              <Button variant="outline" size="sm" onClick={downloadAll}>
                <Archive />
                Download ZIP
              </Button>
              <span className="font-mono text-[10.5px] text-muted-foreground">alpha preserved</span>
            </div>
          </div>
        ) : (
          <EmptyHint>Drop a PNG and press convert. Outputs appear here with real byte counts.</EmptyHint>
        )}
      </Panel>
    </ToolPage>
  )
}

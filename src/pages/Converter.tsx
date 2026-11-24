import * as React from "react"
import { AnimatePresence, motion } from "motion/react"
import { Archive, Download, Info, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { toolBySlug } from "@/tools"
import {
  DownloadButton,
  EmptyHint,
  Notice,
  Panel,
  RunButton,
  Stat,
  SuccessMark,
  ToolPage,
} from "@/components/ToolUI"
import { Dropzone } from "@/components/Dropzone"
import { FileRow } from "@/components/FileRow"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { decodeImage, drawToCanvas, encodeCanvas, extForFormat, type RasterFormat } from "@/lib/image"
import { downloadBlob, formatBytes, percentSaving, stripExtension, uid } from "@/lib/utils"
import { makeZip } from "@/lib/zip"

const TOOL = toolBySlug("image-converter")!
const MAX_BYTES = 40 * 1024 * 1024

const FORMATS: { value: RasterFormat; label: string; note: string }[] = [
  { value: "png", label: "PNG", note: "lossless · alpha" },
  { value: "jpeg", label: "JPG", note: "smallest photos" },
  { value: "webp", label: "WebP", note: "modern · alpha" },
  { value: "gif", label: "GIF", note: "256 colours" },
  { value: "bmp", label: "BMP", note: "uncompressed" },
  { value: "svg", label: "SVG", note: "raster wrapper" },
]

const NEEDS_BG: RasterFormat[] = ["jpeg", "gif", "bmp"]

interface Item {
  id: string
  file: File
  width: number
  height: number
  type: string
}

interface Result {
  id: string
  name: string
  blob: Blob
  width: number
  height: number
  sourceBytes: number
  target: RasterFormat
}

function detect(file: File): string | null {
  if (file.type.startsWith("image/")) return file.type
  const ext = file.name.split(".").pop()?.toLowerCase()
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    bmp: "image/bmp",
    svg: "image/svg+xml",
    avif: "image/avif",
  }
  return ext ? map[ext] ?? null : null
}

function labelFor(type: string) {
  const map: Record<string, string> = {
    "image/jpeg": "JPG",
    "image/png": "PNG",
    "image/webp": "WebP",
    "image/gif": "GIF",
    "image/bmp": "BMP",
    "image/svg+xml": "SVG",
    "image/avif": "AVIF",
  }
  return map[type] ?? type.replace("image/", "").toUpperCase()
}

function ResultRow({ result, onDownload }: { result: Result; onDownload: () => void }) {
  const saving = percentSaving(result.sourceBytes, result.blob.size)
  return (
    <FileRow
      name={result.name}
      preview={result.blob}
      meta={`${formatBytes(result.blob.size)} · ${result.width} × ${result.height} · ${result.target.toUpperCase()}`}
      badge={
        saving > 0 ? <Badge tone="signal">−{saving}%</Badge> : <Badge tone="neutral">+{Math.abs(saving)}%</Badge>
      }
      trailing={
        <button
          type="button"
          onClick={onDownload}
          aria-label={`Download ${result.name}`}
          className="grid size-8 shrink-0 place-items-center rounded-[8px] border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Download className="size-3.5" />
        </button>
      }
    />
  )
}

export function Converter() {
  const [items, setItems] = React.useState<Item[]>([])
  const [target, setTarget] = React.useState<RasterFormat>("webp")
  const [quality, setQuality] = React.useState(0.88)
  const [background, setBackground] = React.useState("#ffffff")
  const [results, setResults] = React.useState<Result[]>([])
  const [running, setRunning] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  const [failures, setFailures] = React.useState<string[]>([])

  const addFiles = React.useCallback(async (files: File[]) => {
    const accepted: Item[] = []
    for (const file of files) {
      const type = detect(file)
      if (!type) {
        toast.error(`${file.name} is not an image.`)
        continue
      }
      if (file.size > MAX_BYTES) {
        toast.error(`${file.name} is larger than 40 MB.`)
        continue
      }
      try {
        const img = await decodeImage(file)
        accepted.push({
          id: uid("img"),
          file,
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height,
          type,
        })
      } catch {
        toast.error(`${file.name} could not be decoded.`)
      }
    }
    setItems((prev) => [...prev, ...accepted].slice(0, 40))
    setResults([])
  }, [])

  React.useEffect(() => {
    setResults([])
  }, [target, quality, background])

  const totalIn = items.reduce((sum, item) => sum + item.file.size, 0)
  const totalOut = results.reduce((sum, item) => sum + item.blob.size, 0)

  async function run() {
    if (!items.length) return
    setRunning(true)
    setProgress(0)
    setFailures([])
    const next: Result[] = []
    const failed: string[] = []
    for (let index = 0; index < items.length; index++) {
      const item = items[index]
      try {
        const img = await decodeImage(item.file)
        const canvas = drawToCanvas(img, {
          background: NEEDS_BG.includes(target) ? background : undefined,
        })
        const blob = await encodeCanvas(canvas, target, quality)
        next.push({
          id: item.id,
          name: `${stripExtension(item.file.name)}.${extForFormat(target)}`,
          blob,
          width: canvas.width,
          height: canvas.height,
          sourceBytes: item.file.size,
          target,
        })
      } catch {
        failed.push(item.file.name)
      }
      setProgress((index + 1) / items.length)
    }
    setResults(next)
    setFailures(failed)
    setRunning(false)
    if (next.length) toast.success(`Converted ${next.length} file${next.length > 1 ? "s" : ""} to ${target.toUpperCase()}.`)
  }

  function downloadAll() {
    if (results.length === 1) {
      downloadBlob(results[0].blob, results[0].name)
      return
    }
    void makeZip(results.map((result) => ({ name: result.name, blob: result.blob }))).then((zip) => {
      downloadBlob(zip, `localpixel-${target}.zip`)
    })
  }

  const aside = (
    <>
      <Panel title="Target format" step="settings">
        <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Target format">
          {FORMATS.map((format) => {
            const active = target === format.value
            return (
              <button
                key={format.value}
                type="button"
                aria-pressed={active}
                onClick={() => setTarget(format.value)}
                className={`relative flex flex-col items-start gap-0.5 rounded-[10px] border px-2.5 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring ${
                  active
                    ? "border-primary bg-accent/60"
                    : "border-border bg-card hover:border-muted-foreground/40"
                }`}
              >
                <span className={`font-mono text-[12px] font-semibold ${active ? "text-primary" : ""}`}>
                  .{extForFormat(format.value)}
                </span>
                <span className="text-[9.5px] uppercase tracking-[0.05em] text-muted-foreground">
                  {format.note}
                </span>
              </button>
            )
          })}
        </div>

        <div className="mt-6 space-y-6">
          <Slider
            label={target === "png" || target === "bmp" || target === "gif" || target === "svg" ? "Quality (limited)" : "Quality"}
            valueLabel={`${Math.round(quality * 100)}%`}
            min={10}
            max={100}
            step={1}
            value={Math.round(quality * 100)}
            onChange={(event) => setQuality(Number(event.target.value) / 100)}
            disabled={running}
          />

          {NEEDS_BG.includes(target) ? (
            <div>
              <p className="mb-2 text-[13px] font-medium">Matte colour</p>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label="Matte colour"
                  value={background}
                  onChange={(event) => setBackground(event.target.value)}
                  className="h-9 w-12 cursor-pointer rounded-[8px] border border-input bg-card p-0.5"
                />
                {["#ffffff", "#f2efe6", "#14150f", "#2547f4"].map((colour) => (
                  <button
                    key={colour}
                    type="button"
                    aria-label={`Use ${colour}`}
                    onClick={() => setBackground(colour)}
                    className="size-7 rounded-full border border-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    style={{ background: colour }}
                  />
                ))}
                <span className="ml-auto font-mono text-[10.5px] text-muted-foreground">{background}</span>
              </div>
              <p className="mt-2 text-[11.5px] leading-relaxed text-muted-foreground">
                {target.toUpperCase()} cannot store an alpha channel, so transparent pixels are filled.
              </p>
            </div>
          ) : null}

          <Notice>
            {target === "svg"
              ? "SVG output wraps the raster image losslessly. It is not a vector trace."
              : target === "gif"
                ? "GIF is quantised to 256 colours. Use WebP or PNG for photographic detail."
                : "Colour profiles are not preserved; pixels are converted to sRGB."}
          </Notice>

          <RunButton className="w-full" running={running} onClick={run} disabled={!items.length}>
            Convert {items.length > 1 ? `${items.length} files` : "file"}
          </RunButton>
        </div>
      </Panel>

      <Panel title="Session" step="readout" tone="quiet">
        <div className="grid grid-cols-2 gap-4">
          <Stat label="Files" value={items.length} />
          <Stat label="Input" value={formatBytes(totalIn)} />
          <Stat label="Output" value={results.length ? formatBytes(totalOut) : "—"} />
          <Stat label="Target" value={target.toUpperCase()} tone="primary" />
        </div>
      </Panel>
    </>
  )

  return (
    <ToolPage tool={TOOL} aside={aside}>
      <Panel
        title="Source images"
        step="01"
        actions={
          items.length ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setItems([])
                setResults([])
                setFailures([])
              }}
            >
              <RotateCcw />
              Clear
            </Button>
          ) : (
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
              {items.length}/40
            </span>
          )
        }
      >
        <Dropzone
          onFiles={addFiles}
          accept="image/*,.svg,.bmp"
          title={items.length ? "Add more images" : "Drop images to convert"}
          hint="PNG, JPEG, WebP, GIF, BMP, SVG or AVIF · 40 MB each"
          compact={items.length > 0}
          disabled={running}
        />
        {running ? (
          <div className="mt-4">
            <div className="mb-1.5 flex justify-between font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
              <span>converting</span>
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
        <AnimatePresence initial={false}>
          {items.length ? (
            <motion.div layout className="mt-4 space-y-2">
              {items.map((item) => (
                <FileRow
                  key={item.id}
                  name={item.file.name}
                  preview={item.file}
                  meta={`${formatBytes(item.file.size)} · ${item.width} × ${item.height} · ${labelFor(item.type)}`}
                  badge={<Badge tone="neutral">{labelFor(item.type)}</Badge>}
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
        title="Converted files"
        step="02"
        actions={
          results.length ? (
            <DownloadButton size="sm" onDownload={downloadAll}>
              {results.length > 1 ? "Download ZIP" : "Download"}
            </DownloadButton>
          ) : null
        }
      >
        {failures.length ? (
          <div className="mb-4">
            <Notice tone="warn">
              Could not convert: {failures.join(", ")}. SVG files with external references cannot be
              drawn to a local canvas.
            </Notice>
          </div>
        ) : null}
        {results.length ? (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <SuccessMark label={`${results.length} converted`} />
              <span className="font-mono text-[11px] text-muted-foreground">
                {formatBytes(totalIn)} → {formatBytes(totalOut)}
              </span>
            </div>
            <div className="space-y-2">
              {results.map((result) => (
                <ResultRow
                  key={result.id}
                  result={result}
                  onDownload={() => downloadBlob(result.blob, result.name)}
                />
              ))}
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
              <Button variant="outline" size="sm" onClick={downloadAll}>
                <Archive />
                Download all
              </Button>
              <span className="flex items-center gap-1.5 font-mono text-[10.5px] text-muted-foreground">
                <Info className="size-3" /> conversions run at full resolution
              </span>
            </div>
          </>
        ) : (
          <EmptyHint>
            Pick a target format, then convert. Every output keeps the original pixel dimensions.
          </EmptyHint>
        )}
      </Panel>
    </ToolPage>
  )
}

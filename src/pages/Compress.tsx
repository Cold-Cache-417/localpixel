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
import { Segmented } from "@/components/ui/field"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { decodeImage, drawToCanvas, encodeCanvas, extForFormat, type RasterFormat } from "@/lib/image"
import { downloadBlob, formatBytes, percentSaving, stripExtension, uid } from "@/lib/utils"
import { makeZip } from "@/lib/zip"

const TOOL = toolBySlug("compress-image")!
const MAX_BYTES = 40 * 1024 * 1024

interface Item {
  id: string
  file: File
  width: number
  height: number
  format: RasterFormat
}

interface Result {
  id: string
  name: string
  blob: Blob
  width: number
  height: number
  sourceBytes: number
}

function detectFormat(file: File): RasterFormat | null {
  if (file.type === "image/jpeg") return "jpeg"
  if (file.type === "image/png") return "png"
  if (file.type === "image/webp") return "webp"
  if (file.type === "image/avif") return "webp"
  const ext = file.name.split(".").pop()?.toLowerCase()
  if (ext === "jpg" || ext === "jpeg") return "jpeg"
  if (ext === "png") return "png"
  if (ext === "webp") return "webp"
  if (ext === "avif") return "webp"
  return null
}

function validate(file: File): string | null {
  if (!detectFormat(file)) return `${file.name} is not a supported image. Use JPEG, PNG, WebP or AVIF.`
  if (file.size > MAX_BYTES) return `${file.name} is larger than 40 MB.`
  return null
}

function ResultRow({ result, onDownload }: { result: Result; onDownload: () => void }) {
  const saving = percentSaving(result.sourceBytes, result.blob.size)
  return (
    <FileRow
      name={result.name}
      preview={result.blob}
      meta={`${formatBytes(result.sourceBytes)} → ${formatBytes(result.blob.size)} · ${result.width} × ${result.height}`}
      badge={
        saving > 0 ? (
          <Badge tone="signal">−{saving}%</Badge>
        ) : (
          <Badge tone="neutral">+{Math.abs(saving)}%</Badge>
        )
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

export function Compress() {
  const [items, setItems] = React.useState<Item[]>([])
  const [quality, setQuality] = React.useState(0.82)
  const [maxWidth, setMaxWidth] = React.useState("0")
  const [maxHeight, setMaxHeight] = React.useState("0")
  const [outputFormat, setOutputFormat] = React.useState<"original" | RasterFormat>("original")
  const [results, setResults] = React.useState<Result[]>([])
  const [running, setRunning] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  const [failures, setFailures] = React.useState<string[]>([])
  const [loadingFiles, setLoadingFiles] = React.useState(false)

  const addFiles = React.useCallback(async (files: File[]) => {
    setLoadingFiles(true)
    const accepted: Item[] = []
    for (const file of files) {
      if (validate(file)) continue
      const format = detectFormat(file)
      if (!format) continue
      try {
        const img = await decodeImage(file)
        accepted.push({
          id: uid("img"),
          file,
          width: img.naturalWidth,
          height: img.naturalHeight,
          format,
        })
      } catch {
        toast.error(`${file.name} could not be decoded.`)
      }
    }
    setItems((prev) => [...prev, ...accepted].slice(0, 40))
    setResults([])
    if (accepted.length) toast.success(`${accepted.length} file${accepted.length > 1 ? "s" : ""} ready.`)
    setLoadingFiles(false)
  }, [])

  React.useEffect(() => {
    setResults([])
  }, [quality, maxWidth, maxHeight, outputFormat])

  const totalIn = items.reduce((sum, item) => sum + item.file.size, 0)
  const totalOut = results.reduce((sum, item) => sum + item.blob.size, 0)
  const totalSaving = percentSaving(totalIn, totalOut)

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
          maxWidth: Number(maxWidth),
          maxHeight: Number(maxHeight),
        })
        const target = outputFormat === "original" ? item.format : outputFormat
        const blob = await encodeCanvas(canvas, target, quality)
        next.push({
          id: item.id,
          name: `${stripExtension(item.file.name)}-compressed.${extForFormat(target)}`,
          blob,
          width: canvas.width,
          height: canvas.height,
          sourceBytes: item.file.size,
        })
      } catch {
        failed.push(item.file.name)
      }
      setProgress((index + 1) / items.length)
    }
    setResults(next)
    setFailures(failed)
    setRunning(false)
    if (next.length) toast.success(`Compressed ${next.length} file${next.length > 1 ? "s" : ""}.`)
  }

  function downloadAll() {
    if (!results.length) return
    if (results.length === 1) {
      downloadBlob(results[0].blob, results[0].name)
      return
    }
    void makeZip(results.map((result) => ({ name: result.name, blob: result.blob }))).then((zip) => {
      downloadBlob(zip, "localpixel-compressed.zip")
      toast.success("ZIP archive ready.")
    })
  }

  const aside = (
    <>
      <Panel title="Compression" step="settings">
        <div className="space-y-6">
          <Slider
            label="Quality"
            valueLabel={`${Math.round(quality * 100)}%`}
            min={30}
            max={95}
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
            <div className="mt-3">
              <p className="mb-2 text-[13px] font-medium">Maximum height</p>
              <Segmented
                label="Maximum height"
                value={maxHeight}
                onChange={setMaxHeight}
                options={[
                  { value: "0", label: "Original" },
                  { value: "1920", label: "1920" },
                  { value: "1280", label: "1280" },
                  { value: "800", label: "800" },
                ]}
              />
            </div>
            <p className="mt-2 text-[11.5px] leading-relaxed text-muted-foreground">
              Images are scaled down proportionally; smaller images are never enlarged.
            </p>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium">Output format</p>
            <Segmented
              label="Output format"
              value={outputFormat}
              onChange={(value) => setOutputFormat(value as "original" | RasterFormat)}
              options={[
                { value: "original", label: "Original" },
                { value: "webp", label: "WebP" },
                { value: "jpeg", label: "JPG" },
                { value: "png", label: "PNG" },
              ]}
            />
            <p className="mt-2 text-[11.5px] leading-relaxed text-muted-foreground">
              PNG stays lossless; JPG and WebP re-encode at the quality set above.
            </p>
          </div>

          <div className="rounded-[10px] border border-line bg-secondary/30 px-3 py-2.5">
            <p className="flex items-start gap-2 text-[11.5px] leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              Re-encoding drops EXIF, GPS and embedded colour profiles. Quality is ignored for PNG,
              which is lossless — use the width limit to shrink PNGs.
            </p>
          </div>

          <RunButton className="w-full" running={running} onClick={run} disabled={!items.length}>
            {results.length ? "Compress again" : "Compress files"}
          </RunButton>

          {running ? (
            <div>
              <div className="mb-1.5 flex justify-between font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                <span>working</span>
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
        </div>
      </Panel>

      <Panel title="Session" step="readout" tone="quiet">
        <div className="grid grid-cols-2 gap-4">
          <Stat label="Files" value={items.length} />
          <Stat label="Input" value={formatBytes(totalIn)} />
          <Stat label="Output" value={results.length ? formatBytes(totalOut) : "—"} />
          <Stat
            label="Saved"
            value={results.length ? `${totalSaving > 0 ? "−" : "+"}${Math.abs(totalSaving)}%` : "—"}
            tone={results.length && totalSaving > 0 ? "signal" : "default"}
          />
        </div>
      </Panel>
    </>
  )

  return (
    <ToolPage tool={TOOL} aside={aside}>
      <Panel
        title="Source files"
        step="01"
        actions={
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
              {items.length}/40
            </span>
            {items.length ? (
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
            ) : null}
          </div>
        }
      >
        <Dropzone
          onFiles={addFiles}
          accept="image/jpeg,image/png,image/webp,image/avif"
          title={items.length ? "Add more images" : "Drop images to compress"}
          hint="JPEG, PNG, WebP or AVIF · up to 40 files · 40 MB each"
          compact={items.length > 0}
          disabled={running || loadingFiles}
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
                  meta={`${formatBytes(item.file.size)} · ${item.width} × ${item.height} · ${item.format.toUpperCase()}`}
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
        title="Output"
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
              {failures.length} file{failures.length > 1 ? "s" : ""} could not be processed:{" "}
              {failures.join(", ")}
            </Notice>
          </div>
        ) : null}

        {results.length ? (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <SuccessMark label={`${results.length} file${results.length > 1 ? "s" : ""} compressed`} />
              <span className="font-mono text-[11px] text-muted-foreground">
                {formatBytes(totalIn)} → {formatBytes(totalOut)} · {totalSaving > 0 ? "saved" : "grew"}{" "}
                {Math.abs(totalSaving)}%
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
                {results.length > 1 ? "Download all as ZIP" : "Download file"}
              </Button>
              <span className="font-mono text-[10.5px] text-muted-foreground">
                object URLs released on leave
              </span>
            </div>
          </>
        ) : (
          <EmptyHint>
            {items.length
              ? "Set a quality, then press “Compress files”. Results appear here with real before-and-after sizes."
              : "Add images above to begin. Nothing is processed until you press the button."}
          </EmptyHint>
        )}
      </Panel>
    </ToolPage>
  )
}

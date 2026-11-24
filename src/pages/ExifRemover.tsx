import * as React from "react"
import { AnimatePresence, motion } from "motion/react"
import { Archive, Check, Download, MapPin, ShieldCheck, ShieldAlert, Trash2 } from "lucide-react"
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
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { readExif, verifyClean, type ExifResult } from "@/lib/exif"
import { decodeImage, drawToCanvas, encodeCanvas, type RasterFormat } from "@/lib/image"
import { downloadBlob, formatBytes, percentSaving, stripExtension, uid } from "@/lib/utils"
import { makeZip } from "@/lib/zip"

const TOOL = toolBySlug("exif-remover")!
const MAX_BYTES = 40 * 1024 * 1024

interface Item {
  id: string
  file: File
  exif: ExifResult
  format: RasterFormat
}

interface CleanResult {
  id: string
  name: string
  blob: Blob
  before: number
  tagsAfter: number
}

function formatOf(file: File): RasterFormat | null {
  if (file.type === "image/jpeg") return "jpeg"
  if (file.type === "image/png") return "png"
  if (file.type === "image/webp") return "webp"
  const ext = file.name.split(".").pop()?.toLowerCase()
  if (ext === "jpg" || ext === "jpeg") return "jpeg"
  if (ext === "png") return "png"
  if (ext === "webp") return "webp"
  return null
}

function validate(file: File) {
  if (!formatOf(file)) return `${file.name} is not a JPEG, PNG or WebP image.`
  if (file.size > MAX_BYTES) return `${file.name} is larger than 40 MB.`
  return null
}

export function ExifRemover() {
  const [items, setItems] = React.useState<Item[]>([])
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [running, setRunning] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  const [results, setResults] = React.useState<CleanResult[]>([])
  const [reading, setReading] = React.useState(false)

  const addFiles = React.useCallback(async (files: File[]) => {
    setReading(true)
    const accepted: Item[] = []
    for (const file of files) {
      if (validate(file)) {
        toast.error(validate(file)!)
        continue
      }
      const format = formatOf(file)
      if (!format) continue
      try {
        const exif = await readExif(file)
        accepted.push({ id: uid("exif"), file, exif, format })
      } catch {
        toast.error(`${file.name} could not be read.`)
      }
    }
    setItems((prev) => [...prev, ...accepted].slice(0, 30))
    setResults([])
    if (accepted.length) setSelectedId((prev) => prev ?? accepted[0].id)
    setReading(false)
  }, [])

  const selected = items.find((item) => item.id === selectedId) ?? items[0] ?? null
  const totalBefore = results.reduce((sum, result) => sum + result.before, 0)
  const totalAfter = results.reduce((sum, result) => sum + result.blob.size, 0)
  const sensitiveCount = selected?.exif.tags.filter((tag) => tag.sensitive).length ?? 0

  async function clean() {
    if (!items.length) return
    setRunning(true)
    setProgress(0)
    const next: CleanResult[] = []
    for (let index = 0; index < items.length; index++) {
      const item = items[index]
      try {
        const img = await decodeImage(item.file)
        const canvas = drawToCanvas(img)
        const blob = await encodeCanvas(canvas, item.format, 0.95)
        const tagsAfter = await verifyClean(blob)
        next.push({
          id: item.id,
          name: `${stripExtension(item.file.name)}-clean.${item.format === "jpeg" ? "jpg" : item.format}`,
          blob,
          before: item.file.size,
          tagsAfter,
        })
      } catch {
        toast.error(`${item.file.name} could not be cleaned.`)
      }
      setProgress((index + 1) / items.length)
    }
    setResults(next)
    setRunning(false)
    if (next.length) {
      const dirty = next.filter((result) => result.tagsAfter > 0).length
      if (dirty) toast.warning(`${dirty} export${dirty > 1 ? "s" : ""} still contain metadata tags.`)
      else toast.success("Metadata removed and verified.")
    }
  }

  function downloadAll() {
    if (results.length === 1) {
      downloadBlob(results[0].blob, results[0].name)
      return
    }
    void makeZip(results.map((result) => ({ name: result.name, blob: result.blob }))).then((zip) => {
      downloadBlob(zip, "localpixel-cleaned.zip")
    })
  }

  const aside = (
    <>
      <Panel title="What gets removed" step="reference" tone="quiet">
        <ul className="space-y-2.5">
          {[
            "GPS latitude, longitude and altitude",
            "Camera make, model, lens and serial number",
            "Capture and edit timestamps",
            "Software, artist and copyright fields",
            "XMP, IPTC and embedded thumbnail",
            "Orientation is baked into the pixels",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 text-[12px] leading-relaxed text-muted-foreground">
              <Trash2 className="mt-0.5 size-3 shrink-0 text-destructive/70" />
              {item}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Verification" step="readout">
        <div className="space-y-4">
          <div className="flex items-start gap-2.5 rounded-[10px] border border-signal/25 bg-signal/5 px-3 py-2.5">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-signal" />
            <p className="text-[11.5px] leading-relaxed text-muted-foreground">
              Every export is re-read with the same EXIF parser before it is offered. The tag count you
              see is measured from the actual output bytes.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Stat label="Files" value={items.length} />
            <Stat label="Before" value={formatBytes(items.reduce((sum, item) => sum + item.file.size, 0))} />
            <Stat label="After" value={results.length ? formatBytes(totalAfter) : "—"} />
            <Stat
              label="Tags out"
              value={results.length ? results.reduce((sum, result) => sum + result.tagsAfter, 0) : "—"}
              tone={results.length ? "signal" : "default"}
            />
          </div>
        </div>
      </Panel>
    </>
  )

  return (
    <ToolPage tool={TOOL} aside={aside}>
      <Panel
        title="Images under inspection"
        step="01"
        actions={
          items.length ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setItems([])
                setResults([])
                setSelectedId(null)
              }}
            >
              <Trash2 />
              Clear
            </Button>
          ) : null
        }
      >
        <Dropzone
          onFiles={addFiles}
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          title={items.length ? "Add more images" : "Drop a photo to inspect"}
          hint="JPEG, PNG or WebP · read locally with exifr"
          compact={items.length > 0}
          disabled={reading || running}
          validate={validate}
        />

        {reading ? (
          <p className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted-foreground">
            reading headers…
          </p>
        ) : null}

        <AnimatePresence initial={false}>
          {items.length ? (
            <motion.div layout className="mt-4 flex flex-wrap gap-2">
              {items.map((item) => {
                const active = item.id === (selected?.id ?? "")
                return (
                  <motion.button
                    key={item.id}
                    layout
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={`flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-left text-[12px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                      active
                        ? "border-primary bg-accent/60 text-foreground"
                        : "border-border bg-card text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className="max-w-[180px] truncate">{item.file.name}</span>
                    {item.exif.tags.length ? (
                      <span className="rounded-full bg-destructive/10 px-1.5 py-0.5 font-mono text-[9.5px] text-destructive">
                        {item.exif.tags.length}
                      </span>
                    ) : (
                      <Check className="size-3 text-signal" />
                    )}
                  </motion.button>
                )
              })}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </Panel>

      {selected ? (
        <Panel
          title="Metadata found"
          step="02"
          actions={
            <Badge tone={selected.exif.tags.length ? "destructive" : "signal"}>
              {selected.exif.tags.length
                ? `${selected.exif.tags.length} tags · ${sensitiveCount} sensitive`
                : "no tags found"}
            </Badge>
          }
        >
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="min-w-0">
              <p className="truncate text-[13.5px] font-medium">{selected.file.name}</p>
              <p className="font-mono text-[10.5px] text-muted-foreground">
                {formatBytes(selected.file.size)} · {formatBytes(selected.file.size, 0)} on disk
              </p>
            </div>
          </div>

          {selected.exif.gps ? (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-destructive/25 bg-destructive/5 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-full bg-destructive/10 text-destructive">
                  <MapPin className="size-4" />
                </span>
                <div>
                  <p className="text-[12.5px] font-medium text-destructive">Exact location embedded</p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {selected.exif.gps.latitude.toFixed(6)}, {selected.exif.gps.longitude.toFixed(6)}
                  </p>
                </div>
              </div>
              <ShieldAlert className="size-5 text-destructive/60" />
            </div>
          ) : null}

          {selected.exif.tags.length ? (
            <div className="max-h-[320px] overflow-y-auto rounded-[12px] border border-line">
              <table className="w-full border-collapse text-left">
                <thead className="sticky top-0 bg-secondary/80 backdrop-blur">
                  <tr>
                    <th className="px-3 py-2 font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground">
                      Field
                    </th>
                    <th className="px-3 py-2 font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground">
                      Value
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {selected.exif.tags.map((tag) => (
                    <tr key={tag.key} className="border-t border-line/70">
                      <td className="w-[38%] px-3 py-2 align-top">
                        <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                          {tag.sensitive ? (
                            <span className="size-1.5 shrink-0 rounded-full bg-destructive" />
                          ) : null}
                          {tag.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <span className="break-words font-mono text-[11.5px]">{tag.value}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Notice tone="signal">
              No readable EXIF, XMP or IPTC tags were found in this file. Cleaning is still safe — the
              pixels are re-encoded from scratch.
            </Notice>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <RunButton running={running} onClick={clean}>
              <ShieldCheck />
              Remove metadata{items.length > 1 ? ` from ${items.length} files` : ""}
            </RunButton>
            {running ? (
              <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted-foreground">
                cleaning {Math.round(progress * 100)}%
              </span>
            ) : null}
          </div>
        </Panel>
      ) : (
        <Panel title="Metadata found" step="02">
          <EmptyHint>Choose a file above to see exactly what it carries before you clean it.</EmptyHint>
        </Panel>
      )}

      <Panel
        title="Clean exports"
        step="03"
        actions={
          results.length ? (
            <DownloadButton size="sm" onDownload={downloadAll}>
              {results.length > 1 ? "Download ZIP" : "Download"}
            </DownloadButton>
          ) : null
        }
      >
        {results.length ? (
          <div className="space-y-2">
            {results.map((result) => (
              <FileRow
                key={result.id}
                name={result.name}
                preview={result.blob}
                meta={`${formatBytes(result.before)} → ${formatBytes(result.blob.size)} · ${percentSaving(result.before, result.blob.size)}% smaller`}
                badge={
                  result.tagsAfter === 0 ? (
                    <Badge tone="signal">
                      <ShieldCheck className="size-2.5" /> 0 tags verified
                    </Badge>
                  ) : (
                    <Badge tone="destructive">{result.tagsAfter} tags</Badge>
                  )
                }
                trailing={
                  <button
                    type="button"
                    onClick={() => downloadBlob(result.blob, result.name)}
                    aria-label={`Download ${result.name}`}
                    className="grid size-8 place-items-center rounded-[8px] border border-border text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <Download className="size-3.5" />
                  </button>
                }
              />
            ))}
            <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
              <Button variant="outline" size="sm" onClick={downloadAll}>
                <Archive />
                Download all
              </Button>
              <span className="font-mono text-[10.5px] text-muted-foreground">
                {formatBytes(totalBefore)} → {formatBytes(totalAfter)}
              </span>
            </div>
          </div>
        ) : (
          <EmptyHint>
            Clean copies are re-encoded from the decoded pixels, so no EXIF, XMP or thumbnail block can
            survive.
          </EmptyHint>
        )}
      </Panel>
    </ToolPage>
  )
}

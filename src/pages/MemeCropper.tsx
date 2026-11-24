import * as React from "react"
import { AnimatePresence, motion } from "motion/react"
import { Crop, Download, ImageUp, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { toolBySlug } from "@/tools"
import {
  EmptyHint,
  Notice,
  Panel,
  Stat,
  ToolPage,
} from "@/components/ToolUI"
import { Dropzone } from "@/components/Dropzone"
import { Segmented, Switch, TextInput } from "@/components/ui/field"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { decodeImage, encodeCanvas } from "@/lib/image"
import { useObjectUrl } from "@/hooks/useObjectUrl"
import { clamp, downloadBlob, formatBytes, stripExtension } from "@/lib/utils"

const TOOL = toolBySlug("meme-cropper")!

type Mode = "move" | "se"

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

interface Drag {
  mode: Mode
  startX: number
  startY: number
  rect: Rect
  bounds: DOMRect
}

const ASPECTS = [
  { value: "free", label: "Free" },
  { value: "1", label: "1:1" },
  { value: "0.8", label: "4:5" },
  { value: "1.7778", label: "16:9" },
  { value: "0.5625", label: "9:16" },
  { value: "1.5", label: "3:2" },
]

function fitAspect(aspect: number, imageW: number, imageH: number): Rect {
  if (!aspect) return { x: 0.06, y: 0.06, w: 0.88, h: 0.88 }
  const norm = aspect / (imageW / imageH)
  let w = 0.88
  let h = w / norm
  if (h > 0.88) {
    h = 0.88
    w = h * norm
  }
  return { x: (1 - w) / 2, y: (1 - h) / 2, w, h }
}

function wrapCaption(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ""
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (ctx.measureText(candidate).width <= maxW || !current) {
      current = candidate
    } else {
      lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  return lines.length ? lines : [""]
}

function drawCaptionBlock(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number,
  w: number,
  fontSize: number,
  lineH: number,
  strokeW: number,
  fill: string,
  outline: string,
) {
  ctx.font = `700 ${fontSize}px Inter, ui-sans-serif, system-ui, sans-serif`
  ctx.lineWidth = strokeW
  ctx.strokeStyle = outline
  ctx.fillStyle = fill
  ctx.textAlign = "center"
  ctx.textBaseline = "alphabetic"
  let cursor = y
  for (const line of lines) {
    const tw = ctx.measureText(line).width
    const tx = x + (w - tw) / 2
    ctx.strokeText(line, tx, cursor)
    ctx.fillText(line, tx, cursor)
    cursor += lineH
  }
}

export function MemeCropper() {
  const [file, setFile] = React.useState<File | null>(null)
  const [image, setImage] = React.useState<HTMLImageElement | null>(null)
  const [rect, setRect] = React.useState<Rect>({ x: 0.06, y: 0.06, w: 0.88, h: 0.88 })
  const [aspect, setAspect] = React.useState("free")
  const [format, setFormat] = React.useState<"png" | "jpeg">("png")
  const [drag, setDrag] = React.useState<Drag | null>(null)
  const [result, setResult] = React.useState<{ blob: Blob; name: string; width: number; height: number } | null>(null)
  const [running, setRunning] = React.useState(false)
  const [topText, setTopText] = React.useState("")
  const [bottomText, setBottomText] = React.useState("")
  const [allCaps, setAllCaps] = React.useState(true)
  const [textSize, setTextSize] = React.useState(8)
  const [stroke, setStroke] = React.useState(14)
  const [fill, setFill] = React.useState("#ffffff")
  const [outline, setOutline] = React.useState("#000000")
  const stageRef = React.useRef<HTMLDivElement>(null)
  const imageUrl = useObjectUrl(file)

  const natW = image?.naturalWidth ?? 1
  const natH = image?.naturalHeight ?? 1
  const aspectValue = aspect === "free" ? 0 : Number(aspect)

  const loadFile = React.useCallback(async (files: File[]) => {
    const next = files[0]
    if (!next) return
    if (!next.type.startsWith("image/")) {
      toast.error("Choose an image file.")
      return
    }
    if (next.size > 40 * 1024 * 1024) {
      toast.error("That image is larger than 40 MB.")
      return
    }
    try {
      const img = await decodeImage(next)
      setImage(img)
      setFile(next)
      setRect(fitAspect(aspectValue, img.naturalWidth, img.naturalHeight))
      setResult(null)
    } catch {
      toast.error("That image could not be decoded.")
    }
  }, [aspectValue])

  React.useEffect(() => {
    if (!image) return
    setRect(fitAspect(aspectValue, image.naturalWidth, image.naturalHeight))
    setResult(null)
  }, [aspectValue, image])

  React.useEffect(() => {
    if (!drag) return
    const onMove = (event: PointerEvent) => {
      const dx = (event.clientX - drag.startX) / drag.bounds.width
      const dy = (event.clientY - drag.startY) / drag.bounds.height
      const min = 0.04
      const start = drag.rect
      let next = { ...start }

      if (drag.mode === "move") {
        next.x = clamp(start.x + dx, 0, 1 - start.w)
        next.y = clamp(start.y + dy, 0, 1 - start.h)
      } else {
        // Original interaction contract: dragging the bottom-right handle resizes from
        // the top-left origin; a locked aspect ratio keeps the frame shape.
        const norm = aspectValue / (natW / natH)
        const maxW = 1 - start.x
        const maxH = 1 - start.y
        const w = clamp(start.w + dx, min, maxW)
        const h = aspectValue ? w / norm : clamp(start.h + dy, min, maxH)
        next = { x: start.x, y: start.y, w, h }
        if (aspectValue && h > maxH) {
          next = { x: start.x, y: start.y, w: maxH * norm, h: maxH }
        }
      }
      setRect(next)
      setResult(null)
    }
    const onUp = () => setDrag(null)
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
    }
  }, [aspectValue, drag, natH, natW])

  function beginDrag(event: React.PointerEvent, mode: Mode) {
    if (!stageRef.current) return
    event.preventDefault()
    event.stopPropagation()
    setDrag({
      mode,
      startX: event.clientX,
      startY: event.clientY,
      rect,
      bounds: stageRef.current.getBoundingClientRect(),
    })
  }

  async function exportCrop() {
    if (!image) return
    setRunning(true)
    try {
      const sx = Math.round(rect.x * natW)
      const sy = Math.round(rect.y * natH)
      const sw = Math.max(1, Math.round(rect.w * natW))
      const sh = Math.max(1, Math.round(rect.h * natH))
      const canvas = document.createElement("canvas")
      canvas.width = sw
      canvas.height = sh
      const ctx = canvas.getContext("2d")!
      if (format === "jpeg") {
        ctx.fillStyle = "#ffffff"
        ctx.fillRect(0, 0, sw, sh)
      }
      ctx.imageSmoothingQuality = "high"
      ctx.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh)
      if (topText.trim() || bottomText.trim()) {
        const fontSize = (textSize / 100) * Math.max(8, sw)
        const strokeW = Math.max(1, (stroke / 100) * fontSize)
        const lineH = fontSize * 1.2
        const maxW = sw * 0.9
        const top = topText.trim()
        const bottom = bottomText.trim()
        const topLines = wrapCaption(ctx, top ? (allCaps ? top.toUpperCase() : top) : "", maxW)
        const bottomLines = wrapCaption(ctx, bottom ? (allCaps ? bottom.toUpperCase() : bottom) : "", maxW)
        if (top.trim()) {
          drawCaptionBlock(ctx, topLines, 0, strokeW + fontSize * 0.85, sw, fontSize, lineH, strokeW, fill, outline)
        }
        if (bottom.trim()) {
          const bottomBlockH = bottomLines.length * lineH
          drawCaptionBlock(ctx, bottomLines, 0, sh - strokeW - fontSize * 0.85 - bottomBlockH, sw, fontSize, lineH, strokeW, fill, outline)
        }
      }
      const blob = await encodeCanvas(canvas, format, 0.94)
      setResult({
        blob,
        name: `${stripExtension(file?.name ?? "crop")}-crop.${format === "jpeg" ? "jpg" : "png"}`,
        width: sw,
        height: sh,
      })
      toast.success("Crop exported.")
    } catch {
      toast.error("The crop could not be exported.")
    } finally {
      setRunning(false)
    }
  }

  const px = {
    x: Math.round(rect.x * natW),
    y: Math.round(rect.y * natH),
    w: Math.round(rect.w * natW),
    h: Math.round(rect.h * natH),
  }

  function setPx(axis: "x" | "y" | "w" | "h", value: number) {
    if (!image) return
    const nx = value / natW
    const ny = value / natH
    const next = { ...rect }
    if (axis === "x") next.x = clamp(nx, 0, 1 - rect.w)
    if (axis === "y") next.y = clamp(ny, 0, 1 - rect.h)
    if (axis === "w") next.w = clamp(nx, 0.02, 1 - rect.x)
    if (axis === "h") next.h = clamp(ny, 0.02, 1 - rect.y)
    setRect(next)
    setResult(null)
  }

  return (
    <ToolPage
      tool={TOOL}
      aside={
        <>
          <Panel title="Frame" step="settings">
            <div className="space-y-5">
              <div>
                <p className="mb-2 text-[13px] font-medium">Aspect ratio</p>
                <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Aspect ratio">
                  {ASPECTS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={aspect === option.value}
                      onClick={() => setAspect(option.value)}
                      className={`h-8 rounded-[8px] border font-mono text-[11px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring ${
                        aspect === option.value
                          ? "border-primary bg-accent/60 text-primary"
                          : "border-border bg-card text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-[13px] font-medium">Output</p>
                <Segmented
                  label="Output format"
                  value={format}
                  onChange={setFormat}
                  options={[
                    { value: "png", label: "PNG" },
                    { value: "jpeg", label: "JPG" },
                  ]}
                />
              </div>

              <div>
                <p className="mb-2 text-[13px] font-medium">Captions</p>
                <div className="space-y-4">
                  <label className="block">
                    <span className="mb-1 block text-[12px] font-medium text-muted-foreground">Top caption</span>
                    <TextInput
                      value={topText}
                      onChange={(event) => setTopText(event.target.value)}
                      placeholder="Optional top text…"
                      maxLength={80}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[12px] font-medium text-muted-foreground">Bottom caption</span>
                    <TextInput
                      value={bottomText}
                      onChange={(event) => setBottomText(event.target.value)}
                      placeholder="Optional bottom text…"
                      maxLength={80}
                    />
                  </label>
                  <Slider
                    label="Text size"
                    valueLabel={`${textSize}%`}
                    min={4}
                    max={16}
                    value={textSize}
                    onChange={(event) => setTextSize(Number(event.target.value))}
                  />
                  <Slider
                    label="Outline stroke"
                    valueLabel={`${stroke}%`}
                    min={4}
                    max={28}
                    value={stroke}
                    onChange={(event) => setStroke(Number(event.target.value))}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="mb-1 block text-[12px] font-medium text-muted-foreground">Caption fill</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          aria-label="Caption fill"
                          value={fill}
                          onChange={(event) => setFill(event.target.value)}
                          className="h-8 w-10 cursor-pointer rounded-[8px] border border-input bg-card p-0.5"
                        />
                        <span className="font-mono text-[10.5px] uppercase text-muted-foreground">{fill}</span>
                      </div>
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[12px] font-medium text-muted-foreground">Outline</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          aria-label="Caption outline"
                          value={outline}
                          onChange={(event) => setOutline(event.target.value)}
                          className="h-8 w-10 cursor-pointer rounded-[8px] border border-input bg-card p-0.5"
                        />
                        <span className="font-mono text-[10.5px] uppercase text-muted-foreground">{outline}</span>
                      </div>
                    </label>
                  </div>
                  <Switch
                    checked={allCaps}
                    onChange={setAllCaps}
                    label="ALL CAPS"
                    description="Render captions in uppercase for the classic meme treatment."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Stat label="Crop x" value={`${px.x} px`} />
                <Stat label="Crop y" value={`${px.y} px`} />
                <Stat label="Width" value={`${px.w} px`} />
                <Stat label="Height" value={`${px.h} px`} />
              </div>

              <Button className="w-full" onClick={exportCrop} disabled={!image || running}>
                <Crop />
                {running ? "Cropping…" : "Export crop"}
              </Button>

              <Notice>
                Drag inside the frame to move it; drag the bottom-right corner handle to resize. With a
                ratio locked, the frame keeps its shape.
              </Notice>
            </div>
          </Panel>

          {image ? (
            <Panel title="Precision" step="readout" tone="quiet">
              <div className="grid grid-cols-2 gap-2.5">
                {(["x", "y", "w", "h"] as const).map((axis) => (
                  <label key={axis} className="block">
                    <span className="mb-1 block font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground">
                      {axis === "w" ? "width" : axis === "h" ? "height" : axis}
                    </span>
                    <TextInput
                      type="number"
                      inputMode="numeric"
                      value={px[axis]}
                      min={axis === "w" || axis === "h" ? 1 : 0}
                      onChange={(event) => setPx(axis, Number(event.target.value))}
                      className="h-8 font-mono text-[11.5px]"
                    />
                  </label>
                ))}
              </div>
              <p className="mt-3 font-mono text-[10px] text-muted-foreground">
                source {natW} × {natH}
              </p>
            </Panel>
          ) : null}
        </>
      }
    >
      <Panel title="Crop stage" step="01" actions={file ? <span className="truncate font-mono text-[10px] text-muted-foreground">{file.name}</span> : null}>
        {!image ? (
          <Dropzone
            onFiles={(files) => void loadFile(files)}
            accept="image/*"
            multiple={false}
            title="Drop an image to crop"
            hint="JPEG, PNG or WebP · one image at a time"
          />
        ) : (
          <div>
            <div className="flex justify-center rounded-[14px] bg-[repeating-conic-gradient(var(--secondary)_0_25%,transparent_0_50%)] bg-[length:16px_16px] p-3">
              <div className="relative inline-block max-w-full select-none">
                <img
                  src={imageUrl ?? undefined}
                  alt={file?.name ?? "Image to crop"}
                  className="block max-h-[58vh] w-auto max-w-full rounded-[4px]"
                  draggable={false}
                />
                <div className="pointer-events-none absolute inset-0 rounded-[4px] bg-ink/45" />
                <div
                  ref={stageRef}
                  className="absolute touch-none"
                  style={{
                    left: `${rect.x * 100}%`,
                    top: `${rect.y * 100}%`,
                    width: `${rect.w * 100}%`,
                    height: `${rect.h * 100}%`,
                  }}
                >
                  <div
                    role="group"
                    aria-label="Crop frame. Use the corner handles to resize."
                    tabIndex={0}
                    onPointerDown={(event) => beginDrag(event, "move")}
                    onKeyDown={(event) => {
                      const step = event.shiftKey ? 0.05 : 0.01
                      if (event.key === "ArrowLeft") setRect((r) => ({ ...r, x: clamp(r.x - step, 0, 1 - r.w) }))
                      else if (event.key === "ArrowRight") setRect((r) => ({ ...r, x: clamp(r.x + step, 0, 1 - r.w) }))
                      else if (event.key === "ArrowUp") setRect((r) => ({ ...r, y: clamp(r.y - step, 0, 1 - r.h) }))
                      else if (event.key === "ArrowDown") setRect((r) => ({ ...r, y: clamp(r.y + step, 0, 1 - r.h) }))
                      else return
                      event.preventDefault()
                      setResult(null)
                    }}
                    className="absolute inset-0 cursor-move touch-none outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <div className="pointer-events-none absolute inset-0 border border-white shadow-[0_0_0_1px_rgb(0_0_0/0.35)]" />
                    <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
                      {Array.from({ length: 9 }).map((_, index) => (
                        <span key={index} className="border border-white/20" />
                      ))}
                    </div>
                    {(["se"] as const).map((corner) => (
                      <button
                        key={corner}
                        type="button"
                        aria-label={`Resize from ${corner} corner`}
                        onPointerDown={(event) => beginDrag(event, corner)}
                        className="absolute -bottom-2 -right-2 size-4 cursor-nwse-resize rounded-[3px] border-2 border-white bg-primary shadow-md transition-transform hover:scale-125 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => document.querySelector<HTMLInputElement>("#crop-replace")?.click()}>
                  <ImageUp />
                  Replace image
                </Button>
                <input
                  id="crop-replace"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => {
                    if (event.target.files?.[0]) void loadFile([event.target.files[0]])
                    event.target.value = ""
                  }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setRect(fitAspect(aspectValue, natW, natH))
                    setResult(null)
                  }}
                >
                  <RotateCcw />
                  Reset frame
                </Button>
              </div>
              <span className="font-mono text-[10.5px] text-muted-foreground">
                {px.w} × {px.h} px out
              </span>
            </div>
          </div>
        )}
      </Panel>

      <AnimatePresence>
        {result ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Panel
              title="Exported crop"
              step="02"
              actions={
                <Button
                  size="sm"
                  variant="signal"
                  onClick={() => downloadBlob(result.blob, result.name)}
                >
                  <Download />
                  Download
                </Button>
              }
            >
              <div className="flex flex-wrap items-center gap-4">
                <div className="overflow-hidden rounded-[10px] border border-border bg-secondary/40">
                  <CropPreview blob={result.blob} />
                </div>
                <div className="grid grow grid-cols-2 gap-4 sm:grid-cols-3">
                  <Stat label="Output" value={`${result.width} × ${result.height}`} />
                  <Stat label="File" value={formatBytes(result.blob.size)} />
                  <Stat label="Ratio" value={(result.width / result.height).toFixed(3)} />
                </div>
                <Button variant="outline" onClick={() => downloadBlob(result.blob, result.name)}>
                  <Download />
                  Save PNG
                </Button>
              </div>
            </Panel>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <Panel title="Notes" step="03" tone="quiet">
        <EmptyHint>
          Crops are cut from the original pixels, not from the on-screen preview. Exporting again after
          moving the frame always uses the full-resolution source.
        </EmptyHint>
      </Panel>
    </ToolPage>
  )
}

function CropPreview({ blob }: { blob: Blob }) {
  const url = useObjectUrl(blob)
  if (!url) return null
  return <img src={url} alt="Cropped result" className="max-h-28 max-w-[200px] object-contain" />
}

import * as React from "react"
import { AnimatePresence, motion } from "motion/react"
import { Download, ImagePlus, QrCode, RotateCcw, ScanLine, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { toolBySlug } from "@/tools"
import { Notice, Panel, Stat, ToolPage } from "@/components/ToolUI"
import { Field, Segmented, TextInput } from "@/components/ui/field"
import { Button } from "@/components/ui/button"
import { loadLogo, qrToBlob, renderQr, type QrEcc } from "@/lib/qr"
import { useObjectUrl } from "@/hooks/useObjectUrl"
import { downloadBlob } from "@/lib/utils"

const TOOL = toolBySlug("qr-generator")!

function luminance(hex: string) {
  const clean = hex.replace("#", "")
  const value = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean
  const channels = [0, 2, 4].map((offset) => {
    const channel = parseInt(value.slice(offset, offset + 2), 16) / 255
    return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

function contrastRatio(a: string, b: string) {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

export function QrGenerator() {
  const [text, setText] = React.useState("https://purepixel.xyz")
  const [size, setSize] = React.useState("512")
  const [ecc, setEcc] = React.useState<QrEcc>("H")
  const [fg, setFg] = React.useState("#14150f")
  const [bg, setBg] = React.useState("#fbfaf5")
  const [logo, setLogo] = React.useState<HTMLImageElement | null>(null)
  const [logoName, setLogoName] = React.useState<string | null>(null)
  const [blob, setBlob] = React.useState<Blob | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [rendering, setRendering] = React.useState(false)
  const logoInput = React.useRef<HTMLInputElement>(null)
  const previewUrl = useObjectUrl(blob)

  React.useEffect(() => {
    let cancelled = false
    setRendering(true)
    const timer = window.setTimeout(async () => {
      if (!text.trim()) {
        setBlob(null)
        setError(null)
        setRendering(false)
        return
      }
      try {
        const canvas = await renderQr({
          text,
          size: Number(size),
          ecc,
          fg,
          bg,
          logo,
        })
        const next = await qrToBlob(canvas)
        if (cancelled) return
        setBlob(next)
        setError(null)
      } catch (err) {
        if (cancelled) return
        setError(
          err instanceof Error && /too (long|big)|overflow/i.test(err.message)
            ? "That content is too long for this error-correction level. Shorten it or choose a lower level."
            : "This content could not be encoded as a QR code.",
        )
        setBlob(null)
      } finally {
        if (!cancelled) setRendering(false)
      }
    }, 110)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [text, size, ecc, fg, bg, logo])

  const ratio = contrastRatio(fg, bg)
  const weakContrast = ratio < 3

  async function onLogo(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image for the logo.")
      return
    }
    try {
      const img = await loadLogo(file)
      setLogo(img)
      setLogoName(file.name)
      setEcc("H")
      toast.success("Logo placed. Error correction raised to H for reliability.")
    } catch {
      toast.error("That logo could not be loaded.")
    }
  }

  return (
    <ToolPage
      tool={TOOL}
      aside={
        <>
          <Panel title="Encoding" step="settings">
            <div className="space-y-5">
              <Field label="Content" hint={`${text.length} chars`} htmlFor="qr-content">
                <TextInput
                  id="qr-content"
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="https://example.com"
                  spellCheck={false}
                  maxLength={1200}
                />
                <div className="mt-2.5 flex flex-wrap gap-1.5" role="group" aria-label="Quick fill presets">
                  <button
                    type="button"
                    onClick={() => setText("https://example.com")}
                    className="rounded-full border border-border bg-card px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.06em] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Website URL
                  </button>
                  <button
                    type="button"
                    onClick={() => setText("WIFI:T:WPA;S:HomeNetwork;P:correct-horse-battery-staple;;")}
                    className="rounded-full border border-border bg-card px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.06em] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Wi-Fi Credentials
                  </button>
                  <button
                    type="button"
                    onClick={() => setText("mailto:hello@example.com")}
                    className="rounded-full border border-border bg-card px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.06em] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Email Link
                  </button>
                </div>
              </Field>

              <div>
                <p className="mb-2 text-[13px] font-medium">Error correction</p>
                <Segmented
                  label="Error correction level"
                  value={ecc}
                  onChange={setEcc}
                  options={[
                    { value: "L", label: "L 7%" },
                    { value: "M", label: "M 15%" },
                    { value: "Q", label: "Q 25%" },
                    { value: "H", label: "H 30%" },
                  ]}
                />
                <p className="mt-2 text-[11.5px] leading-relaxed text-muted-foreground">
                  Higher levels survive more damage but hold less data. Use H with a logo.
                </p>
              </div>

              <div>
                <p className="mb-2 text-[13px] font-medium">Export size</p>
                <Segmented
                  label="Export size"
                  value={size}
                  onChange={setSize}
                  options={[
                    { value: "256", label: "256" },
                    { value: "512", label: "512" },
                    { value: "1024", label: "1024" },
                    { value: "2048", label: "2048" },
                  ]}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="mb-2 text-[13px] font-medium">Ink</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      aria-label="Foreground colour"
                      value={fg}
                      onChange={(event) => setFg(event.target.value)}
                      className="h-9 w-11 cursor-pointer rounded-[8px] border border-input bg-card p-0.5"
                    />
                    <span className="font-mono text-[10.5px] uppercase text-muted-foreground">{fg}</span>
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-[13px] font-medium">Paper</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      aria-label="Background colour"
                      value={bg}
                      onChange={(event) => setBg(event.target.value)}
                      className="h-9 w-11 cursor-pointer rounded-[8px] border border-input bg-card p-0.5"
                    />
                    <span className="font-mono text-[10.5px] uppercase text-muted-foreground">{bg}</span>
                  </div>
                </div>
              </div>

              <div>
                <p className="mb-2 text-[13px] font-medium">Centre logo</p>
                <input
                  ref={logoInput}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => {
                    void onLogo(event.target.files?.[0])
                    event.target.value = ""
                  }}
                />
                {logo && logoName ? (
                  <div className="flex items-center gap-2 rounded-[10px] border border-border bg-card px-3 py-2">
                    <ImagePlus className="size-3.5 text-primary" />
                    <span className="min-w-0 flex-1 truncate text-[12px]">{logoName}</span>
                    <button
                      type="button"
                      aria-label="Remove logo"
                      onClick={() => {
                        setLogo(null)
                        setLogoName(null)
                      }}
                      className="grid size-6 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" className="w-full" onClick={() => logoInput.current?.click()}>
                    <ImagePlus />
                    Add a logo
                  </Button>
                )}
              </div>
            </div>
          </Panel>

          <Panel title="Scan check" step="readout" tone="quiet">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-muted-foreground">Ink / paper contrast</span>
                <span className={`font-mono text-[11px] ${weakContrast ? "text-destructive" : "text-signal"}`}>
                  {ratio.toFixed(1)}:1
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-muted-foreground">Modules drawn</span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {blob ? `${Number(size)} px` : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-muted-foreground">Quiet zone</span>
                <span className="font-mono text-[11px] text-signal">2 modules</span>
              </div>
              {weakContrast ? (
                <Notice tone="warn">
                  Low contrast. Scanners need dark modules on a light background — aim for at least 3:1.
                </Notice>
              ) : (
                <Notice tone="signal">
                  Contrast is healthy. Keep the quiet zone clear when you place this code on artwork.
                </Notice>
              )}
            </div>
          </Panel>
        </>
      }
    >
      <Panel title="Preview" step="01">
        <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_200px] sm:items-center">
          <div className="grain relative mx-auto flex aspect-square w-full max-w-[380px] items-center justify-center overflow-hidden rounded-[16px] border border-border bg-secondary/40 p-6">
            <span className="absolute left-3 top-3 size-3 border-l border-t border-line" />
            <span className="absolute right-3 top-3 size-3 border-r border-t border-line" />
            <span className="absolute bottom-3 left-3 size-3 border-b border-l border-line" />
            <span className="absolute bottom-3 right-3 size-3 border-b border-r border-line" />
            <AnimatePresence mode="wait">
              {previewUrl ? (
                <motion.img
                  key={previewUrl}
                  src={previewUrl}
                  alt="QR code preview"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  className="h-full w-full rounded-[6px] object-contain shadow-[0_10px_30px_-18px_rgb(18_20_15/0.5)]"
                />
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center gap-2 text-muted-foreground"
                >
                  <QrCode className="size-8" />
                  <p className="text-[12px]">Enter content to draw a code</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="space-y-4">
            <div>
              <p className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted-foreground">
                live output
              </p>
              <p className="mt-1 font-display text-[17px] font-semibold tabular-nums">
                {size} × {size}
                <span className="ml-1 font-mono text-[10px] font-normal uppercase tracking-[0.08em] text-muted-foreground">
                  px
                </span>
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Stat label="ECC" value={ecc} />
              <Stat label="Logo" value={logo ? "yes" : "no"} />
              <Stat label="Bytes" value={blob ? (blob.size / 1024).toFixed(1) + " KB" : "—"} />
              <Stat
                label="Contrast"
                value={`${ratio.toFixed(1)}:1`}
                tone={weakContrast ? "default" : "signal"}
              />
            </div>
            <Button
              className="w-full"
              variant="signal"
              disabled={!blob}
              onClick={() => blob && downloadBlob(blob, `localpixel-qr-${size}px.png`)}
            >
              <Download />
              Download PNG
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                setText("https://purepixel.xyz")
                setFg("#14150f")
                setBg("#fbfaf5")
                setLogo(null)
                setLogoName(null)
                setEcc("H")
                setSize("512")
              }}
            >
              <RotateCcw />
              Reset settings
            </Button>
          </div>
        </div>

        {error ? (
          <div className="mt-4">
            <Notice tone="warn">{error}</Notice>
          </div>
        ) : null}
      </Panel>

      <Panel title="What this code contains" step="02" tone="quiet">
        <div className="flex items-start gap-3">
          <ScanLine className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p className="break-words font-mono text-[11.5px] leading-relaxed text-muted-foreground">
            {text || "—"}
          </p>
        </div>
        {rendering ? (
          <p className="mt-3 font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted-foreground">
            redrawing…
          </p>
        ) : null}
      </Panel>
    </ToolPage>
  )
}

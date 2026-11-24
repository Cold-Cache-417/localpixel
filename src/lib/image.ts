import { encodeBmp, encodeGif, encodeSvgWrap } from "./encoders"

export type RasterFormat = "png" | "jpeg" | "webp" | "gif" | "bmp" | "svg"

export const MIME: Record<RasterFormat, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  bmp: "image/bmp",
  svg: "image/svg+xml",
}

const EXT: Record<RasterFormat, string> = {
  png: "png",
  jpeg: "jpg",
  webp: "webp",
  gif: "gif",
  bmp: "bmp",
  svg: "svg",
}

export function extForFormat(format: RasterFormat) {
  return EXT[format]
}

export async function decodeImage(file: File | Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.decoding = "async"
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error("This file could not be decoded as an image."))
      img.src = url
    })
    return img
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 2000)
  }
}

export function drawToCanvas(
  img: HTMLImageElement,
  opts: { maxWidth?: number; maxHeight?: number; background?: string } = {},
): HTMLCanvasElement {
  const natW = img.naturalWidth || img.width
  const natH = img.naturalHeight || img.height
  const maxW = opts.maxWidth && opts.maxWidth > 0 ? opts.maxWidth : natW
  const maxH = opts.maxHeight && opts.maxHeight > 0 ? opts.maxHeight : natH
  const scale = Math.min(1, maxW / natW, maxH / natH)
  const w = Math.max(1, Math.round(natW * scale))
  const h = Math.max(1, Math.round(natH * scale))
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d")!
  if (opts.background) {
    ctx.fillStyle = opts.background
    ctx.fillRect(0, 0, w, h)
  }
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"
  ctx.drawImage(img, 0, 0, w, h)
  return canvas
}

export async function encodeCanvas(
  canvas: HTMLCanvasElement,
  format: RasterFormat,
  quality = 0.82,
): Promise<Blob> {
  if (format === "bmp") return encodeBmp(canvas)
  if (format === "gif") return encodeGif(canvas)
  if (format === "svg") return encodeSvgWrap(canvas, quality * 100)
  const mime = MIME[format]
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, mime, quality),
  )
  if (!blob) throw new Error(`Your browser could not encode ${format.toUpperCase()}.`)
  return blob
}

export function outputName(name: string, format: RasterFormat, suffix = "") {
  const base = name.lastIndexOf(".") > 0 ? name.slice(0, name.lastIndexOf(".")) : name
  return `${base}${suffix}.${EXT[format]}`
}

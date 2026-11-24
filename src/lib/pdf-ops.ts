import { PDFDocument } from "pdf-lib"
import { decodeImage } from "./image"

function toPdfBlob(bytes: Uint8Array): Blob {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return new Blob([copy], { type: "application/pdf" })
}

export async function mergePdfs(buffers: ArrayBuffer[]): Promise<Blob> {
  const out = await PDFDocument.create()
  for (const buffer of buffers) {
    const src = await PDFDocument.load(buffer, { ignoreEncryption: true })
    const pages = await out.copyPages(src, src.getPageIndices())
    pages.forEach((p) => out.addPage(p))
  }
  const bytes = await out.save()
  return toPdfBlob(bytes)
}

export async function extractPages(buffer: ArrayBuffer, pages: number[]): Promise<Blob> {
  const src = await PDFDocument.load(buffer, { ignoreEncryption: true })
  const out = await PDFDocument.create()
  const indices = pages.map((p) => p - 1).filter((i) => i >= 0 && i < src.getPageCount())
  const copied = await out.copyPages(src, indices)
  copied.forEach((p) => out.addPage(p))
  const bytes = await out.save()
  return toPdfBlob(bytes)
}

export type PagePreset = "a4" | "letter" | "fit"
export type PageOrientation = "auto" | "portrait" | "landscape"

export interface ImagesToPdfOptions {
  preset: PagePreset
  orientation: PageOrientation
  margin: number
}

const SIZES: Record<Exclude<PagePreset, "fit">, [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612, 792],
}

export async function imagesToPdf(files: File[], opts: ImagesToPdfOptions): Promise<Blob> {
  const out = await PDFDocument.create()
  for (const file of files) {
    const img = await decodeImage(file)
    const data = await file.arrayBuffer()
    let embedded
    if (file.type === "image/png") embedded = await out.embedPng(data)
    else if (file.type === "image/jpeg") embedded = await out.embedJpg(data)
    else {
      const canvas = document.createElement("canvas")
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext("2d")!
      ctx.drawImage(img, 0, 0)
      const png = await new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b!), "image/png"),
      )
      embedded = await out.embedPng(await png.arrayBuffer())
    }

    const iw = embedded.width
    const ih = embedded.height
    let pageW: number
    let pageH: number
    if (opts.preset === "fit") {
      pageW = iw + opts.margin * 2
      pageH = ih + opts.margin * 2
    } else {
      const base = SIZES[opts.preset]
      const landscape =
        opts.orientation === "landscape" ||
        (opts.orientation === "auto" && iw > ih)
      pageW = landscape ? base[1] : base[0]
      pageH = landscape ? base[0] : base[1]
    }
    const page = out.addPage([pageW, pageH])
    const availW = Math.max(1, pageW - opts.margin * 2)
    const availH = Math.max(1, pageH - opts.margin * 2)
    const scale = Math.min(availW / iw, availH / ih)
    const w = iw * scale
    const h = ih * scale
    page.drawImage(embedded, {
      x: (pageW - w) / 2,
      y: (pageH - h) / 2,
      width: w,
      height: h,
    })
  }
  const bytes = await out.save()
  return toPdfBlob(bytes)
}

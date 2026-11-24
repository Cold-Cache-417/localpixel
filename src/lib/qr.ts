import QRCode from "qrcode"

export type QrEcc = "L" | "M" | "Q" | "H"

export interface QrOptions {
  text: string
  size: number
  ecc: QrEcc
  fg: string
  bg: string
  logo?: HTMLImageElement | null
}

export async function renderQr(opts: QrOptions): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas")
  await QRCode.toCanvas(canvas, opts.text || " ", {
    width: opts.size,
    margin: 2,
    errorCorrectionLevel: opts.ecc,
    color: { dark: opts.fg, light: opts.bg },
  })
  if (opts.logo) {
    const ctx = canvas.getContext("2d")!
    const logoSize = Math.round(opts.size * 0.2)
    const x = (canvas.width - logoSize) / 2
    const y = (canvas.height - logoSize) / 2
    const pad = Math.round(opts.size * 0.018)
    ctx.fillStyle = opts.bg
    ctx.beginPath()
    ctx.roundRect(x - pad, y - pad, logoSize + pad * 2, logoSize + pad * 2, pad * 1.4)
    ctx.fill()
    ctx.drawImage(opts.logo, x, y, logoSize, logoSize)
  }
  return canvas
}

export function qrToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("QR export failed."))), "image/png"),
  )
}

export async function loadLogo(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error("This logo could not be loaded."))
      img.src = url
    })
    return img
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 2000)
  }
}

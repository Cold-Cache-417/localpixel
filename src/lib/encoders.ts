import { GIFEncoder, quantize, applyPalette } from "gifenc"

export function encodeBmp(canvas: HTMLCanvasElement): Blob {
  const ctx = canvas.getContext("2d")!
  const { width, height } = canvas
  const data = ctx.getImageData(0, 0, width, height).data
  const rowSize = Math.floor((24 * width + 31) / 32) * 4
  const pixelSize = rowSize * height
  const fileSize = 54 + pixelSize
  const buf = new ArrayBuffer(fileSize)
  const view = new DataView(buf)
  const u8 = new Uint8Array(buf)

  view.setUint8(0, 0x42)
  view.setUint8(1, 0x4d)
  view.setUint32(2, fileSize, true)
  view.setUint32(10, 54, true)
  view.setUint32(14, 40, true)
  view.setInt32(18, width, true)
  view.setInt32(22, height, true)
  view.setUint16(26, 1, true)
  view.setUint16(28, 24, true)
  view.setUint32(34, pixelSize, true)
  view.setInt32(38, 2835, true)
  view.setInt32(42, 2835, true)

  let offset = 54
  for (let y = height - 1; y >= 0; y--) {
    const rowStart = offset
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      u8[offset++] = data[i + 2]
      u8[offset++] = data[i + 1]
      u8[offset++] = data[i]
    }
    while (offset - rowStart < rowSize) u8[offset++] = 0
  }
  return new Blob([buf], { type: "image/bmp" })
}

export function encodeGif(canvas: HTMLCanvasElement): Blob {
  const ctx = canvas.getContext("2d")!
  const { width, height } = canvas
  const { data } = ctx.getImageData(0, 0, width, height)
  const palette = quantize(data, 256)
  const index = applyPalette(data, palette)
  const gif = GIFEncoder()
  gif.writeFrame(index, width, height, { palette })
  gif.finish()
  return new Blob([gif.bytes()], { type: "image/gif" })
}

export function encodeSvgWrap(canvas: HTMLCanvasElement, quality: number): Blob {
  const dataUrl = canvas.toDataURL("image/png", quality / 100)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}"><image width="${canvas.width}" height="${canvas.height}" href="${dataUrl}"/></svg>`
  return new Blob([svg], { type: "image/svg+xml" })
}

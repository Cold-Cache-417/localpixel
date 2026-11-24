import fs from "node:fs"
import path from "node:path"
import { execFileSync } from "node:child_process"
import { PNG } from "pngjs"
import piexif from "piexifjs"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"

const dir = path.resolve("tests/fixtures")
fs.mkdirSync(dir, { recursive: true })

function seedNoise(seed) {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}

function drawPhoto() {
  const width = 1600
  const height = 1067
  const png = new PNG({ width, height })
  const rand = seedNoise(42)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const sky = y < height * 0.55
      let r, g, b
      if (sky) {
        const t = y / (height * 0.55)
        r = 120 + 100 * (1 - t)
        g = 150 + 70 * (1 - t)
        b = 205 + 35 * (1 - t)
      } else {
        const t = (y - height * 0.55) / (height * 0.45)
        r = 60 + 40 * t
        g = 95 + 55 * t
        b = 55 + 30 * t
      }
      const sun = Math.hypot(x - width * 0.72, y - height * 0.28)
      if (sun < 90) {
        r = 255
        g = 226
        b = 150
      }
      const hill = height * 0.58 + Math.sin(x / 120) * 26 + Math.cos(x / 47) * 10
      if (y > hill && y < height * 0.72) {
        r = 38 + rand() * 20
        g = 72 + rand() * 22
        b = 48 + rand() * 16
      }
      const noise = (rand() - 0.5) * 10
      png.data[i] = Math.max(0, Math.min(255, r + noise))
      png.data[i + 1] = Math.max(0, Math.min(255, g + noise))
      png.data[i + 2] = Math.max(0, Math.min(255, b + noise))
      png.data[i + 3] = 255
    }
  }
  return PNG.sync.write(png)
}

function drawAlpha() {
  const width = 800
  const height = 600
  const png = new PNG({ width, height })
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const inCircle = Math.hypot(x - width / 2, y - height / 2) < 220
      png.data[i] = 37
      png.data[i + 1] = 71
      png.data[i + 2] = 244
      png.data[i + 3] = inCircle ? 255 : 0
    }
  }
  return PNG.sync.write(png)
}

function drawLogo() {
  const size = 192
  const png = new PNG({ width: size, height: size })
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      const inCircle = Math.hypot(x - size / 2, y - size / 2) < size * 0.46
      png.data[i] = inCircle ? 20 : 0
      png.data[i + 1] = inCircle ? 21 : 0
      png.data[i + 2] = inCircle ? 15 : 0
      png.data[i + 3] = inCircle ? 255 : 0
    }
  }
  return PNG.sync.write(png)
}

fs.writeFileSync(path.join(dir, "sample.png"), drawPhoto())
fs.writeFileSync(path.join(dir, "alpha.png"), drawAlpha())
fs.writeFileSync(path.join(dir, "logo.png"), drawLogo())

execFileSync("sips", ["-s", "format", "jpeg", path.join(dir, "sample.png"), "--out", path.join(dir, "sample.jpg")], { stdio: "ignore" })

const jpegBinary = fs.readFileSync(path.join(dir, "sample.jpg")).toString("binary")
const exif = piexif.dump({
  "0th": {
    [piexif.ImageIFD.Make]: "Localpixel Labs",
    [piexif.ImageIFD.Model]: "Field Camera X1",
    [piexif.ImageIFD.Software]: "Fixture Generator 1.0",
    [piexif.ImageIFD.Artist]: "Test Operator",
    [piexif.ImageIFD.Copyright]: "Fixture only",
  },
  Exif: {
    [piexif.ExifIFD.DateTimeOriginal]: "2026:11:24 09:15:00",
    [piexif.ExifIFD.BodySerialNumber]: "SN-0042-ALPHA",
    [piexif.ExifIFD.LensModel]: "35mm f/2",
  },
  GPS: {
    [piexif.GPSIFD.GPSLatitudeRef]: "N",
    [piexif.GPSIFD.GPSLatitude]: piexif.GPSHelper.degToDmsRational(51.5074),
    [piexif.GPSIFD.GPSLongitudeRef]: "W",
    [piexif.GPSIFD.GPSLongitude]: piexif.GPSHelper.degToDmsRational(0.1278),
    [piexif.GPSIFD.GPSAltitude]: [350, 10],
  },
  "1st": {},
  thumbnail: null,
})
fs.writeFileSync(path.join(dir, "sample-exif.jpg"), Buffer.from(piexif.insert(exif, jpegBinary), "binary"))

async function makePdf(file, pages) {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  for (const page of pages) {
    const sheet = doc.addPage(page.size)
    sheet.drawText(page.heading, { x: 56, y: page.size[1] - 90, size: 24, font: bold, color: rgb(0.08, 0.08, 0.06) })
    page.lines.forEach((line, index) => {
      sheet.drawText(line, { x: 56, y: page.size[1] - 140 - index * 28, size: 12, font, color: rgb(0.25, 0.25, 0.22) })
    })
    sheet.drawText(`Fixture page ${page.number} of ${pages.length}`, {
      x: 56,
      y: 48,
      size: 9,
      font,
      color: rgb(0.4, 0.4, 0.36),
    })
  }
  fs.writeFileSync(path.join(dir, file), await doc.save())
}

await makePdf("doc-3pages.pdf", [
  {
    number: 1,
    size: [595.28, 841.89],
    heading: "Quarterly Field Report",
    lines: ["Alpha observation: the compressor reduced a 2.4 megabyte image.", "Beta observation: metadata was stripped and verified.", "Gamma observation: all processing stayed local."],
  },
  {
    number: 2,
    size: [841.89, 595.28],
    heading: "Landscape Chart Notes",
    lines: ["The second page is deliberately landscape.", "This helps verify per-page orientation after splitting."],
  },
  {
    number: 3,
    size: [612, 792],
    heading: "Letter Notes",
    lines: ["The third page uses US Letter dimensions.", "Page order must survive merging and splitting."],
  },
])

await makePdf("second-2pages.pdf", [
  {
    number: 1,
    size: [612, 792],
    heading: "Second Document",
    lines: ["This file exists to be merged with the first.", "Its pages should follow the three report pages."],
  },
  {
    number: 2,
    size: [612, 792],
    heading: "Second Document, Page Two",
    lines: ["Final page of the merge fixture.", "Total merged page count should be five."],
  },
])

fs.writeFileSync(path.join(dir, "broken.jpg"), Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from("not a real jpeg payload")]))

console.log("fixtures written:", fs.readdirSync(dir).sort().join(", "))

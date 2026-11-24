import { chromium } from "playwright"
import fs from "node:fs"
import path from "node:path"
import JSZip from "jszip"
import { PNG } from "pngjs"
import jsQR from "jsqr"

const BASE = "http://localhost:4173"
const FIX = path.resolve("tests/fixtures")
const out = path.resolve("tests/parity/evidence")
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } })
const errors = []
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text())
})
page.on("pageerror", (e) => errors.push(String(e)))

const results = []
async function check(name, fn) {
  try {
    const r = await fn()
    results.push({ name, status: "PASS", detail: r })
    console.log(`PASS ${name}`, JSON.stringify(r))
  } catch (e) {
    results.push({ name, status: "FAIL", detail: String(e) })
    console.log(`FAIL ${name}`, String(e))
  }
}

async function goto(p) {
  await page.goto(`${BASE}${p}`, { waitUntil: "networkidle" })
  await page.waitForTimeout(1400)
}
async function upload(...names) {
  await page.locator('input[type="file"]').first().setInputFiles(names.map((n) => path.join(FIX, n)))
}
async function download(name, buttonName) {
  const [dl] = await Promise.all([
    page.waitForEvent("download", { timeout: 60000 }),
    page.getByRole("button", { name: buttonName }).click(),
  ])
  const p = path.join(out, name)
  await dl.saveAs(p)
  return p
}
const jpegMagic = (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff
const pngMagic = (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47
const isZip = (b) => b[0] === 0x50 && b[1] === 0x4b
const isPdf = (b) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 // %PDF

// ---------- 1. Compress ----------
await check("compress-image (zip of jpg+png, valid magics)", async () => {
  await goto("/compress-image")
  await upload("sample-exif.jpg", "sample.png")
  await page.waitForTimeout(2600)
  await page.getByRole("button", { name: /Compress files/ }).click()
  const zipPath = await download("matrix-compress.zip", /Download ZIP/)
  const zip = await JSZip.loadAsync(fs.readFileSync(zipPath))
  const entries = Object.keys(zip.files).filter((n) => !zip.files[n].dir)
  if (entries.length < 2) throw new Error(`expected 2 zip entries, got ${entries.length}: ${entries}`)
  const magics = {}
  for (const e of entries) {
    const buf = await zip.file(e).async("nodebuffer")
    magics[e] = buf.slice(0, 4).toString("latin1")
  }
  return { zip: path.basename(zipPath), entries, magics }
})

// ---------- 2. Image converter ----------
await check("image-converter (real png -> output, valid magic)", async () => {
  await goto("/image-converter")
  await upload("sample.png")
  await page.waitForTimeout(2600)
  await page.getByRole("button", { name: /Convert file/ }).click()
  const p = await download("matrix-converter.webp", /Download sample/)
  const buf = fs.readFileSync(p)
  if (!(buf[0] === 0x52 && buf[1] === 0x49 && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50)) {
    throw new Error(`converter output is not webp: ${buf.slice(0, 12).toString("latin1")}`)
  }
  return { file: path.basename(p), size: buf.length, magic: "webp ok" }
})

// ---------- 3. PNG -> WebP ----------
await check("png-to-webp (real png -> webp, valid magic)", async () => {
  await goto("/png-to-webp")
  await upload("sample.png")
  await page.waitForTimeout(2600)
  await page.getByRole("button", { name: /Convert to WebP/ }).click()
  const p = await download("matrix-png2webp.webp", /Download sample/)
  const buf = fs.readFileSync(p)
  if (!(buf[0] === 0x52 && buf[1] === 0x49 && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50)) {
    throw new Error(`bad webp magic: ${buf.slice(0, 12).toString("latin1")}`)
  }
  return { file: path.basename(p), size: buf.length, magic: "RIFF....WEBP ok" }
})

// ---------- 4. EXIF remover ----------
await check("exif-remover (clean copy of sample-exif.jpg, valid jpeg)", async () => {
  await goto("/exif-remover")
  await upload("sample-exif.jpg")
  await page.waitForTimeout(3000)
  await page.getByRole("button", { name: /Remove metadata/ }).click()
  const p = await download("matrix-clean.jpg", /Download sample-exif-clean/)
  const buf = fs.readFileSync(p)
  if (!jpegMagic(buf)) throw new Error(`bad jpeg magic: ${buf.slice(0, 4).toString("hex")}`)
  return { file: path.basename(p), size: buf.length, magic: "jpeg ok" }
})

// ---------- 5. QR generator ----------
await check("qr-generator (default content + png export + decode)", async () => {
  await goto("/qr-generator")
  const content = await page.locator("#qr-content").inputValue()
  await page.getByRole("button", { name: /Download PNG/ }).click()
  const p = await download("matrix-qr-512.png", /Download PNG/)
  const buf = fs.readFileSync(p)
  const png = PNG.sync.read(buf)
  const res = jsQR(Buffer.from(png.data), png.width, png.height)
  return { content, decoded: res?.data ?? null, size: buf.length, png: `${png.width}x${png.height}` }
})

// ---------- 6. Meme cropper ----------
await check("meme-cropper (crop + captions + export, valid png + caption ink)", async () => {
  await goto("/meme-cropper")
  await upload("sample.jpg")
  await page.waitForTimeout(2600)
  await page.getByRole("button", { name: /4:5/ }).click()
  await page.waitForTimeout(800)
  await page.getByPlaceholder(/top text/i).fill("Local Pixel")
  await page.getByPlaceholder(/bottom text/i).fill("parity check 2026")
  await page.waitForTimeout(900)
  await page.getByRole("button", { name: /Export crop/ }).click()
  await page.waitForTimeout(2500)
  const p = await download("matrix-meme-4x5.png", /Download/)
  const buf = fs.readFileSync(p)
  if (!pngMagic(buf)) throw new Error("bad png magic")
  const png = PNG.sync.read(buf)
  const whiteTop = (() => {
    let n = 0
    const y0 = Math.floor(png.height * 0.05)
    const y1 = Math.floor(png.height * 0.2)
    for (let y = y0; y < y1; y++) for (let x = 0; x < png.width; x++) {
      const i = (y * png.width + x) * 4
      if (png.data[i] > 235 && png.data[i + 1] > 235 && png.data[i + 2] > 235) n++
    }
    return n
  })()
  return { file: path.basename(p), size: buf.length, dims: `${png.width}x${png.height}`, whiteTopInk: whiteTop > 0 }
})

// ---------- 7. PDF -> Word ----------
await check("pdf-to-word (extract -> edit -> docx, edited text present)", async () => {
  await goto("/pdf-to-word")
  await upload("doc-3pages.pdf")
  await page.waitForTimeout(3600)
  const before = await page.locator("textarea").inputValue()
  await page.locator("textarea").fill("Edited paragraph alpha\n\n---\n\nEdited paragraph beta")
  await page.getByRole("button", { name: /Build DOCX/ }).click()
  const p = await download("matrix-pdf-to-word.docx", /Download DOCX/)
  const zip = await JSZip.loadAsync(fs.readFileSync(p))
  const xml = await zip.file("word/document.xml").async("string")
  const hasBreak = xml.includes('w:type="page"')
  if (!xml.includes("Edited paragraph alpha") || !xml.includes("Edited paragraph beta")) {
    throw new Error("edited text missing from docx")
  }
  return { file: path.basename(p), beforeSnippet: before.slice(0, 40), hasBreak }
})

// ---------- 8. Images -> PDF ----------
await check("images-to-pdf (png + alpha -> pdf, valid pdf)", async () => {
  await goto("/images-to-pdf")
  await upload("sample.png", "alpha.png")
  await page.waitForTimeout(2600)
  await page.getByRole("button", { name: /Build PDF/ }).click()
  const p = await download("matrix-images-to-pdf.pdf", /Download/)
  const buf = fs.readFileSync(p)
  if (!isPdf(buf)) throw new Error(`bad pdf magic: ${buf.slice(0, 8).toString("latin1")}`)
  return { file: path.basename(p), size: buf.length, magic: "%PDF ok" }
})

// ---------- 9. Merge PDF ----------
await check("merge-pdf (2 docs -> merged pdf, valid pdf)", async () => {
  await goto("/merge-pdf")
  await upload("doc-3pages.pdf", "second-2pages.pdf")
  await page.waitForTimeout(3000)
  await page.getByRole("button", { name: /Merge \d+ PDFs/ }).click()
  const p = await download("matrix-merged.pdf", /Download PDF/)
  const buf = fs.readFileSync(p)
  if (!isPdf(buf)) throw new Error(`bad pdf magic: ${buf.slice(0, 8).toString("latin1")}`)
  return { file: path.basename(p), size: buf.length, magic: "%PDF ok" }
})

// ---------- 10. PDF -> Images ----------
await check("pdf-to-images (doc -> zip of pngs, valid)", async () => {
  await goto("/pdf-to-images")
  await upload("doc-3pages.pdf")
  await page.waitForTimeout(3000)
  await page.getByRole("button", { name: /Render pages/ }).click()
  const p = await download("matrix-pdf-to-images.zip", /Download ZIP/)
  const zip = await JSZip.loadAsync(fs.readFileSync(p))
  const entries = Object.keys(zip.files).filter((n) => !zip.files[n].dir)
  const first = await zip.file(entries[0]).async("nodebuffer")
  if (!pngMagic(first)) throw new Error(`bad png in zip: ${entries[0]}`)
  return { file: path.basename(p), entries, magic: "png in zip ok" }
})

// ---------- console errors on home ----------
await check("home console clean", async () => {
  await goto("/")
  const errs = errors.filter((e) => !/Download the React DevTools|favicon/i.test(e))
  if (errs.length) throw new Error(`console errors: ${errs.join(" | ")}`)
  return { errors: errors.length }
})

await browser.close()
console.log("SUMMARY", JSON.stringify(results.map((r) => ({ n: r.name, s: r.status })), null, 1))
if (results.some((r) => r.status === "FAIL")) process.exit(1)

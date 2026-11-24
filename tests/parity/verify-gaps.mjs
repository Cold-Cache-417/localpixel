import { chromium } from "playwright"
import fs from "node:fs"
import path from "node:path"
import { PNG } from "pngjs"
import JSZip from "jszip"

const BASE = "http://localhost:4173"
const FIX = path.resolve("tests/fixtures")
const out = path.resolve("tests/parity/evidence")
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } })
async function grab(name, action) {
  const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 60000 }), action()])
  await dl.saveAs(path.join(out, name))
  console.log("saved", name, dl.suggestedFilename(), fs.statSync(path.join(out, name)).size)
}

// ---- Gap 1: meme captions + export ----
await page.goto(`${BASE}/meme-cropper`, { waitUntil: "networkidle" })
await page.locator('input[type="file"]').first().setInputFiles(path.join(FIX, "sample.jpg"))
await page.waitForTimeout(2500)
await page.getByRole("button", { name: /4:5/ }).click()
await page.waitForTimeout(700)
await page.getByPlaceholder("Optional top text…").fill("Local Pixel")
await page.getByPlaceholder("Optional bottom text…").fill("parity check 2026")
await page.waitForTimeout(900)
await page.getByRole("button", { name: /Export crop/ }).click()
await page.waitForTimeout(2500)
await grab("ours-meme-4x5.png", () => page.getByRole("button", { name: /Download/ }).click())
const buf = fs.readFileSync(path.join(out, "ours-meme-4x5.png"))
const png = PNG.sync.read(buf)
const count = (y0, y1) => {
  let n = 0
  for (let y = Math.floor(y0); y < Math.floor(y1); y++) for (let x = 0; x < png.width; x++) {
    const i = (y * png.width + x) * 4
    if (png.data[i] > 235 && png.data[i + 1] > 235 && png.data[i + 2] > 235) n++
  }
  return n
}
console.log("OURS meme:", png.width + "x" + png.height, "whiteTop:", count(0, png.height * 0.2), "whiteBottom:", count(png.height * 0.75, png.height))

// ---- Gap 2: compress output format webp + max height ----
await page.goto(`${BASE}/compress-image`, { waitUntil: "networkidle" })
await page.locator('input[type="file"]').first().setInputFiles([path.join(FIX, "sample-exif.jpg"), path.join(FIX, "sample.png")])
await page.waitForTimeout(2500)
await page.getByRole("radio", { name: "WebP" }).click()
await page.getByRole("button", { name: /Compress files|Compress again/ }).click()
await page.waitForTimeout(9000)
await grab("ours-compressed.zip", () => page.getByRole("button", { name: /Download ZIP/ }).click())

// ---- Gap 4: QR presets ----
await page.goto(`${BASE}/qr-generator`, { waitUntil: "networkidle" })
await page.waitForTimeout(700)
await page.getByRole("button", { name: /Website URL/ }).click()
const content = await page.locator("#qr-content").inputValue()
await page.getByRole("button", { name: /Wi-Fi Credentials/ }).click()
const wifi = await page.locator("#qr-content").inputValue()
await page.getByRole("button", { name: /Email Link/ }).click()
const email = await page.locator("#qr-content").inputValue()
console.log("QR presets:", JSON.stringify({ content, wifi, email }))

// ---- Gap 5: pdf to word editable ----
await page.goto(`${BASE}/pdf-to-word`, { waitUntil: "networkidle" })
await page.locator('input[type="file"]').first().setInputFiles(path.join(FIX, "doc-3pages.pdf"))
await page.waitForTimeout(3600)
const docText = await page.locator("textarea").inputValue()
console.log("DOCWORD docText:", JSON.stringify(docText.slice(0, 120)), "hasSep:", docText.includes("---"))
await browser.close()

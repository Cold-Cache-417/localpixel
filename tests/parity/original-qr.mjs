import { chromium } from "playwright"
import fs from "node:fs"
import path from "node:path"
import { PNG } from "pngjs"
import jsQR from "jsqr"

const BASE = "https://localconvert.ai.studio"
const FIX = path.resolve("tests/fixtures")
const out = path.resolve("tests/parity/evidence")
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } })
await page.goto(`${BASE}/qr-generator`, { waitUntil: "networkidle" })
await page.waitForTimeout(900)
const textInput = page.locator("#content, input").first()
console.log("content:", await textInput.inputValue())

async function scanFromDownload() {
  const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 30000 }), page.getByRole("button", { name: /Download PNG/ }).click()])
  const target = path.join(out, "original-qr-512.png")
  await dl.saveAs(target)
  const buf = fs.readFileSync(target)
  const png = PNG.sync.read(buf)
  const bytes = Buffer.from(png.data)
  const res = jsQR(bytes, png.width, png.height)
  return { fn: dl.suggestedFilename(), bytes: buf.length, data: res?.data ?? null }
}
console.log("qr scan:", JSON.stringify(await scanFromDownload()))

await page.getByRole("button", { name: /Website URL/ }).click()
console.log("website url content:", await textInput.inputValue())
await page.getByRole("button", { name: /Wi-Fi Credentials/ }).click()
console.log("wifi content:", await textInput.inputValue())
await page.getByRole("button", { name: /Email Link/ }).click()
console.log("email content:", await textInput.inputValue())
await browser.close()

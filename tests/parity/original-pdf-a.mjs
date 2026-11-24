import { chromium } from "playwright"
import fs from "node:fs"
import path from "node:path"

const BASE = "https://localconvert.ai.studio"
const FIX = path.resolve("tests/fixtures")
const out = path.resolve("tests/parity/evidence")
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } })
async function grab(name, action) {
  const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 40000 }), action()])
  await dl.saveAs(path.join(out, name))
  console.log("saved", name, dl.suggestedFilename(), fs.statSync(path.join(out, name)).size)
}

await page.goto(`${BASE}/pdf-to-word`, { waitUntil: "networkidle" })
await page.locator('input[type="file"]').first().setInputFiles(path.join(FIX, "doc-3pages.pdf"))
await page.waitForTimeout(3200)
await grab("original-pdf-to-word.docx", () => page.getByRole("button", { name: /Download Word/ }).click())

await page.goto(`${BASE}/images-to-pdf`, { waitUntil: "networkidle" })
await page.locator('input[type="file"]').first().setInputFiles([
  path.join(FIX, "sample.jpg"), path.join(FIX, "alpha.png"), path.join(FIX, "logo.png"),
])
await page.waitForTimeout(2200)
await grab("original-images-to-pdf.pdf", () => page.getByRole("button", { name: /Create & Download PDF/ }).click())
await browser.close()

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
await page.goto(`${BASE}/merge-pdf`, { waitUntil: "networkidle" })
await page.getByRole("button", { name: /Split \/ Extract Pages/ }).click()
await page.waitForTimeout(500)
await page.locator('input[type="file"]').first().setInputFiles(path.join(FIX, "doc-3pages.pdf"))
await page.waitForTimeout(2200)
await page.locator('input[type="text"]').fill("2-3")
await page.waitForTimeout(400)
await grab("original-split-2-3.pdf", () => page.getByRole("button", { name: /Extract 2 Pages/ }).click())
await grab("original-split-all.zip", () => page.getByRole("button", { name: /Split All Pages to ZIP/ }).click())

await page.goto(`${BASE}/pdf-to-images`, { waitUntil: "networkidle" })
await page.locator('input[type="file"]').first().setInputFiles(path.join(FIX, "doc-3pages.pdf"))
await page.waitForTimeout(3000)
await grab("original-pdf-images.zip", () => page.getByRole("button", { name: /Download All Pages/ }).click())
await browser.close()

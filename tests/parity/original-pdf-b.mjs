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
await page.locator('input[type="file"]').first().setInputFiles([
  path.join(FIX, "doc-3pages.pdf"), path.join(FIX, "second-2pages.pdf"),
])
await page.waitForTimeout(2500)
await grab("original-merged.pdf", () => page.getByRole("button", { name: /Merge & Download PDF/ }).click())
await page.getByRole("button", { name: /Split \/ Extract Pages/ }).click()
await page.waitForTimeout(800)
const info = await page.evaluate(() => ({
  text: (document.querySelector("main")?.innerText || "").slice(0, 1200),
  buttons: Array.from(document.querySelectorAll("button")).filter(b => b.offsetParent).map(b => (b.textContent || "").trim().replace(/\s+/g, " ")).filter(Boolean),
  inputs: Array.from(document.querySelectorAll("input")).filter(i => i.type !== "file" && i.offsetParent).map(i => ({ type: i.type, value: i.value, placeholder: i.placeholder })),
}))
console.log(JSON.stringify(info, null, 2))
await page.screenshot({ path: path.join(out, "original-split-mode.png"), fullPage: true })
await browser.close()

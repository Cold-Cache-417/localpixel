import { chromium } from "playwright"
import path from "node:path"

const BASE = "https://localconvert.ai.studio"
const FIX = path.resolve("tests/fixtures")
const out = path.resolve("tests/parity/evidence")
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } })
await page.goto(`${BASE}/merge-pdf`, { waitUntil: "networkidle" })
await page.getByRole("button", { name: /Split \/ Extract Pages/ }).click()
await page.waitForTimeout(600)
await page.locator('input[type="file"]').first().setInputFiles(path.join(FIX, "doc-3pages.pdf"))
await page.waitForTimeout(2500)
const info = await page.evaluate(() => ({
  text: (document.querySelector("main")?.innerText || "").slice(0, 1600),
  buttons: Array.from(document.querySelectorAll("button")).filter(b => b.offsetParent).map(b => (b.textContent || "").trim().replace(/\s+/g, " ")).filter(Boolean),
  inputs: Array.from(document.querySelectorAll("input")).filter(i => i.type !== "file" && i.offsetParent).map(i => ({ type: i.type, value: i.value, placeholder: i.placeholder })),
}))
console.log(JSON.stringify(info, null, 2))
await page.screenshot({ path: path.join(out, "original-split-loaded.png"), fullPage: true })
await browser.close()

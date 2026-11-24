import { chromium } from "playwright"
import fs from "node:fs"
import path from "node:path"

const BASE = "https://localconvert.ai.studio"
const FIX = path.resolve("tests/fixtures")
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } })
await page.goto(`${BASE}/compress-image`, { waitUntil: "networkidle" })
await page.waitForTimeout(800)
const buf = fs.readFileSync(path.join(FIX, "alpha.png"))
const dataTransfer = await page.evaluateHandle(
  ([name, b64, type]) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
    const file = new File([bytes], name, { type })
    const dt = new DataTransfer()
    dt.items.add(file)
    return dt
  },
  ["alpha.png", buf.toString("base64"), "image/png"],
)
await page.locator("main").dispatchEvent("drop", { dataTransfer })
await page.waitForTimeout(1500)
const state = await page.evaluate(() => ({
  names: Array.from(document.querySelectorAll("main p, main span, main div")).map((e) => (e.textContent || "").trim()).filter((t) => /alpha|dropped|Files Ready|PNG|image/i.test(t)).slice(0, 14),
  inputValue: (document.querySelector('input[type="file"]') || {}).value,
}))
console.log(JSON.stringify(state, null, 2))
await browser.close()

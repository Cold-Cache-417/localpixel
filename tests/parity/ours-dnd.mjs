import { chromium } from "playwright"
import fs from "node:fs"
import path from "node:path"

const BASE = "http://localhost:4173"
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
  hasAlpha: document.body.innerText.includes("alpha.png"),
  dropzoneText: !!document.querySelector("main"),
  text: (document.querySelector("main")?.innerText || "").slice(0, 220),
}))
console.log(JSON.stringify(state, null, 2))
await browser.close()

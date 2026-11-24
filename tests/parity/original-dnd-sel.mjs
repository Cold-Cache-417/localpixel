import { chromium } from "playwright"
import path from "node:path"

const BASE = "https://localconvert.ai.studio"
const FIX = path.resolve("tests/fixtures")
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } })
await page.goto(`${BASE}/compress-image`, { waitUntil: "networkidle" })
await page.waitForTimeout(900)
const candidates = await page.evaluate(() => {
  const out = []
  for (const el of Array.from(document.querySelectorAll("div, section, main, form"))) {
    const cls = el.className && typeof el.className === "string" ? el.className : ""
    if (/drop|drag|dashed|upload|file/i.test(cls)) {
      const r = el.getBoundingClientRect()
      if (r.width > 80 && r.height > 40) out.push({ tag: el.tagName, cls, rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } })
    }
  }
  return out.slice(0, 12)
})
console.log(JSON.stringify(candidates, null, 2))
await browser.close()

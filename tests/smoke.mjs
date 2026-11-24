import { chromium } from "playwright"
import fs from "node:fs"
import path from "node:path"

const BASE = "http://localhost:4173"
const out = path.resolve("tests/out")
fs.mkdirSync(out, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const errors = []
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text())
})
page.on("pageerror", (err) => errors.push(String(err)))

await page.goto(BASE, { waitUntil: "networkidle" })
await page.screenshot({ path: path.join(out, "home.png"), fullPage: false })
console.log("title:", await page.title())
console.log("h1:", await page.locator("h1").first().innerText())
console.log("tool links:", await page.locator('a[href^="/"]').count())
console.log("console errors:", errors)
await page.goto(`${BASE}/compress-image`, { waitUntil: "networkidle" })
await page.screenshot({ path: path.join(out, "compress.png"), fullPage: false })
console.log("h1 compress:", await page.locator("h1").innerText())
await browser.close()

import { chromium } from "playwright"
import fs from "node:fs"
import path from "node:path"

const BASE = "http://localhost:4173"
const FIX = path.resolve("tests/fixtures")
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } })
await page.goto(`${BASE}/png-to-webp`, { waitUntil: "networkidle" })
await page.waitForTimeout(800)
console.log("PNG2WEBP slider min/max:", await page.locator('input[type="range"]').first().getAttribute("min"), await page.locator('input[type="range"]').first().getAttribute("max"), "value:", await page.locator('input[type="range"]').first().inputValue())
await page.goto(`${BASE}/image-converter`, { waitUntil: "networkidle" })
await page.waitForTimeout(900)
const range = page.locator('input[type="range"]').first()
console.log("CONVERTER slider min/max/value:", await range.getAttribute("min"), await range.getAttribute("max"), await range.inputValue())

await page.goto(`${BASE}/compress-image`, { waitUntil: "networkidle" })
await page.locator('input[type="file"]').first().setInputFiles([path.join(FIX, "sample-exif.jpg")])
await page.waitForTimeout(2200)
await page.getByRole("radio", { name: "800" }).first().click()
await page.getByRole("button", { name: /Compress files/ }).click()
await page.waitForTimeout(7000)
const meta = await page.locator("main").innerText()
console.log("COMPRESS after maxHeight=800, has 800:", /800 ×/.test(meta), "| running done")
await browser.close()

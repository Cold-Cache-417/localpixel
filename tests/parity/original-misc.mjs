import { chromium } from "playwright"
import fs from "node:fs"
import path from "node:path"

const BASE = "https://localconvert.ai.studio"
const FIX = path.resolve("tests/fixtures")
const out = path.resolve("tests/parity/evidence")
const browser = await chromium.launch()

async function mobileCheck(page, slug) {
  await page.goto(`${BASE}/${slug}`, { waitUntil: "networkidle" })
  await page.waitForTimeout(900)
  const overflow = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    iw: window.innerWidth,
    overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
  }))
  await page.screenshot({ path: path.join(out, `mobile-${slug}.png`), fullPage: false })
  return overflow
}
async function desktopCheck(page, slug) {
  await page.goto(`${BASE}/${slug}`, { waitUntil: "networkidle" })
  await page.waitForTimeout(900)
  const overflow = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    iw: window.innerWidth,
    overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
  }))
  await page.screenshot({ path: path.join(out, `desktop-${slug}.png`), fullPage: true })
  return overflow
}

const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
for (const slug of ["compress-image", "meme-cropper", "pdf-to-word", "qr-generator"]) {
  console.log("mobile", slug, JSON.stringify(await mobileCheck(page, slug)))
}
console.log("mobile home:", JSON.stringify(await mobileCheck(page, "compress-image")))

const page2 = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
for (const slug of ["compress-image", "meme-cropper", "pdf-to-word", "qr-generator"]) {
  console.log("desktop", slug, JSON.stringify(await desktopCheck(page2, slug)))
}

await page2.goto(`${BASE}/exif-remover`, { waitUntil: "networkidle" })
await page2.locator('input[type="file"]').first().setInputFiles(path.join(FIX, "sample-exif.jpg"))
await page2.waitForTimeout(3000)
const [dl] = await Promise.all([
  page2.waitForEvent("download", { timeout: 40000 }),
  page2.getByRole("button", { name: /Download Clean Copy/ }).click(),
])
await dl.saveAs(path.join(out, "original-clean-copy.jpg"))
console.log("clean copy saved", dl.suggestedFilename())

await page2.goto(`${BASE}/compress-image`, { waitUntil: "networkidle" })
await page2.locator('input[type="file"]').first().setInputFiles(path.join(FIX, "broken.jpg"))
await page2.waitForTimeout(2500)
console.log("broken file text:", (await page2.locator("main").innerText()).slice(0, 700))
console.log("broken console errors:", await page2.locator("main").innerText().then(() => "ok"))
await browser.close()

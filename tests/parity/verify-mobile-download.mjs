import { chromium } from "playwright"
import fs from "node:fs"
import path from "node:path"
import JSZip from "jszip"

const BASE = "https://localpixel.vercel.app"
const FIX = path.resolve("tests/fixtures")
const browser = await chromium.launch()

async function probe(label, viewport) {
  const page = await browser.newPage({ viewport })
  await page.goto(`${BASE}/compress-image`, { waitUntil: "networkidle" })
  await page.locator('input[type="file"]').first().setInputFiles([
    path.join(FIX, "sample-exif.jpg"),
    path.join(FIX, "sample.png"),
  ])
  await page.waitForTimeout(3200)
  await page.getByRole("button", { name: /Compress files/ }).click()
  await page.waitForTimeout(6000)
  const zipBtn = page.getByRole("button", { name: /Download ZIP/ })
  const visible = await zipBtn.isVisible().catch(() => false)
  const box = visible ? await zipBtn.boundingBox() : null
  const inViewport = box
    ? box.y + box.height <= viewport.height && box.x >= 0 && box.x + box.width <= viewport.width
    : null
  // per-row download buttons
  const rowBtns = await page.locator('button[aria-label^="Download sample"]').count()
  const rowVisible = await page
    .locator('button[aria-label^="Download sample"]')
    .first()
    .isVisible()
    .catch(() => false)
  let rowBox = null
  if (rowVisible) rowBox = await page.locator('button[aria-label^="Download sample"]').first().boundingBox()
  const rowInVp = rowBox ? rowBox.y + rowBox.height <= viewport.height : null
  let dlInfo = null
  if (rowVisible) {
    const [dl] = await Promise.all([
      page.waitForEvent("download", { timeout: 90000 }),
      page.locator('button[aria-label^="Download sample"]').first().click(),
    ])
    dlInfo = { file: dl.suggestedFilename(), size: fs.statSync(await dl.path()).size }
  }
  const info = { label, visible, box, inViewport, rowBtns, rowVisible, rowBox, rowInViewport: rowInVp, dlInfo }
  await page.close()
  return info
}

const mobile = await probe("mobile-390", { width: 390, height: 844 })
const laptop = await probe("laptop-1440", { width: 1440, height: 900 })
console.log("MOBILE PROBE:", JSON.stringify(mobile, null, 1))
console.log("LAPTOP PROBE:", JSON.stringify(laptop, null, 1))
await browser.close()

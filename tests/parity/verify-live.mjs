import { chromium } from "playwright"
import fs from "node:fs"
import path from "node:path"
import JSZip from "jszip"

const BASE = "https://localpixel.vercel.app"
const FIX = path.resolve("tests/fixtures")
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } })
const errors = []
const failed = []
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text())
})
page.on("pageerror", (e) => errors.push(String(e)))
page.on("requestfailed", (r) => failed.push(`${r.url()} :: ${r.failure()?.errorText}`))

async function check(name, fn) {
  try {
    const r = await fn()
    console.log(`PASS ${name}`, JSON.stringify(r))
    return r
  } catch (e) {
    console.log(`FAIL ${name}`, String(e))
    process.exitCode = 1
  }
}

await check("live-home", async () => {
  await page.goto(BASE, { waitUntil: "networkidle" })
  const title = await page.title()
  const h1 = await page.locator("h1").first().innerText()
  const links = await page.locator('a[href^="/"]').count()
  return { title, h1, toolLinks: links }
})

const toolRoutes = [
  "/compress-image",
  "/image-converter",
  "/png-to-webp",
  "/exif-remover",
  "/qr-generator",
  "/meme-cropper",
  "/pdf-to-word",
  "/images-to-pdf",
  "/merge-pdf",
  "/pdf-to-images",
]
for (const r of toolRoutes) {
  await check(`live-route ${r}`, async () => {
    await page.goto(`${BASE}${r}`, { waitUntil: "networkidle" })
    await page.waitForTimeout(900)
    const h1 = await page.locator("h1").first().innerText().catch(() => "")
    const bodyText = (await page.locator("main").innerText().catch(() => "")).slice(0, 80)
    return { h1, bodyText }
  })
}

await check("live-compress-real-file", async () => {
  await page.goto(`${BASE}/compress-image`, { waitUntil: "networkidle" })
  await page.locator('input[type="file"]').first().setInputFiles([
    path.join(FIX, "sample-exif.jpg"),
    path.join(FIX, "sample.png"),
  ])
  await page.waitForTimeout(3200)
  await page.getByRole("button", { name: /Compress files/ }).click()
  const [dl] = await Promise.all([
    page.waitForEvent("download", { timeout: 90000 }),
    page.getByRole("button", { name: /Download ZIP/ }).click(),
  ])
  const p = "/tmp/live-compressed.zip"
  await dl.saveAs(p)
  const buf = fs.readFileSync(p)
  const isZip = buf[0] === 0x50 && buf[1] === 0x4b
  const zip = await JSZip.loadAsync(buf)
  const entries = Object.keys(zip.files).filter((n) => !zip.files[n].dir)
  return { file: dl.suggestedFilename(), size: buf.length, isZip, entries }
})

await check("live-mobile-no-h-overflow", async () => {
  const mob = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await mob.goto(`${BASE}/`, { waitUntil: "networkidle" })
  const overflowHome = await mob.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  )
  await mob.goto(`${BASE}/compress-image`, { waitUntil: "networkidle" })
  const overflowTool = await mob.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  )
  await mob.goto(`${BASE}/meme-cropper`, { waitUntil: "networkidle" })
  const overflowMeme = await mob.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  )
  await mob.close()
  return { overflowHome, overflowTool, overflowMeme }
})

await check("live-console-errors", async () => {
  const real = errors.filter((e) => !/Download the React DevTools|favicon/i.test(e))
  return { errors: real.length, sample: real.slice(0, 5) }
})
await check("live-failed-requests", async () => {
  return { count: failed.length, sample: failed.slice(0, 10) }
})

await browser.close()
console.log("LIVE_ERRORS", JSON.stringify(errors.filter((e) => !/Download the React DevTools|favicon/i.test(e))))
console.log("LIVE_FAILED", JSON.stringify(failed))
if (process.exitCode) process.exit(1)

import { chromium } from "playwright"
import fs from "node:fs"
import path from "node:path"

const BASE = "https://localconvert.ai.studio"
const FIX = path.resolve("tests/fixtures")
const out = path.resolve("tests/parity/evidence")
fs.mkdirSync(out, { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } })
await page.goto(`${BASE}/meme-cropper`, { waitUntil: "networkidle" })
await page.locator('input[type="file"]').first().setInputFiles(path.join(FIX, "sample.jpg"))
await page.waitForTimeout(2200)

const readout = async () => (await page.locator("text=/\\d+ × \\d+ px/").first().innerText()).replace(/\s+/g, " ")
console.log("initial:", await readout())
const box = await page.locator("canvas").first().boundingBox()
console.log("canvas:", box)
await page.getByRole("button", { name: /4:5/ }).click()
await page.waitForTimeout(600)
console.log("after 4:5:", await readout())
await page.screenshot({ path: path.join(out, "meme-4x5-empty.png") })

await page.getByPlaceholder("Optional top text…").fill("LOCAL PIXEL")
await page.getByPlaceholder("Optional bottom text…").fill("parity check 2026")
await page.waitForTimeout(800)
await page.screenshot({ path: path.join(out, "meme-with-captions.png") })

for (const [label, name] of [["png", /Download PNG/], ["jpg", /Download JPG/]]) {
  const [dl] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name }).first().click(),
  ])
  const target = path.join(out, `original-meme-4x5.${label}`)
  await dl.saveAs(target)
  console.log("download:", label, dl.suggestedFilename(), fs.statSync(target).size)
}
console.log("readout-after:", await readout())
await browser.close()

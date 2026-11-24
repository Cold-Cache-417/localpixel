import { chromium } from "playwright"
import fs from "node:fs"
import path from "node:path"

const BASE = "https://localconvert.ai.studio"
const FIX = path.resolve("tests/fixtures")
const dir = path.resolve("tests/parity/evidence")
fs.mkdirSync(dir, { recursive: true })

const jobs = [
  { slug: "compress-image", files: ["sample-exif.jpg", "sample.png"], wait: 2500 },
  { slug: "image-converter", files: ["alpha.png", "alpha.gif", "vector.svg"], wait: 2000 },
  { slug: "png-to-webp", files: ["alpha.png"], wait: 1800 },
  { slug: "exif-remover", files: ["sample-exif.jpg"], wait: 2500 },
  { slug: "meme-cropper", files: ["sample.jpg"], wait: 2500 },
  { slug: "pdf-to-word", files: ["doc-3pages.pdf"], wait: 3500 },
  { slug: "images-to-pdf", files: ["sample.jpg", "alpha.png", "alpha.bmp"], wait: 2000 },
  { slug: "merge-pdf", files: ["doc-3pages.pdf", "second-2pages.pdf"], wait: 2500 },
  { slug: "pdf-to-images", files: ["doc-3pages.pdf"], wait: 3000 },
]

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } })
const consoleErrors = []
page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()))
page.on("pageerror", (e) => consoleErrors.push(String(e)))

for (const job of jobs) {
  await page.goto(`${BASE}/${job.slug}`, { waitUntil: "networkidle" })
  await page.waitForTimeout(700)
  const input = page.locator('input[type="file"]').first()
  await input.setInputFiles(job.files.map((f) => path.join(FIX, f)))
  await page.waitForTimeout(job.wait)
  await page.screenshot({ path: path.join(dir, `uploaded-${job.slug}.png`), fullPage: true })

  const info = await page.evaluate(() => {
    const text = (el) => (el.textContent || "").trim().replace(/\s+/g, " ")
    const visible = (el) => {
      const rect = el.getBoundingClientRect()
      return rect.width > 0 && rect.height > 0
    }
    return {
      buttons: Array.from(document.querySelectorAll("button"))
        .filter(visible)
        .map((el) => ({ text: text(el).slice(0, 80), aria: el.getAttribute("aria-label"), disabled: el.disabled })),
      inputs: Array.from(document.querySelectorAll("input"))
        .filter((el) => el.type !== "file")
        .map((el) => ({
          type: el.type,
          value: el.value,
          min: el.min,
          max: el.max,
          step: el.step,
          placeholder: el.placeholder,
          aria: el.getAttribute("aria-label"),
          visible: visible(el),
        })),
      textareas: Array.from(document.querySelectorAll("textarea")).map((el) => ({
        value: el.value.slice(0, 400),
        length: el.value.length,
        placeholder: el.placeholder,
        rows: el.rows,
      })),
      canvases: Array.from(document.querySelectorAll("canvas")).map((el) => ({
        width: el.width,
        height: el.height,
        css: `${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`,
      })),
      images: Array.from(document.querySelectorAll("img")).map((el) => ({
        src: el.src.slice(0, 80),
        alt: el.alt,
        w: el.naturalWidth,
        h: el.naturalHeight,
      })),
      visibleText: Array.from(document.querySelectorAll("main *"))
        .filter((el) => el.children.length === 0 && visible(el) && text(el))
        .map((el) => text(el))
        .slice(0, 120),
    }
  })
  fs.writeFileSync(path.join(dir, `uploaded-${job.slug}.json`), JSON.stringify(info, null, 2))
  console.log(`\n===== ${job.slug} after upload =====`)
  console.log("BUTTONS:", info.buttons.map((b) => `${b.text}${b.disabled ? " [disabled]" : ""}`).join(" | "))
  console.log("INPUTS:", JSON.stringify(info.inputs.filter((i) => i.visible)))
  console.log("TEXTAREAS:", JSON.stringify(info.textareas))
  console.log("CANVASES:", JSON.stringify(info.canvases))
  console.log("IMAGES:", JSON.stringify(info.images.slice(0, 6)))
  console.log("TEXT:", info.visibleText.slice(0, 60).join(" / "))
}

console.log("\nCONSOLE ERRORS:", consoleErrors)
await browser.close()

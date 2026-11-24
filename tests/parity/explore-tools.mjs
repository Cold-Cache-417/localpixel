import { chromium } from "playwright"
import fs from "node:fs"
import path from "node:path"

const BASE = "https://localconvert.ai.studio"
const dir = path.resolve("tests/parity/evidence")
fs.mkdirSync(dir, { recursive: true })

const routes = [
  "compress-image",
  "image-converter",
  "png-to-webp",
  "exif-remover",
  "qr-generator",
  "meme-cropper",
  "pdf-to-word",
  "images-to-pdf",
  "merge-pdf",
  "pdf-to-images",
]

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const consoleErrors = []
page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()))
page.on("pageerror", (e) => consoleErrors.push(String(e)))

for (const slug of routes) {
  await page.goto(`${BASE}/${slug}`, { waitUntil: "networkidle" })
  await page.waitForTimeout(900)
  await page.screenshot({ path: path.join(dir, `original-${slug}.png`), fullPage: true })
  fs.writeFileSync(path.join(dir, `original-${slug}.html`), await page.content())

  const info = await page.evaluate(() => {
    const text = (el) => (el.textContent || "").trim().replace(/\s+/g, " ")
    const inputs = Array.from(document.querySelectorAll("input")).map((el) => ({
      type: el.type,
      accept: el.accept,
      id: el.id,
      name: el.name,
      placeholder: el.placeholder,
      ariaLabel: el.getAttribute("aria-label"),
      min: el.min,
      max: el.max,
      step: el.step,
      value: el.type === "file" ? "" : el.value,
      hidden: el.offsetParent === null && el.type !== "file",
      disabled: el.disabled,
    }))
    const selects = Array.from(document.querySelectorAll("select")).map((el) => ({
      id: el.id,
      value: el.value,
      options: Array.from(el.options).map((o) => ({ value: o.value, label: o.textContent?.trim() })),
    }))
    const buttons = Array.from(document.querySelectorAll("button")).map((el) => ({
      text: text(el).slice(0, 100),
      ariaLabel: el.getAttribute("aria-label"),
      disabled: el.disabled,
      type: el.type,
    }))
    const ranges = Array.from(document.querySelectorAll('input[type="range"]')).map((el) => ({
      min: el.min,
      max: el.max,
      step: el.step,
      value: el.value,
      label: el.closest("div")?.querySelector("label")?.textContent?.trim(),
      ariaLabel: el.getAttribute("aria-label"),
    }))
    const labels = Array.from(document.querySelectorAll("label")).map((el) => text(el).slice(0, 120))
    const main = document.querySelector("main") || document.querySelector("#root")
    return {
      title: document.title,
      h1: Array.from(document.querySelectorAll("h1")).map(text),
      h2: Array.from(document.querySelectorAll("h2")).map(text),
      h3: Array.from(document.querySelectorAll("h3")).map(text).slice(0, 20),
      inputs,
      selects,
      buttons,
      ranges,
      labels,
      mainText: main ? text(main).slice(0, 4000) : "",
      bodyText: text(document.body).slice(0, 6000),
    }
  })

  const aria = await page.locator("main").ariaSnapshot().catch(async () => page.locator("body").ariaSnapshot())
  fs.writeFileSync(path.join(dir, `original-${slug}.aria.txt`), aria)
  fs.writeFileSync(path.join(dir, `original-${slug}.json`), JSON.stringify(info, null, 2))

  console.log(`\n===== ${slug} =====`)
  console.log("H1:", info.h1)
  console.log("H2:", info.h2)
  console.log("INPUTS:", info.inputs.map((i) => `${i.type}${i.accept ? `[${i.accept}]` : ""}${i.placeholder ? ` "${i.placeholder}"` : ""}`).join(" | "))
  console.log("RANGES:", JSON.stringify(info.ranges))
  console.log("SELECTS:", JSON.stringify(info.selects))
  console.log("BUTTONS:", info.buttons.map((b) => b.text || b.ariaLabel).join(" | "))
  console.log("MAIN:", info.mainText.slice(0, 1200))
}

console.log("\nCONSOLE ERRORS:", consoleErrors)
await browser.close()

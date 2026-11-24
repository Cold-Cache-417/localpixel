import { chromium } from "playwright"
import fs from "node:fs"
import path from "node:path"

const BASE = "https://localconvert.ai.studio/"
const dir = path.resolve("tests/parity/evidence")
fs.mkdirSync(dir, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const consoleErrors = []
page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()))
page.on("pageerror", (e) => consoleErrors.push(String(e)))

await page.goto(BASE, { waitUntil: "networkidle" })
await page.waitForTimeout(1200)
await page.screenshot({ path: path.join(dir, "original-home-desktop.png"), fullPage: true })

const links = await page.locator("a[href]").evaluateAll((els) =>
  els.map((el) => ({ href: el.getAttribute("href"), text: (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 80) })),
)
const unique = []
const seen = new Set()
for (const link of links) {
  const key = link.href
  if (!key || seen.has(key)) continue
  seen.add(key)
  unique.push(link)
}

const data = {
  title: await page.title(),
  h1: await page.locator("h1").allInnerTexts(),
  h2: await page.locator("h2").allInnerTexts(),
  navText: await page.locator("header, nav").first().innerText().catch(() => ""),
  links: unique,
  buttons: await page.getByRole("button").allInnerTexts(),
  consoleErrors,
  aria: (await page.locator("body").ariaSnapshot()).slice(0, 20000),
}
fs.writeFileSync(path.join(dir, "original-home.json"), JSON.stringify(data, null, 2))
console.log("TITLE:", data.title)
console.log("H1:", data.h1)
console.log("H2:", data.h2)
console.log("LINKS:")
for (const link of unique) console.log(" ", link.href, "|", link.text)
console.log("BUTTONS:", data.buttons)
console.log("CONSOLE ERRORS:", consoleErrors)
await browser.close()

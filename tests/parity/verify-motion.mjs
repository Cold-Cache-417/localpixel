import { chromium } from "playwright"

const BASE = "http://localhost:4173"

async function run(label, contextOptions) {
  const browser = await chromium.launch()
  const context = await browser.newContext(contextOptions)
  const page = await context.newPage({ viewport: { width: 1440, height: 900 } })
  const errors = []
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text())
  })
  page.on("pageerror", (e) => errors.push(String(e)))
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" })
  await page.waitForTimeout(1800)
  const h1 = await page.locator("h1").first().innerText()
  const heroVisible = await page.locator("h1").first().isVisible()

  // press the primary CTA (now a Motion button with whileTap)
  const pressed = await page.evaluate(async () => {
    const btns = Array.from(document.querySelectorAll("button")).filter((b) => b.textContent?.includes("Open the desk"))
    const el = btns[0]
    if (!el) return { found: false }
    el.scrollIntoView({ block: "center" })
    el.click()
    return { found: true }
  })

  // go to compress and press a segmented control (now Motion radiobutton)
  await page.goto(`${BASE}/compress-image`, { waitUntil: "networkidle" })
  await page.waitForTimeout(1200)
  const seg = page.getByRole("radiogroup", { name: /output format/i })
  const segFound = await seg.count()

  await page.close()
  await browser.close()
  console.log(
    JSON.stringify({ label, h1: h1.slice(0, 20), heroVisible, pressed, segFound, errors }),
  )
  if (errors.length) process.exitCode = 1
}

await run("normal", { reducedMotion: "no-preference" })
await run("reduced", { reducedMotion: "reduce" })

import { chromium } from "playwright"
import fs from "node:fs"
import path from "node:path"
import JSZip from "jszip"

const BASE = "http://localhost:4173"
const FIX = path.resolve("tests/fixtures")
const out = path.resolve("tests/parity/evidence")
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } })
await page.goto(`${BASE}/pdf-to-word`, { waitUntil: "networkidle" })
await page.locator('input[type="file"]').first().setInputFiles(path.join(FIX, "doc-3pages.pdf"))
await page.waitForTimeout(3600)
await page.locator("textarea").fill("Edited paragraph alpha\n\n---\n\nEdited paragraph beta")
await page.getByRole("button", { name: /Build DOCX/ }).click()
await page.waitForTimeout(6000)
const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 60000 }), page.getByRole("button", { name: /Download DOCX/ }).click()])
await dl.saveAs(path.join(out, "ours-pdf-to-word.docx"))
await browser.close()
const zip = await JSZip.loadAsync(fs.readFileSync(path.join(out, "ours-pdf-to-word.docx")))
const xml = await zip.file("word/document.xml").async("string")
console.log("OURS docx entries ok:", !!zip.file("word/document.xml"))
console.log("OURS docx Edit A:", xml.includes("Edited paragraph alpha"), "Edit B:", xml.includes("Edited paragraph beta"))
console.log("OURS docx page breaks:", (xml.match(/w:type="page"/g) || []).length)

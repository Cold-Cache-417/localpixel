import type { PDFDocumentProxy } from "pdfjs-dist"

export async function extractPdfText(pdf: PDFDocumentProxy): Promise<string[]> {
  const pages: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const items = content.items as Array<{ str?: string; transform?: number[] }>
    let text = ""
    let lastY: number | null = null
    for (const item of items) {
      if (!item.str) continue
      const y = item.transform?.[5] ?? null
      if (lastY !== null && y !== null && Math.abs(y - lastY) > 2) text += "\n"
      text += item.str
      lastY = y
    }
    pages.push(text.replace(/[ \t]+\n/g, "\n").trim())
  }
  return pages
}

export function parseRanges(input: string, max: number): number[] {
  const out = new Set<number>()
  const parts = input.split(",").map((p) => p.trim()).filter(Boolean)
  for (const part of parts) {
    const m = part.match(/^(\d+)\s*-\s*(\d+)$/)
    if (m) {
      const a = Math.max(1, Math.min(max, Number(m[1])))
      const b = Math.max(1, Math.min(max, Number(m[2])))
      for (let i = Math.min(a, b); i <= Math.max(a, b); i++) out.add(i)
    } else if (/^\d+$/.test(part)) {
      const n = Number(part)
      if (n >= 1 && n <= max) out.add(n)
    }
  }
  return [...out].sort((a, b) => a - b)
}

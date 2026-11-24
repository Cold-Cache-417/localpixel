import { Document, HeadingLevel, PageBreak, Packer, Paragraph, TextRun } from "docx"

export interface DocxOptions {
  pageBreaks?: boolean
  title?: string
}

export async function textToDocx(pages: string[], options: DocxOptions = {}): Promise<Blob> {
  const { pageBreaks = true, title = "Converted document" } = options
  const children: Paragraph[] = [
    new Paragraph({
      text: title,
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 240 },
    }),
  ]

  pages.forEach((pageText, index) => {
    if (pageText.trim()) {
      const blocks = pageText.split(/\n{2,}/)
      blocks.forEach((block) => {
        const lines = block.split("\n").filter((line, i, arr) => line.trim() || i < arr.length - 1)
        if (!lines.length) return
        children.push(
          new Paragraph({
            spacing: { after: 140 },
            children: lines.flatMap((line, i) => [
              new TextRun({ text: line, size: 22 }),
              ...(i < lines.length - 1 ? [new TextRun({ break: 1 })] : []),
            ]),
          }),
        )
      })
    }

    if (index < pages.length - 1) {
      children.push(
        pageBreaks
          ? new Paragraph({ children: [new PageBreak()] })
          : new Paragraph({ spacing: { before: 120, after: 120 } }),
      )
    }
  })

  const doc = new Document({
    creator: "Localpixel",
    title,
    description: "Text extracted locally in the browser",
    sections: [{ children }],
  })
  return Packer.toBlob(doc)
}

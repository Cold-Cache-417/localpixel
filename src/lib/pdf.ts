import * as pdfjs from "pdfjs-dist"
import type { PDFDocumentProxy, PDFDocumentLoadingTask } from "pdfjs-dist"
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url"

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

export type { PDFDocumentProxy }

const tasks = new WeakMap<PDFDocumentProxy, PDFDocumentLoadingTask>()

export async function loadPdf(file: File): Promise<PDFDocumentProxy> {
  const data = new Uint8Array(await file.arrayBuffer())
  const task = pdfjs.getDocument({ data })
  try {
    const doc = await task.promise
    tasks.set(doc, task)
    return doc
  } catch (err) {
    const name = err instanceof Error ? err.name : ""
    if (name === "PasswordException") {
      throw new Error("This PDF is password-protected. Unlock it first, then try again.")
    }
    throw new Error("This file could not be read as a valid PDF.")
  }
}

/** Terminates the worker that owns this document. */
export function releasePdf(doc: PDFDocumentProxy | null | undefined) {
  if (!doc) return
  const task = tasks.get(doc)
  tasks.delete(doc)
  void task?.destroy()
}

export async function renderPageToCanvas(
  pdf: PDFDocumentProxy,
  pageNumber: number,
  scale = 2,
): Promise<HTMLCanvasElement> {
  const page = await pdf.getPage(pageNumber)
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement("canvas")
  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)
  const ctx = canvas.getContext("2d")!
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  await page.render({ canvas, viewport }).promise
  return canvas
}

import fs from "node:fs"
import path from "node:path"
import JSZip from "jszip"
import { PDFDocument } from "pdf-lib"
import { imageSize } from "image-size"

const out = path.resolve("tests/parity/evidence")
const read = (f) => fs.readFileSync(path.join(out, f))

const docx = await JSZip.loadAsync(read("original-pdf-to-word.docx"))
const xml = await docx.file("word/document.xml").async("string")
console.log("DOCX entries:", Object.keys(docx.files).filter((f) => !docx.files[f].dir).slice(0, 12))
console.log("DOCX page breaks:", (xml.match(/w:type="page"/g) || []).length, "paras:", (xml.match(/<w:p[ >]/g) || []).length)
for (const t of ["Quarterly Field Report", "Landscape Chart Notes", "Letter Notes"]) console.log("DOCX has", t, xml.includes(t))

async function pdfInfo(file) {
  const doc = await PDFDocument.load(read(file))
  return { pages: doc.getPageCount(), sizes: doc.getPages().map((p) => { const s = p.getSize(); return `${s.width.toFixed(1)}x${s.height.toFixed(1)}` }) }
}
console.log("images-to-pdf:", await pdfInfo("original-images-to-pdf.pdf"))
console.log("merged:", await pdfInfo("original-merged.pdf"))
console.log("split 2-3:", await pdfInfo("original-split-2-3.pdf"))

const zip = await JSZip.loadAsync(read("original-split-all.zip"))
const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir)
console.log("split zip:", names)
for (const name of names) {
  const doc = await PDFDocument.load(await zip.file(name).async("nodebuffer"))
  console.log("  ", name, doc.getPageCount(), "pages")
}

const imgZip = await JSZip.loadAsync(read("original-pdf-images.zip"))
const imgs = Object.keys(imgZip.files).filter((n) => !imgZip.files[n].dir)
console.log("pdf-images zip:", imgs)
for (const name of imgs) {
  const buf = await imgZip.file(name).async("nodebuffer")
  const size = imageSize(buf)
  console.log("  ", name, `${size.width}x${size.height}`, size.type, buf.length)
}

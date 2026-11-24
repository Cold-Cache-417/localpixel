import {
  Combine,
  Crop,
  FileImage,
  FileText,
  Files,
  Images,
  Minimize2,
  QrCode,
  Repeat2,
  ScanEye,
  type LucideIcon,
} from "lucide-react"

export type ToolGroup = "images" | "pdf" | "create"

export interface ToolMeta {
  slug: string
  name: string
  navName: string
  blurb: string
  group: ToolGroup
  icon: LucideIcon
  input: string
  output: string
  number: string
  tags: string[]
}

export const TOOLS: ToolMeta[] = [
  {
    slug: "compress-image",
    name: "Bulk Image Compressor",
    navName: "Compress",
    blurb: "Shrink JPEG, PNG and WebP files to a target quality or width — in batches.",
    group: "images",
    icon: Minimize2,
    input: "JPG · PNG · WebP · AVIF",
    output: "Same format",
    number: "01",
    tags: ["batch", "quality", "resize"],
  },
  {
    slug: "image-converter",
    name: "Universal Image Converter",
    navName: "Convert",
    blurb: "Move between PNG, JPEG, WebP, GIF, BMP and SVG without a server.",
    group: "images",
    icon: Repeat2,
    input: "8 image types",
    output: "PNG · JPG · WebP · GIF · BMP · SVG",
    number: "02",
    tags: ["format", "transparent", "batch"],
  },
  {
    slug: "png-to-webp",
    name: "PNG to WebP",
    navName: "PNG → WebP",
    blurb: "A focused one-way converter tuned for transparency and small page weight.",
    group: "images",
    icon: FileImage,
    input: "PNG",
    output: "WebP",
    number: "03",
    tags: ["webp", "alpha", "quality"],
  },
  {
    slug: "exif-remover",
    name: "EXIF Remover",
    navName: "Strip EXIF",
    blurb: "See exactly what your camera recorded, then export a clean copy.",
    group: "images",
    icon: ScanEye,
    input: "JPEG · PNG · WebP · HEIC",
    output: "Clean JPEG",
    number: "04",
    tags: ["privacy", "gps", "metadata"],
  },
  {
    slug: "meme-cropper",
    name: "Meme Cropper",
    navName: "Crop",
    blurb: "Drag a frame, lock an aspect, export a pixel-perfect crop.",
    group: "images",
    icon: Crop,
    input: "JPG · PNG · WebP",
    output: "PNG",
    number: "05",
    tags: ["crop", "aspect", "social"],
  },
  {
    slug: "qr-generator",
    name: "QR Generator",
    navName: "QR code",
    blurb: "Type a link, tune the error correction, drop in a logo, download a crisp PNG.",
    group: "create",
    icon: QrCode,
    input: "Text · URL · Logo",
    output: "PNG",
    number: "06",
    tags: ["qr", "logo", "hd"],
  },
  {
    slug: "pdf-to-word",
    name: "PDF to Word",
    navName: "PDF → Word",
    blurb: "Pull the text layer out of a PDF into an editable .docx document.",
    group: "pdf",
    icon: FileText,
    input: "PDF",
    output: "DOCX",
    number: "07",
    tags: ["text", "docx", "editable"],
  },
  {
    slug: "images-to-pdf",
    name: "Images to PDF",
    navName: "Images → PDF",
    blurb: "Order your images, choose a page size and margin, get one tidy document.",
    group: "pdf",
    icon: Images,
    input: "JPG · PNG · WebP",
    output: "PDF",
    number: "08",
    tags: ["pdf", "reorder", "a4"],
  },
  {
    slug: "merge-pdf",
    name: "Merge & Split PDF",
    navName: "Merge / Split",
    blurb: "Combine documents in order, or extract just the pages you need.",
    group: "pdf",
    icon: Combine,
    input: "PDF × n",
    output: "PDF",
    number: "09",
    tags: ["merge", "split", "pages"],
  },
  {
    slug: "pdf-to-images",
    name: "PDF to Images",
    navName: "PDF → Images",
    blurb: "Render every page to PNG or JPEG at the resolution you pick.",
    group: "pdf",
    icon: Files,
    input: "PDF",
    output: "PNG · JPG · ZIP",
    number: "10",
    tags: ["render", "png", "zip"],
  },
]

export const TOOL_GROUPS: { id: ToolGroup; label: string; note: string }[] = [
  { id: "images", label: "Image desk", note: "Compress, convert, crop, clean" },
  { id: "pdf", label: "Document desk", note: "Read, build, merge, render" },
  { id: "create", label: "Output desk", note: "Codes and exports" },
]

export function toolBySlug(slug: string) {
  return TOOLS.find((tool) => tool.slug === slug)
}

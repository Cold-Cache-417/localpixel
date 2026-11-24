import JSZip from "jszip"

export interface ZipEntry {
  name: string
  blob: Blob
}

export async function makeZip(entries: ZipEntry[]): Promise<Blob> {
  const zip = new JSZip()
  const used = new Map<string, number>()
  for (const entry of entries) {
    let name = entry.name
    const count = used.get(name) ?? 0
    if (count > 0) {
      const dot = name.lastIndexOf(".")
      name = dot > 0
        ? `${name.slice(0, dot)}-${count + 1}${name.slice(dot)}`
        : `${name}-${count + 1}`
    }
    used.set(entry.name, count + 1)
    zip.file(name, entry.blob)
  }
  return zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } })
}

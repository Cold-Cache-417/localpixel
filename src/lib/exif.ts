import * as exifr from "exifr"

export interface ExifTag {
  key: string
  label: string
  value: string
  sensitive: boolean
}

const LABELS: Record<string, string> = {
  Make: "Camera make",
  Model: "Camera model",
  LensModel: "Lens",
  Software: "Software",
  DateTimeOriginal: "Captured",
  CreateDate: "Created",
  ModifyDate: "Modified",
  BodySerialNumber: "Body serial",
  Artist: "Artist",
  Copyright: "Copyright",
  latitude: "Latitude",
  longitude: "Longitude",
  GPSLatitude: "GPS latitude",
  GPSLongitude: "GPS longitude",
  GPSLatitudeRef: "Latitude ref",
  GPSLongitudeRef: "Longitude ref",
  GPSAltitude: "GPS altitude",
  Orientation: "Orientation",
  ExposureTime: "Exposure",
  FNumber: "Aperture",
  ISO: "ISO",
  FocalLength: "Focal length",
  ColorSpace: "Color space",
}

const SENSITIVE = /gps|latitude|longitude|serial|artist|copyright|make|model|software|lens/i

function displayValue(value: unknown): string {
  if (value == null) return "—"
  if (value instanceof Date) return value.toLocaleString()
  if (Array.isArray(value)) return value.join(", ")
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}

export interface ExifResult {
  tags: ExifTag[]
  gps: { latitude: number; longitude: number } | null
  orientation: number
}

export async function readExif(file: File): Promise<ExifResult> {
  let parsed: Record<string, unknown> | undefined
  try {
    parsed = (await exifr.parse(file, {
      gps: true,
      tiff: true,
      xmp: true,
      iptc: true,
      icc: false,
      jfif: true,
      ihdr: true,
    })) as Record<string, unknown> | undefined
  } catch {
    parsed = undefined
  }

  const tags: ExifTag[] = []
  let latitude: number | null = null
  let longitude: number | null = null

  if (parsed) {
    for (const [key, raw] of Object.entries(parsed)) {
      if (raw == null) continue
      if (key === "latitude" && typeof raw === "number") latitude = raw
      if (key === "longitude" && typeof raw === "number") longitude = raw
      const value = displayValue(raw)
      if (!value || value === "—" || value.length > 160) continue
      tags.push({
        key,
        label: LABELS[key] ?? key,
        value,
        sensitive: SENSITIVE.test(key),
      })
    }
  }

  if (latitude == null && typeof parsed?.GPSLatitude === "number") latitude = parsed.GPSLatitude
  if (longitude == null && typeof parsed?.GPSLongitude === "number") longitude = parsed.GPSLongitude

  tags.sort((a, b) => Number(b.sensitive) - Number(a.sensitive))

  return {
    tags,
    gps: latitude != null && longitude != null ? { latitude, longitude } : null,
    orientation: typeof parsed?.Orientation === "number" ? parsed.Orientation : 1,
  }
}

export async function verifyClean(file: Blob): Promise<number> {
  try {
    const parsed = await exifr.parse(file, { gps: true, tiff: true, xmp: true, iptc: true })
    return parsed ? Object.keys(parsed).length : 0
  } catch {
    return 0
  }
}

import * as React from "react"

/**
 * Tracks a blob with an object URL and always revokes the previous one.
 * Pass null to clear. The URL is stable between renders for the same blob.
 */
export function useObjectUrl(blob: Blob | null): string | null {
  const [url, setUrl] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!blob) {
      setUrl(null)
      return
    }
    const next = URL.createObjectURL(blob)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [blob])

  return url
}

import { Video } from "lucide-react"

function parseEmbedUrl(raw: string): string | null {
  const url = raw.trim()
  if (!url) return null

  // YouTube: youtu.be/ID  or  youtube.com/watch?v=ID  or  youtube.com/shorts/ID
  const ytShort  = url.match(/youtu\.be\/([A-Za-z0-9_-]{11})/)
  if (ytShort) return `https://www.youtube.com/embed/${ytShort[1]}`

  const ytWatch  = url.match(/[?&]v=([A-Za-z0-9_-]{11})/)
  if (ytWatch) return `https://www.youtube.com/embed/${ytWatch[1]}`

  const ytShorts = url.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/)
  if (ytShorts) return `https://www.youtube.com/embed/${ytShorts[1]}`

  const ytEmbed  = url.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{11})/)
  if (ytEmbed) return url  // already an embed URL

  // Loom: loom.com/share/ID
  const loomShare = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/)
  if (loomShare) return `https://www.loom.com/embed/${loomShare[1]}`

  const loomEmbed = url.match(/loom\.com\/embed\/([a-zA-Z0-9]+)/)
  if (loomEmbed) return url

  // Vimeo: vimeo.com/ID
  const vimeo = url.match(/vimeo\.com\/(\d+)/)
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`

  return null  // unrecognized URL
}

export function VideoEmbed({ url }: { url: string }) {
  const embedUrl = parseEmbedUrl(url)

  if (!url.trim()) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/30 py-12 text-center">
        <Video className="h-8 w-8 text-muted-foreground/40" />
        <div>
          <p className="text-sm font-medium text-muted-foreground">No video added yet</p>
          <p className="text-xs text-muted-foreground/70 mt-0.5">Paste a Loom, YouTube, or Vimeo link above</p>
        </div>
      </div>
    )
  }

  if (!embedUrl) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 py-8 text-center">
        <p className="text-sm font-medium text-destructive">Unrecognized video URL</p>
        <p className="text-xs text-muted-foreground">Supported: YouTube, Loom, Vimeo</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-black shadow-sm" style={{ aspectRatio: "16/9" }}>
      <iframe
        src={embedUrl}
        className="h-full w-full"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="Process video"
      />
    </div>
  )
}

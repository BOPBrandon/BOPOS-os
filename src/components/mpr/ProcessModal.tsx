import { useState, useEffect } from "react"
import { Trash2, FileText, Video, Circle, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { VideoEmbed } from "./VideoEmbed"
import { useMPR, type MPRProcess } from "@/context/MPRContext"

// ─────────────────────────────────────────────
// STATUS BADGE
// ─────────────────────────────────────────────
function statusFor(process: MPRProcess): { label: string; className: string } {
  const hasWritten = !!process.writtenDoc.trim()
  const hasVideo   = !!process.videoUrl.trim()
  if (hasWritten && hasVideo) return { label: "Fully Documented", className: "bg-emerald-50 text-emerald-700" }
  if (hasWritten)              return { label: "Written",          className: "bg-blue-50 text-blue-700"      }
  if (hasVideo)                return { label: "Video",            className: "bg-violet-50 text-violet-700"  }
  return                              { label: "Title Only",       className: "bg-muted text-muted-foreground" }
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────
interface ProcessModalProps {
  process: MPRProcess | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProcessModal({ process, open, onOpenChange }: ProcessModalProps) {
  const { updateProcess, deleteProcess } = useMPR()

  const [title,      setTitle]      = useState("")
  const [writtenDoc, setWrittenDoc] = useState("")
  const [videoUrl,   setVideoUrl]   = useState("")

  // Sync local state when process changes
  useEffect(() => {
    if (process) {
      setTitle(process.title)
      setWrittenDoc(process.writtenDoc)
      setVideoUrl(process.videoUrl)
    }
  }, [process?.id])

  if (!process) return null

  const status = statusFor({ ...process, writtenDoc, videoUrl })
  const hasWritten = !!writtenDoc.trim()
  const hasVideo   = !!videoUrl.trim()

  function save(patch: Partial<Pick<MPRProcess, "title" | "writtenDoc" | "videoUrl">>) {
    updateProcess(process.id, patch)
  }

  function handleDelete() {
    deleteProcess(process.id)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">

        {/* ── Header ────────────────────────────────────────── */}
        <div className="flex items-start gap-3 border-b border-border px-6 py-5">
          <div className="flex-1 min-w-0">
            <DialogHeader>
              <DialogTitle className="sr-only">Edit Process</DialogTitle>
            </DialogHeader>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => save({ title })}
              className="w-full text-lg font-bold text-foreground bg-transparent focus:outline-none placeholder-muted-foreground"
              placeholder="Process title…"
            />
            <div className="mt-2 flex items-center gap-2">
              <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-semibold", status.className)}>
                {status.label}
              </span>
              <div className="flex items-center gap-1.5">
                {hasWritten
                  ? <CheckCircle2 className="h-3 w-3 text-blue-500" />
                  : <Circle className="h-3 w-3 text-muted-foreground/30" />
                }
                <span className="text-[11px] text-muted-foreground">Written</span>
                {hasVideo
                  ? <CheckCircle2 className="h-3 w-3 text-violet-500 ml-2" />
                  : <Circle className="h-3 w-3 text-muted-foreground/30 ml-2" />
                }
                <span className="text-[11px] text-muted-foreground">Video</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleDelete}
            className="shrink-0 rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            title="Delete process"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* ── Tabs ──────────────────────────────────────────── */}
        <Tabs defaultValue="written" className="flex flex-col flex-1 overflow-hidden">
          <TabsList className="shrink-0 mx-6 mt-4 mb-0 grid w-auto grid-cols-2 self-start">
            <TabsTrigger value="written" className="gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Written Process
            </TabsTrigger>
            <TabsTrigger value="video" className="gap-1.5">
              <Video className="h-3.5 w-3.5" />
              Video Process
            </TabsTrigger>
          </TabsList>

          {/* Written */}
          <TabsContent value="written" className="flex-1 overflow-auto px-6 py-4 mt-0">
            <p className="mb-3 text-xs text-muted-foreground">
              Document the step-by-step process. Use plain text or markdown.
            </p>
            <textarea
              value={writtenDoc}
              onChange={(e) => setWrittenDoc(e.target.value)}
              onBlur={() => save({ writtenDoc })}
              placeholder={`Step 1: …\nStep 2: …\nStep 3: …`}
              className={cn(
                "w-full resize-none rounded-xl border border-border bg-background",
                "px-4 py-3 text-sm leading-relaxed font-mono text-foreground",
                "placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30",
                "min-h-[300px]"
              )}
            />
          </TabsContent>

          {/* Video */}
          <TabsContent value="video" className="flex-1 overflow-auto px-6 py-4 mt-0">
            <div className="flex flex-col gap-4">
              <div>
                <p className="mb-2 text-xs text-muted-foreground">
                  Paste a Loom, YouTube, or Vimeo link and the player will appear automatically.
                </p>
                <input
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  onBlur={() => save({ videoUrl })}
                  placeholder="https://www.loom.com/share/…"
                  className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <VideoEmbed url={videoUrl} />
            </div>
          </TabsContent>
        </Tabs>

        {/* ── Footer ────────────────────────────────────────── */}
        <div className="shrink-0 border-t border-border px-6 py-3 flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground">
            Changes save automatically on blur.
          </p>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Done
          </button>
        </div>

      </DialogContent>
    </Dialog>
  )
}

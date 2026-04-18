/**
 * StartModuleButton
 * One-Click philosophy: a single press shows the exact Claude prompt
 * to kick off a module's instruction sequence, ready to copy.
 */
import { useState } from "react"
import { Sparkles, Copy, CheckCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import type { ModuleSlot } from "@/types/bopos"
import { MODULE_REGISTRY } from "@/types/bopos"
import { MODULE_PROMPTS } from "./module-prompts"

interface StartModuleButtonProps {
  moduleSlot: ModuleSlot
  size?: "default" | "sm" | "lg"
  className?: string
}

export function StartModuleButton({ moduleSlot, size = "default", className }: StartModuleButtonProps) {
  const [open, setOpen]       = useState(false)
  const [copied, setCopied]   = useState(false)

  const meta   = MODULE_REGISTRY[moduleSlot]
  const prompt = MODULE_PROMPTS[moduleSlot] ?? `Start the ${meta.label} module sequence.`

  function handleCopy() {
    navigator.clipboard.writeText(prompt).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <>
      <Button
        size={size}
        variant="default"
        className={className}
        onClick={() => setOpen(true)}
      >
        <Sparkles className="h-4 w-4" />
        Start Module
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              {meta.label}
            </DialogTitle>
            <DialogDescription>
              Layer {meta.layer} · {meta.category} · Module {String(meta.slot).padStart(2, "0")}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-md border border-border bg-muted p-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Claude Instruction Sequence
            </p>
            <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-foreground">
              {prompt}
            </pre>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCopy} className="min-w-[130px]">
              {copied ? (
                <><CheckCheck className="h-4 w-4" /> Copied!</>
              ) : (
                <><Copy className="h-4 w-4" /> Copy to Claude</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/**
 * AddRhythmDialog
 * "Update the Anchor" — coach adds a new rhythm item.
 * Frequency selection auto-categorizes the item into the correct tier.
 */
import { useState } from "react"
import { PlusCircle } from "lucide-react"
import { Button }      from "@/components/ui/button"
import { Input }       from "@/components/ui/input"
import { Label }       from "@/components/ui/label"
import { Textarea }    from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import type { RhythmItem, FrequencyTier, MPRSystem } from "./anchor-types"
import { TIER_CONFIG, MPR_SYSTEMS } from "./anchor-types"

interface AddRhythmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (item: RhythmItem) => void
}

function generateId() {
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

const MONTH_LABELS = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
]

export function AddRhythmDialog({ open, onOpenChange, onAdd }: AddRhythmDialogProps) {
  const [label,       setLabel]       = useState("")
  const [description, setDescription] = useState("")
  const [frequency,   setFrequency]   = useState<FrequencyTier>("monthly")
  const [owner,       setOwner]       = useState("")
  const [isProcessTraining, setIsProcessTraining] = useState(false)
  const [mprSystem,   setMprSystem]   = useState<MPRSystem>("marketing")

  const selectedTier = TIER_CONFIG.find((t) => t.id === frequency)!

  function handleSubmit() {
    if (!label.trim()) return

    const item: RhythmItem = {
      id:          generateId(),
      label:       label.trim(),
      description: description.trim() || undefined,
      frequency,
      category:    isProcessTraining ? "process-training" : "general",
      mprSystem:   isProcessTraining ? mprSystem : undefined,
      isLocked:    false,
      owner:       owner.trim() || undefined,
      createdAt:   new Date().toISOString().slice(0, 10),
    }

    onAdd(item)
    handleReset()
    onOpenChange(false)
  }

  function handleReset() {
    setLabel("")
    setDescription("")
    setFrequency("monthly")
    setOwner("")
    setIsProcessTraining(false)
    setMprSystem("marketing")
  }

  const canSubmit = label.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4 text-primary" />
            Update the Anchor
          </DialogTitle>
          <DialogDescription>
            Add a new rhythm item. It will be placed into the correct frequency tier automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Label */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rhythm-label">Rhythm Name <span className="text-destructive">*</span></Label>
            <Input
              id="rhythm-label"
              placeholder="e.g. Client Check-In Call"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              autoFocus
            />
          </div>

          {/* Frequency — the core auto-categorization field */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rhythm-frequency">Frequency</Label>
            <div className="grid grid-cols-3 gap-2">
              {TIER_CONFIG.map((tier) => (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => setFrequency(tier.id)}
                  className={[
                    "flex flex-col items-start rounded-md border px-3 py-2 text-left text-xs transition-all",
                    frequency === tier.id
                      ? `${tier.bg} ${tier.border} ${tier.color} ring-2 ring-offset-1`
                      : "border-border bg-background text-muted-foreground hover:bg-muted",
                  ].join(" ")}
                >
                  <span className="text-base leading-none mb-1">{tier.icon}</span>
                  <span className="font-semibold">{tier.label}</span>
                  <span className="text-[10px] opacity-70">{tier.sublabel}</span>
                </button>
              ))}
            </div>

            {/* Auto-categorization feedback */}
            <p className={`text-xs px-3 py-2 rounded-md ${selectedTier.bg} ${selectedTier.color} ${selectedTier.border} border`}>
              {selectedTier.icon} This item will appear in the{" "}
              <strong>{selectedTier.label}</strong> tier —{" "}
              {selectedTier.sublabel}.
            </p>
          </div>

          {/* Process Training toggle */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <input
                id="is-process-training"
                type="checkbox"
                checked={isProcessTraining}
                onChange={(e) => setIsProcessTraining(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              <Label htmlFor="is-process-training" className="cursor-pointer">
                This is a Process Training item (MPR system)
              </Label>
            </div>

            {isProcessTraining && (
              <div className="flex flex-col gap-1.5 pl-6">
                <Label htmlFor="mpr-system">MPR System</Label>
                <div className="grid grid-cols-1 gap-1.5">
                  {(Object.entries(MPR_SYSTEMS) as [MPRSystem, typeof MPR_SYSTEMS[MPRSystem]][]).map(([key, sys]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setMprSystem(key)}
                      className={[
                        "flex items-start gap-2 rounded-md border px-3 py-2 text-left text-xs transition-all",
                        mprSystem === key
                          ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                          : "border-border bg-background text-muted-foreground hover:bg-muted",
                      ].join(" ")}
                    >
                      <span className={`font-semibold mt-0.5 ${sys.color}`}>{sys.label}</span>
                      <span className="text-muted-foreground">{sys.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Owner */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rhythm-owner">Owner <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input
              id="rhythm-owner"
              placeholder="e.g. Integrator, Owner, Sales Lead"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rhythm-description">Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Textarea
              id="rhythm-description"
              placeholder="What happens during this rhythm? What's the outcome?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[72px] resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={() => { handleReset(); onOpenChange(false) }}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            <PlusCircle className="h-4 w-4" />
            Add to Anchor
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

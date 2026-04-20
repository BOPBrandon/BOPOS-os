import { useState } from "react"
import { X, Plus, Layers } from "lucide-react"
import { cn } from "@/lib/utils"
import { DEFAULT_LANES, LANE_COLORS, COLOR_CYCLE, type MPRLane, type LaneColorKey } from "@/context/MPRContext"

interface MPRSetupWizardProps {
  onComplete: (lanes: MPRLane[]) => void
}

export function MPRSetupWizard({ onComplete }: MPRSetupWizardProps) {
  const [lanes, setLanes] = useState<MPRLane[]>(DEFAULT_LANES)
  const [newLabel, setNewLabel] = useState("")

  function rename(id: string, label: string) {
    setLanes((prev) => prev.map((l) => l.id === id ? { ...l, label } : l))
  }

  function remove(id: string) {
    if (lanes.length <= 1) return
    setLanes((prev) => prev.filter((l) => l.id !== id))
  }

  function addLane() {
    const label = newLabel.trim()
    if (!label) return
    const used = new Set(lanes.map((l) => l.colorKey))
    const color: LaneColorKey = COLOR_CYCLE.find((c) => !used.has(c)) ?? COLOR_CYCLE[lanes.length % COLOR_CYCLE.length]
    setLanes((prev) => [...prev, { id: crypto.randomUUID(), label, colorKey: color }])
    setNewLabel("")
  }

  const canLaunch = lanes.length >= 1 && lanes.every((l) => l.label.trim().length > 0)

  return (
    <div className="flex flex-col gap-8 p-8 max-w-2xl">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600">
          <Layers className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Set Up Your MPR Lanes</h1>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
            Your Master Process Roadmap is organized into lanes — one per department.
            We've suggested the four most common, but rename, remove, or add new ones
            to match how your business is actually built.
          </p>
        </div>
      </div>

      {/* Lane chips */}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Your Lanes
        </p>
        {lanes.map((lane) => {
          const colors = LANE_COLORS[lane.colorKey]
          return (
            <div
              key={lane.id}
              className={cn(
                "flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm",
                colors.accentBorder
              )}
            >
              {/* Color dot */}
              <div className={cn("h-2.5 w-2.5 shrink-0 rounded-full", colors.iconBg.replace("bg-", "bg-").replace("-50", "-400"))} />

              {/* Label input */}
              <input
                value={lane.label}
                onChange={(e) => rename(lane.id, e.target.value)}
                className="flex-1 bg-transparent text-sm font-medium text-foreground placeholder-muted-foreground focus:outline-none"
                placeholder="Lane name…"
              />

              {/* Delete */}
              <button
                onClick={() => remove(lane.id)}
                disabled={lanes.length <= 1}
                className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-30 disabled:cursor-not-allowed"
                title="Remove lane"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        })}
      </div>

      {/* Add new lane */}
      <div className="flex gap-2">
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addLane()}
          placeholder="Add a lane (e.g. HR, Finance, Field Ops)…"
          className="flex-1 rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
        />
        <button
          onClick={addLane}
          disabled={!newLabel.trim()}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>

      {/* Info callout */}
      <div className="rounded-lg bg-muted/50 px-4 py-3 text-xs text-muted-foreground leading-relaxed">
        <strong className="text-foreground">Tip:</strong> The Anchor automatically uses these lane names in its Process Training rhythms.
        If you rename a lane here, the Anchor updates too.
      </div>

      {/* CTA */}
      <button
        onClick={() => onComplete(lanes)}
        disabled={!canLaunch}
        className={cn(
          "self-start rounded-xl px-6 py-3 text-sm font-bold text-white transition-colors",
          "bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
        )}
      >
        Launch My MPR →
      </button>
    </div>
  )
}

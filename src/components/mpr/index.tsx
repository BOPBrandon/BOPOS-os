import { GitBranch } from "lucide-react"

const CORE_SYSTEMS = [
  { id: 1, label: "Core System 1", description: "Define and document your primary business system." },
  { id: 2, label: "Core System 2", description: "Track execution against your core process." },
  { id: 3, label: "Core System 3", description: "Manage delivery and output quality." },
  { id: 4, label: "Core System 4", description: "Measure results and iterate on the roadmap." },
]

/**
 * Layer 2 — Master Process Roadmap (MPR)
 * The operational engine. Tracks the 4 Core Systems driving execution.
 */
export function MPRDashboard() {
  return (
    <div className="flex flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Master Process Roadmap</h1>
        <p className="text-muted-foreground mt-1">4 Core Systems — The operational engine</p>
      </div>

      <div className="flex flex-col gap-3">
        {CORE_SYSTEMS.map((system) => (
          <div
            key={system.id}
            className="flex items-start gap-4 rounded-lg border border-border bg-card p-5 shadow-sm"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
              <GitBranch className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold text-sm">{system.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{system.description}</p>
            </div>
            <div className="ml-auto flex items-center">
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                Not started
              </span>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Layer 2 of 3 — Populate with your Master Process Roadmap data.
      </p>
    </div>
  )
}

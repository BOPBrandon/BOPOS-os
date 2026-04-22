import { useState, useEffect, useMemo } from "react"
import { Plus, Settings2, Hammer } from "lucide-react"
import { cn } from "@/lib/utils"
import { useMPR, type MPRLane, type MPRProcess, type LaneColorKey } from "@/context/MPRContext"
import { MPRSetupWizard } from "./MPRSetupWizard"
import { ProcessModal } from "./ProcessModal"

// ─────────────────────────────────────────────
// KANBAN COLOR MAP
// Full class strings — no dynamic assembly.
// ─────────────────────────────────────────────
const KANBAN: Record<LaneColorKey, {
  header: string       // column header background
  cardBorder: string   // left border on each process card
  addBtn: string       // "+ Upload Process" button accent
  count: string        // process count pill
}> = {
  orange:  { header: "bg-orange-500",  cardBorder: "border-l-orange-400",  addBtn: "hover:border-orange-300 hover:text-orange-600",  count: "bg-orange-100 text-orange-700"  },
  blue:    { header: "bg-blue-600",    cardBorder: "border-l-blue-400",    addBtn: "hover:border-blue-300 hover:text-blue-600",       count: "bg-blue-100 text-blue-700"      },
  emerald: { header: "bg-emerald-600", cardBorder: "border-l-emerald-500", addBtn: "hover:border-emerald-300 hover:text-emerald-700", count: "bg-emerald-100 text-emerald-700" },
  violet:  { header: "bg-violet-600",  cardBorder: "border-l-violet-500",  addBtn: "hover:border-violet-300 hover:text-violet-600",   count: "bg-violet-100 text-violet-700"  },
  rose:    { header: "bg-rose-500",    cardBorder: "border-l-rose-400",    addBtn: "hover:border-rose-300 hover:text-rose-600",       count: "bg-rose-100 text-rose-700"      },
  amber:   { header: "bg-amber-500",   cardBorder: "border-l-amber-400",   addBtn: "hover:border-amber-300 hover:text-amber-600",     count: "bg-amber-100 text-amber-700"    },
  slate:   { header: "bg-slate-600",   cardBorder: "border-l-slate-400",   addBtn: "hover:border-slate-300 hover:text-slate-600",     count: "bg-slate-100 text-slate-700"    },
}

// ─────────────────────────────────────────────
// PROCESS CARD — sticky-note style, title only
// ─────────────────────────────────────────────
function ProcessCard({
  process,
  colorKey,
  onClick,
}: {
  process: MPRProcess
  colorKey: LaneColorKey
  onClick: () => void
}) {
  const k = KANBAN[colorKey]

  return (
    <button
      onClick={onClick}
      className={cn(
        "group w-full rounded-lg bg-white text-left",
        "border border-border/50 border-l-4 shadow-sm",
        k.cardBorder,
        "px-3.5 py-3",
        "hover:shadow-md hover:-translate-y-px transition-all duration-150"
      )}
    >
      <p className="text-sm font-medium text-foreground leading-snug">
        {process.title}
      </p>
    </button>
  )
}

// ─────────────────────────────────────────────
// ADD PROCESS INPUT
// Shows a ghost button; expands to an inline input on click.
// ─────────────────────────────────────────────
function AddProcessInput({
  colorKey,
  onAdd,
}: {
  colorKey: LaneColorKey
  onAdd: (title: string) => void
}) {
  const [active, setActive] = useState(false)
  const [value,  setValue]  = useState("")
  const k = KANBAN[colorKey]

  function commit() {
    const trimmed = value.trim()
    if (trimmed) onAdd(trimmed)
    setValue("")
    setActive(false)
  }

  if (!active) {
    return (
      <button
        onClick={() => setActive(true)}
        className={cn(
          "mt-1 flex w-full items-center gap-2 rounded-lg border border-dashed border-border/60",
          "px-3.5 py-2.5 text-sm text-muted-foreground transition-colors",
          k.addBtn
        )}
      >
        <Plus className="h-3.5 w-3.5 shrink-0" />
        Upload Process
      </button>
    )
  }

  return (
    <input
      autoFocus
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter")  commit()
        if (e.key === "Escape") { setValue(""); setActive(false) }
      }}
      onBlur={commit}
      placeholder="Process title… (Enter to save)"
      className="mt-1 w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
    />
  )
}

// ─────────────────────────────────────────────
// KANBAN COLUMN
// ─────────────────────────────────────────────
function KanbanColumn({
  lane,
  processes,
  onAdd,
  onOpen,
}: {
  lane: MPRLane
  processes: MPRProcess[]
  onAdd: (laneId: string, title: string) => void
  onOpen: (process: MPRProcess) => void
}) {
  const k = KANBAN[lane.colorKey]

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-xl border border-border/60 shadow-md overflow-hidden">

      {/* ── Column header ───────────────────────── */}
      <div className={cn("px-5 py-4", k.header)}>
        <h2 className="text-base font-bold tracking-tight text-white leading-tight">
          {lane.label}
        </h2>
        <div className="mt-1 flex items-center gap-2">
          <span className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-semibold",
            k.count
          )}>
            {processes.length} {processes.length === 1 ? "process" : "processes"}
          </span>
        </div>
      </div>

      {/* ── Process cards ───────────────────────── */}
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto bg-slate-50 p-3">
        {processes.map((p) => (
          <ProcessCard
            key={p.id}
            process={p}
            colorKey={lane.colorKey}
            onClick={() => onOpen(p)}
          />
        ))}

        <AddProcessInput
          colorKey={lane.colorKey}
          onAdd={(title) => onAdd(lane.id, title)}
        />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// CUSTOM AI TOOLS COLUMN
// Reads from the Workbench deploy log and shows tools deployed to "mpr"
// ─────────────────────────────────────────────
const DEPLOYED_KEY = "bopos_workbench_deployed"

interface DeployedTool {
  id:          string
  name:        string
  dashboard:   string
  deployedAt:  string
}

function CustomAIToolsColumn() {
  const [tools, setTools] = useState<DeployedTool[]>(() => {
    try {
      const saved = localStorage.getItem(DEPLOYED_KEY)
      const all: DeployedTool[] = saved ? JSON.parse(saved) : []
      return all.filter((t) => t.dashboard === "mpr")
    } catch { return [] }
  })

  useEffect(() => {
    function refresh() {
      try {
        const saved = localStorage.getItem(DEPLOYED_KEY)
        const all: DeployedTool[] = saved ? JSON.parse(saved) : []
        setTools(all.filter((t) => t.dashboard === "mpr"))
      } catch { setTools([]) }
    }
    window.addEventListener('bop-deploy', refresh)
    return () => window.removeEventListener('bop-deploy', refresh)
  }, [])

  if (tools.length === 0) return null

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-xl border border-border/60 shadow-md overflow-hidden">
      <div className="bg-[#002855] px-5 py-4">
        <div className="flex items-center gap-2">
          <Hammer className="h-4 w-4 text-white/70" />
          <h2 className="text-base font-bold tracking-tight text-white leading-tight">Custom AI Tools</h2>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-[11px] font-semibold">
            {tools.length} {tools.length === 1 ? "tool" : "tools"}
          </span>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto bg-slate-50 p-3">
        {tools.map((tool) => (
          <div
            key={tool.id}
            className="w-full rounded-lg bg-white border border-border/50 border-l-4 border-l-[#002855] shadow-sm px-3.5 py-3"
          >
            <p className="text-sm font-medium text-foreground leading-snug">{tool.name}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Deployed {new Date(tool.deployedAt).toLocaleDateString([], { month: "short", day: "numeric" })}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// MAIN DASHBOARD
// ─────────────────────────────────────────────
export function MPRDashboard() {
  const { state, completeSetup, addProcess, processesForLane, resetSetup } = useMPR()
  const [activeProcess, setActiveProcess] = useState<MPRProcess | null>(null)
  const [modalOpen,     setModalOpen]     = useState(false)

  function handleOpen(process: MPRProcess) {
    setActiveProcess(process)
    setModalOpen(true)
  }

  function handleAdd(laneId: string, title: string) {
    const p = addProcess(laneId, title)
    setActiveProcess(p)
    setModalOpen(true)
  }

  // ── First-time setup ─────────────────────────────────────────
  if (!state.setupComplete) {
    return <MPRSetupWizard onComplete={completeSetup} />
  }

  const totalProcesses = state.processes.length
  const documented     = state.processes.filter((p) => p.writtenDoc.trim() || p.videoUrl.trim()).length

  // ── Kanban board ─────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col overflow-hidden">

      {/* ── Page header ────────────────────────────────────────── */}
      <header className="flex shrink-0 items-center justify-between border-b border-border bg-background px-6 py-4">
        <div>
          <h1 className="text-lg font-bold leading-tight tracking-tight">
            Master Process Roadmap
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {state.lanes.length} lanes · {totalProcesses} processes · {documented} documented
          </p>
        </div>

        <button
          onClick={resetSetup}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
        >
          <Settings2 className="h-3.5 w-3.5" />
          Edit Lanes
        </button>
      </header>

      {/* ── Kanban board ───────────────────────────────────────── */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden bg-[#F0F2F5]">
        <div className="flex h-full gap-5 px-6 py-5">
          {state.lanes.map((lane) => (
            <KanbanColumn
              key={lane.id}
              lane={lane}
              processes={processesForLane(lane.id)}
              onAdd={handleAdd}
              onOpen={handleOpen}
            />
          ))}
          <CustomAIToolsColumn />
        </div>
      </div>

      {/* ── Process detail modal ───────────────────────────────── */}
      <ProcessModal
        process={activeProcess}
        open={modalOpen}
        onOpenChange={(o) => {
          setModalOpen(o)
          if (!o) setActiveProcess(null)
        }}
      />
    </div>
  )
}

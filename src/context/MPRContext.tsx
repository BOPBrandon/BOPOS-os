import { createContext, useContext, useState, useCallback } from "react"

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
export type LaneColorKey = "orange" | "blue" | "emerald" | "violet" | "rose" | "amber" | "slate"

export interface MPRLane {
  id: string
  label: string
  colorKey: LaneColorKey
  /** Maps this lane to an Anchor process-training system key */
  mprSystemKey?: string
}

export interface MPRProcess {
  id: string
  laneId: string
  title: string
  writtenDoc: string
  videoUrl: string
  createdAt: string
  updatedAt: string
}

export interface MPRState {
  setupComplete: boolean
  lanes: MPRLane[]
  processes: MPRProcess[]
}

// ─────────────────────────────────────────────
// COLOR MAP
// Full Tailwind class strings (no dynamic assembly)
// ─────────────────────────────────────────────
export const LANE_COLORS: Record<LaneColorKey, {
  accentBorder: string
  iconBg: string
  iconText: string
  badge: string
}> = {
  orange:  { accentBorder: "border-l-4 border-l-orange-400",  iconBg: "bg-orange-50",  iconText: "text-orange-500",  badge: "bg-orange-50 text-orange-700"  },
  blue:    { accentBorder: "border-l-4 border-l-blue-400",    iconBg: "bg-blue-50",    iconText: "text-blue-500",    badge: "bg-blue-50 text-blue-700"      },
  emerald: { accentBorder: "border-l-4 border-l-emerald-500", iconBg: "bg-emerald-50", iconText: "text-emerald-600", badge: "bg-emerald-50 text-emerald-700" },
  violet:  { accentBorder: "border-l-4 border-l-violet-500",  iconBg: "bg-violet-50",  iconText: "text-violet-600",  badge: "bg-violet-50 text-violet-700"   },
  rose:    { accentBorder: "border-l-4 border-l-rose-400",    iconBg: "bg-rose-50",    iconText: "text-rose-500",    badge: "bg-rose-50 text-rose-700"       },
  amber:   { accentBorder: "border-l-4 border-l-amber-400",   iconBg: "bg-amber-50",   iconText: "text-amber-600",   badge: "bg-amber-50 text-amber-700"     },
  slate:   { accentBorder: "border-l-4 border-l-slate-400",   iconBg: "bg-slate-50",   iconText: "text-slate-600",   badge: "bg-slate-50 text-slate-700"     },
}

export const COLOR_CYCLE: LaneColorKey[] = ["orange", "blue", "emerald", "violet", "rose", "amber", "slate"]

// ─────────────────────────────────────────────
// DEMO LANES
// Marketing / Sales / Admin = orange; Coaching = blue; Tech Stack = emerald
// ─────────────────────────────────────────────
export const DEFAULT_LANES: MPRLane[] = [
  { id: "marketing",  label: "Marketing",  colorKey: "orange",  mprSystemKey: "marketing"  },
  { id: "sales",      label: "Sales",      colorKey: "orange",  mprSystemKey: "sales"      },
  { id: "coaching",   label: "Coaching",   colorKey: "blue",    mprSystemKey: "coaching"   },
  { id: "admin",      label: "Admin",      colorKey: "orange",  mprSystemKey: "administration" },
  { id: "tech-stack", label: "Tech Stack", colorKey: "emerald", mprSystemKey: "tech-stack" },
]

// ─────────────────────────────────────────────
// DEMO PROCESSES — pre-seeded from real-world example
// ─────────────────────────────────────────────
const DEMO_TS = "2026-01-01T00:00:00.000Z"

function dp(id: string, laneId: string, title: string): MPRProcess {
  return { id, laneId, title, writtenDoc: "", videoUrl: "", createdAt: DEMO_TS, updatedAt: DEMO_TS }
}

const DEMO_PROCESSES: MPRProcess[] = [
  // Marketing
  dp("mkt-1",  "marketing", "Outreach"),
  dp("mkt-2",  "marketing", "Nurture & Nurture Plans"),
  dp("mkt-3",  "marketing", "Offerings"),
  dp("mkt-4",  "marketing", "Follow Up"),
  dp("mkt-5",  "marketing", "Methods"),
  dp("mkt-6",  "marketing", "Client Retention"),
  dp("mkt-7",  "marketing", "YouTube"),
  dp("mkt-8",  "marketing", "BNI/Advisor Group"),
  dp("mkt-9",  "marketing", "Lunch N Learns"),
  dp("mkt-10", "marketing", "Masterclasses"),

  // Sales
  dp("sal-1",  "sales", "Appointment"),
  dp("sal-2",  "sales", "Comp Conv"),
  dp("sal-3",  "sales", "Follow Up"),
  dp("sal-4",  "sales", "ASCEND"),
  dp("sal-5",  "sales", "Calendar"),
  dp("sal-6",  "sales", "Zoom"),
  dp("sal-7",  "sales", "Call Prep"),
  dp("sal-8",  "sales", "CC Notes"),
  dp("sal-9",  "sales", "New Client Billing"),

  // Coaching
  dp("cch-1",  "coaching", "New Client FORM"),
  dp("cch-2",  "coaching", "1 on 1"),
  dp("cch-3",  "coaching", "OS/AP's"),
  dp("cch-4",  "coaching", "Peer Groups"),
  dp("cch-5",  "coaching", "Stickiness"),
  dp("cch-6",  "coaching", "Collectives"),
  dp("cch-7",  "coaching", "Workshops"),
  dp("cch-8",  "coaching", "Onboarding Call"),
  dp("cch-9",  "coaching", "Weekly Scorecard"),
  dp("cch-10", "coaching", "Weekly Client Email"),
  dp("cch-11", "coaching", "12 Month Plan"),

  // Admin
  dp("adm-1",  "admin", "Clients"),
  dp("adm-2",  "admin", "Team"),
  dp("adm-3",  "admin", "General"),
  dp("adm-4",  "admin", "Billing"),
  dp("adm-5",  "admin", "Expensify"),
  dp("adm-6",  "admin", "Travel"),
  dp("adm-7",  "admin", "BOP Budget"),
  dp("adm-8",  "admin", "Employee Agreements"),
  dp("adm-9",  "admin", "401k"),

  // Tech Stack
  dp("tch-1",  "tech-stack", "GDrive"),
  dp("tch-2",  "tech-stack", "GHL How-To"),
  dp("tch-3",  "tech-stack", "Zoom"),
  dp("tch-4",  "tech-stack", "Kajabi"),
  dp("tch-5",  "tech-stack", "Slack"),
  dp("tch-6",  "tech-stack", "Vimeo"),
]

const DEMO_STATE: MPRState = {
  setupComplete: true,
  lanes: DEFAULT_LANES,
  processes: DEMO_PROCESSES,
}

// Bump version key to flush any stale localStorage from prior builds
const STORAGE_KEY = "bopos_mpr_v2"

function loadState(): MPRState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved) as MPRState
  } catch { /* ignore */ }
  // First load — seed demo data immediately so refresh shows full board
  persist(DEMO_STATE)
  return DEMO_STATE
}

function persist(state: MPRState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

// ─────────────────────────────────────────────
// CONTEXT
// ─────────────────────────────────────────────
interface MPRContextValue {
  state: MPRState
  completeSetup: (lanes: MPRLane[]) => void
  resetSetup:    () => void
  addLane:       (label: string) => void
  renameLane:    (id: string, label: string) => void
  deleteLane:    (id: string) => void
  addProcess:    (laneId: string, title: string) => MPRProcess
  updateProcess: (id: string, patch: Partial<Pick<MPRProcess, "title" | "writtenDoc" | "videoUrl">>) => void
  deleteProcess: (id: string) => void
  processesForLane: (laneId: string) => MPRProcess[]
}

const MPRContext = createContext<MPRContextValue | null>(null)

export function MPRProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<MPRState>(loadState)

  function apply(updater: (prev: MPRState) => MPRState) {
    setState((prev) => {
      const next = updater(prev)
      persist(next)
      return next
    })
  }

  const completeSetup = useCallback((lanes: MPRLane[]) =>
    apply((p) => ({ ...p, lanes, setupComplete: true })), [])

  const resetSetup = useCallback(() =>
    apply(() => ({ setupComplete: false, lanes: DEFAULT_LANES, processes: DEMO_PROCESSES })), [])

  const addLane = useCallback((label: string) =>
    apply((p) => {
      const used = new Set(p.lanes.map((l) => l.colorKey))
      const color = COLOR_CYCLE.find((c) => !used.has(c)) ?? COLOR_CYCLE[p.lanes.length % COLOR_CYCLE.length]
      return { ...p, lanes: [...p.lanes, { id: crypto.randomUUID(), label, colorKey: color }] }
    }), [])

  const renameLane = useCallback((id: string, label: string) =>
    apply((p) => ({ ...p, lanes: p.lanes.map((l) => l.id === id ? { ...l, label } : l) })), [])

  const deleteLane = useCallback((id: string) =>
    apply((p) => ({
      ...p,
      lanes: p.lanes.filter((l) => l.id !== id),
      processes: p.processes.filter((pr) => pr.laneId !== id),
    })), [])

  const addProcess = useCallback((laneId: string, title: string): MPRProcess => {
    const now = new Date().toISOString()
    const process: MPRProcess = { id: crypto.randomUUID(), laneId, title, writtenDoc: "", videoUrl: "", createdAt: now, updatedAt: now }
    apply((p) => ({ ...p, processes: [...p.processes, process] }))
    return process
  }, [])

  const updateProcess = useCallback((id: string, patch: Partial<Pick<MPRProcess, "title" | "writtenDoc" | "videoUrl">>) =>
    apply((p) => ({
      ...p,
      processes: p.processes.map((pr) =>
        pr.id === id ? { ...pr, ...patch, updatedAt: new Date().toISOString() } : pr
      ),
    })), [])

  const deleteProcess = useCallback((id: string) =>
    apply((p) => ({ ...p, processes: p.processes.filter((pr) => pr.id !== id) })), [])

  const processesForLane = useCallback((laneId: string) =>
    state.processes.filter((p) => p.laneId === laneId), [state.processes])

  return (
    <MPRContext.Provider value={{
      state,
      completeSetup, resetSetup,
      addLane, renameLane, deleteLane,
      addProcess, updateProcess, deleteProcess,
      processesForLane,
    }}>
      {children}
    </MPRContext.Provider>
  )
}

export function useMPR(): MPRContextValue {
  const ctx = useContext(MPRContext)
  if (!ctx) throw new Error("useMPR must be used inside <MPRProvider>")
  return ctx
}

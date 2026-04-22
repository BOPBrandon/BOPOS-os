/**
 * Anchor Engine — 52-Week Rhythm Map
 * Perspectives: Weekly · Monthly · Quarterly · Annual
 * Features: Drag & Drop · Smart Lock · Row Markers · Unified Wizard
 */
import { useState, useMemo, useEffect, useRef, Fragment } from "react"
import {
  Lock, BookOpen, PlusCircle, X,
  ChevronLeft, ChevronRight,
  Edit3, CheckCircle2, AlertTriangle,
  Plus, Calendar,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge }  from "@/components/ui/badge"
import { AddRhythmDialog } from "./AddRhythmDialog"
import { buildWeekGrid, firesInWeek, MONTH_ABBR, type GridWeek } from "./anchor-grid"
import {
  SECTION_CONFIG,
  type FrequencyTier,
  type RhythmItem,
  type RhythmCategory,
} from "./anchor-types"
import { useAnchor } from "@/context/AnchorContext"
import { cn } from "@/lib/utils"
import { useMPR } from "@/context/MPRContext"

// ─────────────────────────────────────────────
const YEAR          = new Date().getFullYear()
const LABEL_W       = 200
const SCHEDULES_KEY = "bopos_anchor_schedules"
const LINKED_KEY    = "bopos_anchor_linked_processes"
const AUTO_SAVE_MS  = 10 * 60 * 1000

function loadLinked(): Record<string, string> {
  try { const s = localStorage.getItem(LINKED_KEY); return s ? JSON.parse(s) : {} }
  catch { return {} }
}

type ViewMode = "weekly" | "monthly" | "quarterly" | "annual"

const CELL_W: Record<ViewMode, number> = { weekly: 104, monthly: 80, quarterly: 40, annual: 20 }
const DAY_LABELS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]
const VIEWS: { id: ViewMode; label: string }[] = [
  { id: "weekly",    label: "Weekly"    },
  { id: "monthly",   label: "Monthly"   },
  { id: "quarterly", label: "Quarterly" },
  { id: "annual",    label: "Annual"    },
]

interface DraftMove  { itemId: string; fromWeek: number; toWeek: number }
interface WeekDay    { dayIndex: number; date: Date; shortLabel: string; dateLabel: string; isToday: boolean }
interface ActiveBlock {
  item:      RhythmItem
  week:      GridWeek
  processes: { id: string; title: string; writtenDoc: string; videoUrl: string }[]
}

// ─────────────────────────────────────────────
// Persistence
// ─────────────────────────────────────────────
function loadSchedules(): Record<string, number[]> {
  try { const s = localStorage.getItem(SCHEDULES_KEY); return s ? JSON.parse(s) : {} }
  catch { return {} }
}
function saveSchedules(s: Record<string, number[]>) { localStorage.setItem(SCHEDULES_KEY, JSON.stringify(s)) }

// ─────────────────────────────────────────────
// MOVE CONFIRM MODAL — Smart Lock checkbox
// ─────────────────────────────────────────────
function MoveConfirmModal({
  item, fromWeek, toWeek, onConfirm, onCancel,
}: {
  item:      RhythmItem | undefined
  fromWeek:  GridWeek | undefined
  toWeek:    GridWeek | undefined
  onConfirm: (enableAutoSave: boolean) => void
  onCancel:  () => void
}) {
  const [dontAsk, setDontAsk] = useState(false)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
      <div className="w-[400px] max-w-[90vw] overflow-hidden rounded-2xl border border-border bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="bg-orange-500 px-5 py-4">
          <h3 className="text-base font-bold text-white">Move Rhythm?</h3>
          <p className="mt-0.5 text-xs text-orange-100">Confirm schedule change</p>
        </div>
        <div className="p-5 space-y-4">
          <div className="rounded-xl border border-border bg-slate-50 px-4 py-3">
            <p className="text-sm font-semibold text-foreground mb-2">{item?.label}</p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><div className="h-2 w-2 rounded bg-orange-300" />{fromWeek?.rangeLabel}</span>
              <span>→</span>
              <span className="flex items-center gap-1.5"><div className="h-2 w-2 rounded bg-orange-500" />{toWeek?.rangeLabel}</span>
            </div>
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3 hover:bg-muted/50 transition-colors">
            <input type="checkbox" checked={dontAsk} onChange={(e) => setDontAsk(e.target.checked)} className="mt-0.5 h-4 w-4 accent-orange-500 cursor-pointer" />
            <div>
              <p className="text-xs font-semibold text-foreground">Don't ask again for 10 minutes</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Moves save instantly until the timer expires. A lock icon shows the countdown in the header.</p>
            </div>
          </label>
        </div>
        <div className="flex gap-2 border-t border-border px-5 py-4">
          <button onClick={onCancel} className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
          <button onClick={() => onConfirm(dontAsk)} className="flex-1 rounded-lg bg-orange-500 px-4 py-2 text-sm font-bold text-white hover:bg-orange-600 transition-colors">Confirm Move</button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// PUBLISH CONFIRM MODAL
// ─────────────────────────────────────────────
function PublishConfirmModal({ draftCount, onConfirm, onCancel }: { draftCount: number; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
      <div className="w-[420px] max-w-[90vw] overflow-hidden rounded-2xl border border-border bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="bg-slate-800 px-5 py-4">
          <h3 className="text-base font-bold text-white">Publish Rhythm Map?</h3>
          <p className="mt-0.5 text-xs text-slate-300">This will update your 52-week plan</p>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <p className="text-sm text-amber-800 leading-relaxed">You have rearranged <strong>{draftCount} {draftCount === 1 ? "item" : "items"}</strong>. Are you ready to update your 52-Week Rhythm?</p>
          </div>
        </div>
        <div className="flex gap-2 border-t border-border px-5 py-4">
          <button onClick={onCancel} className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
          <button onClick={onConfirm} className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700 transition-colors">
            <CheckCircle2 className="h-4 w-4" />Publish Rhythm Map
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// ANCHOR WIZARD
// ─────────────────────────────────────────────
function AnchorWizard({ onAddIngredient, onScheduleEvent, onClose }: { onAddIngredient: () => void; onScheduleEvent: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]" onClick={onClose}>
      <div className="w-[480px] max-w-[90vw] overflow-hidden rounded-2xl border border-border bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between bg-slate-800 px-5 py-4">
          <div><h3 className="text-base font-bold text-white">Update the Anchor</h3><p className="mt-0.5 text-xs text-slate-300">What would you like to do?</p></div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X className="h-5 w-5" /></button>
        </div>
        <div className="grid grid-cols-2 gap-4 p-5">
          <button onClick={onAddIngredient} className="group flex flex-col gap-3 rounded-xl border-2 border-border bg-slate-50 p-5 text-left transition-all hover:border-orange-400 hover:bg-orange-50">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600 transition-colors group-hover:bg-orange-500 group-hover:text-white"><Plus className="h-5 w-5" /></div>
            <div><p className="text-sm font-bold text-foreground">Add New Ingredient</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Create a whole new rhythm row, like 'Client Birthdays' or 'Team Huddle'.</p></div>
          </button>
          <button onClick={onScheduleEvent} className="group flex flex-col gap-3 rounded-xl border-2 border-border bg-slate-50 p-5 text-left transition-all hover:border-slate-700 hover:bg-slate-100">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-200 text-slate-600 transition-colors group-hover:bg-slate-800 group-hover:text-white"><Calendar className="h-5 w-5" /></div>
            <div><p className="text-sm font-bold text-foreground">Schedule New Event</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Pick an existing ingredient and a date range to bulk-add markers.</p></div>
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// SCHEDULE EVENT DIALOG
// ─────────────────────────────────────────────
type SchedulePattern = "every-week" | "every-other" | "monthly" | "one-time"
const SCHEDULE_PATTERNS: { id: SchedulePattern; label: string }[] = [
  { id: "every-week",  label: "Every week" },
  { id: "every-other", label: "Every other week" },
  { id: "monthly",     label: "Monthly (first week)" },
  { id: "one-time",    label: "One time only" },
]

function ScheduleEventDialog({ allItems, weeks, onSchedule, onClose }: { allItems: RhythmItem[]; weeks: GridWeek[]; onSchedule: (itemId: string, weekIndices: number[]) => void; onClose: () => void }) {
  const defaultFrom = Math.max(0, weeks.findIndex((w) => w.isCurrentWeek))
  const [itemId,   setItemId]   = useState(allItems[0]?.id ?? "")
  const [fromWeek, setFromWeek] = useState(defaultFrom)
  const [toWeek,   setToWeek]   = useState(Math.min(defaultFrom + 3, 51))
  const [pattern,  setPattern]  = useState<SchedulePattern>("every-week")

  const previewIndices = useMemo(() => {
    if (!itemId || fromWeek > toWeek) return []
    const result: number[] = []
    for (let i = fromWeek; i <= toWeek; i++) {
      const w = weeks[i]
      if      (pattern === "every-week")  result.push(i)
      else if (pattern === "every-other" && (i - fromWeek) % 2 === 0) result.push(i)
      else if (pattern === "monthly"     && w.start.getDate() <= 7)   result.push(i)
      else if (pattern === "one-time"    && i === fromWeek)            result.push(i)
    }
    return result
  }, [itemId, fromWeek, toWeek, pattern, weeks])

  const selectedItem = allItems.find((i) => i.id === itemId)
  const canSubmit = !!itemId && previewIndices.length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]" onClick={onClose}>
      <div className="flex max-h-[90vh] w-[480px] max-w-[90vw] flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex shrink-0 items-center justify-between bg-slate-800 px-5 py-4">
          <div><h3 className="text-base font-bold text-white">Schedule New Event</h3><p className="mt-0.5 text-xs text-slate-300">Bulk-add markers to an existing ingredient</p></div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">1 · Which Ingredient?</p>
            <select value={itemId} onChange={(e) => setItemId(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              {allItems.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </div>
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">2 · Date Range</p>
            <div className="grid grid-cols-2 gap-3">
              {([
                { label: "From", value: fromWeek, onChange: (v: number) => { setFromWeek(v); if (v > toWeek) setToWeek(v) }, options: weeks },
                { label: "To",   value: toWeek,   onChange: setToWeek,  options: weeks.filter((w) => w.index >= fromWeek) },
              ] as const).map(({ label, value, onChange, options }) => (
                <div key={label}>
                  <p className="mb-1 text-[10px] text-muted-foreground">{label}</p>
                  <select value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30">
                    {options.map((w) => <option key={w.index} value={w.index}>{w.rangeLabel} (W{w.weekNum})</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">3 · Frequency Pattern</p>
            <div className="grid grid-cols-2 gap-2">
              {SCHEDULE_PATTERNS.map((p) => (
                <button key={p.id} onClick={() => setPattern(p.id)} className={cn("rounded-lg border px-3 py-2 text-left text-xs font-medium transition-all", pattern === p.id ? "border-orange-400 bg-orange-50 text-orange-700" : "border-border text-muted-foreground hover:bg-muted")}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className={cn("rounded-xl border px-4 py-3", previewIndices.length > 0 ? "border-orange-200 bg-orange-50" : "border-border bg-muted/30")}>
            {previewIndices.length > 0
              ? <p className="text-sm text-orange-800"><strong>{previewIndices.length} marker{previewIndices.length !== 1 ? "s" : ""}</strong> will be added to <strong>{selectedItem?.label}</strong>{fromWeek === toWeek ? ` in ${weeks[fromWeek]?.rangeLabel}` : ` from ${weeks[fromWeek]?.rangeLabel} → ${weeks[toWeek]?.rangeLabel}`}</p>
              : <p className="text-xs italic text-muted-foreground">{!itemId ? "Select an ingredient above." : "No markers match this pattern."}</p>
            }
          </div>
        </div>
        <div className="flex shrink-0 gap-2 border-t border-border px-5 py-4">
          <button onClick={onClose} className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
          <button disabled={!canSubmit} onClick={() => { if (canSubmit) { onSchedule(itemId, previewIndices); onClose() } }}
            className={cn("flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-colors", canSubmit ? "bg-orange-500 text-white hover:bg-orange-600" : "cursor-not-allowed bg-muted text-muted-foreground")}>
            <CheckCircle2 className="h-4 w-4" />Add {previewIndices.length > 0 ? `${previewIndices.length} ` : ""}Marker{previewIndices.length !== 1 ? "s" : ""}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export function AnchorEngine() {
  const { items, addItem } = useAnchor()
  const [customSchedules, setCustomSchedules] = useState<Record<string, number[]>>(loadSchedules)
  const [bulkEdit,        setBulkEdit]        = useState(false)
  const [draftMoves,      setDraftMoves]      = useState<DraftMove[]>([])
  const [dragging,        setDragging]        = useState<{ itemId: string; weekIndex: number } | null>(null)
  const [dragOver,        setDragOver]        = useState<{ itemId: string; weekIndex: number } | null>(null)
  const [pendingMove,     setPendingMove]     = useState<DraftMove | null>(null)
  const [publishConfirm,  setPublishConfirm]  = useState(false)
  const [autoSaveUntil,   setAutoSaveUntil]   = useState<number | null>(null)
  const [nowTs,           setNowTs]           = useState(Date.now())
  const [viewMode,        setViewMode]        = useState<ViewMode>("annual")
  const [transitioning,   setTransitioning]   = useState(false)
  const [selectedMonth,   setSelectedMonth]   = useState(() => new Date().getMonth())
  const [selectedWeek,    setSelectedWeek]    = useState(() => {
    const n = new Date(); const dayOfYear = Math.floor((n.getTime() - new Date(YEAR, 0, 0).getTime()) / 86400000)
    return Math.min(Math.floor((dayOfYear - 1) / 7), 51)
  })
  const [wizardOpen,       setWizardOpen]       = useState(false)
  const [scheduleOpen,     setScheduleOpen]     = useState(false)
  const [dialogOpen,       setDialogOpen]       = useState(false)
  const [activeBlock,      setActiveBlock]      = useState<ActiveBlock | null>(null)
  const [linkedProcesses,  setLinkedProcesses]  = useState<Record<string, string>>(loadLinked)
  const wrapRef = useRef<HTMLDivElement>(null)

  const { state: mprState } = useMPR()
  const { weeks, monthSpans } = useMemo(() => buildWeekGrid(YEAR), [])

  // Auto-save countdown
  useEffect(() => {
    if (!autoSaveUntil) return
    const id = setInterval(() => {
      const n = Date.now()
      setNowTs(n)
      if (n >= autoSaveUntil) { setAutoSaveUntil(null); clearInterval(id) }
    }, 1000)
    return () => clearInterval(id)
  }, [autoSaveUntil])

  // Global dragend cleanup
  useEffect(() => {
    const fn = () => { setDragging(null); setDragOver(null) }
    document.addEventListener("dragend", fn)
    return () => document.removeEventListener("dragend", fn)
  }, [])

  // Auto-scroll to current week in annual view
  useEffect(() => {
    if (viewMode === "annual" && wrapRef.current) {
      const idx = weeks.findIndex((w) => w.isCurrentWeek)
      if (idx >= 0) {
        const center = wrapRef.current.clientWidth / 2
        wrapRef.current.scrollLeft = Math.max(0, LABEL_W + idx * CELL_W.annual - center + CELL_W.annual * 4)
      }
    }
  }, [viewMode, weeks])

  // ── Perspective switch with fade + context sync ────────────
  function switchView(newMode: ViewMode) {
    if (newMode === viewMode) return
    const curMonth = selectedMonth
    const curWeek  = selectedWeek

    setTransitioning(true)
    setTimeout(() => {
      // Context sync: preserve temporal position when switching
      if (newMode === "weekly") {
        // Go to first week of the currently-selected month
        const firstWeek = weeks.find((w) => w.monthIndex === curMonth)
        if (firstWeek) setSelectedWeek(firstWeek.index)
      } else if (viewMode === "weekly") {
        // Sync selectedMonth to whatever week was being viewed
        const w = weeks[curWeek]
        if (w) setSelectedMonth(w.monthIndex)
      } else if (newMode === "quarterly" && viewMode === "monthly") {
        // Keep selectedMonth — quarter is derived from it
      }
      setViewMode(newMode)
      setTimeout(() => setTransitioning(false), 60)
    }, 120)
  }

  // ── Derived perspective state ──────────────────────────────
  const cellW           = CELL_W[viewMode]
  const selectedQuarter = Math.floor(selectedMonth / 3)
  const quarterLabel    = `Q${selectedQuarter + 1} · ${MONTH_ABBR[selectedQuarter * 3]}–${MONTH_ABBR[selectedQuarter * 3 + 2]}`

  const visibleWeeks = useMemo(() => {
    switch (viewMode) {
      case "annual":    return weeks
      case "monthly":   return weeks.filter((w) => w.monthIndex === selectedMonth)
      case "quarterly": return weeks.slice(selectedQuarter * 13, Math.min(selectedQuarter * 13 + 13, 52))
      case "weekly":    return weeks[selectedWeek] ? [weeks[selectedWeek]] : []
    }
  }, [weeks, viewMode, selectedMonth, selectedQuarter, selectedWeek])

  // 7 WeekDay cells for the weekly perspective
  const visibleDays = useMemo((): WeekDay[] => {
    if (viewMode !== "weekly") return []
    const week = weeks[selectedWeek]
    if (!week) return []
    const today = new Date()
    return Array.from({ length: 7 }, (_, d) => {
      const date = new Date(week.start.getTime() + d * 86400000)
      return {
        dayIndex: d, date,
        shortLabel: DAY_LABELS[d],
        dateLabel: `${MONTH_ABBR[date.getMonth()]} ${date.getDate()}`,
        isToday: date.toDateString() === today.toDateString(),
      }
    })
  }, [viewMode, weeks, selectedWeek])

  // Month spans row — shown for annual and quarterly only
  const activeMonthSpans = useMemo(() => {
    if (viewMode === "annual") return monthSpans
    if (viewMode === "quarterly") {
      const counts = new Map<number, number>()
      visibleWeeks.forEach((w) => counts.set(w.monthIndex, (counts.get(w.monthIndex) ?? 0) + 1))
      return monthSpans
        .filter((s) => counts.has(s.monthIndex))
        .map((s) => ({ ...s, weekCount: counts.get(s.monthIndex) ?? s.weekCount }))
    }
    return []
  }, [viewMode, monthSpans, visibleWeeks])

  // ── isAutoSave ─────────────────────────────────────────────
  const isAutoSave  = !!autoSaveUntil && nowTs < autoSaveUntil
  const remainingMs = isAutoSave ? autoSaveUntil! - nowTs : 0
  const countdownMM = String(Math.floor(remainingMs / 60000)).padStart(2, "0")
  const countdownSS = String(Math.floor((remainingMs % 60000) / 1000)).padStart(2, "0")

  // ── MPR dynamic rows ───────────────────────────────────────
  const dynamicMPRItems = useMemo<RhythmItem[]>(() =>
    mprState.lanes
      .filter((lane) => {
        const hasStatic = items.some((it) => it.category === "process-training" &&
          (it.mprSystem === lane.mprSystemKey || it.mprSystem === (lane.id as string)))
        return !hasStatic && mprState.processes.some((p) => p.laneId === lane.id)
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((lane): RhythmItem => ({
        id: `dynamic-${lane.id}`, label: `${lane.label} Training`,
        description: `Process training cadence for the ${lane.label} lane.`,
        frequency: "monthly", category: "process-training",
        mprSystem: lane.id as any, isLocked: false,
        owner: `${lane.label} Lead`, createdAt: new Date().toISOString(),
      })),
    [items, mprState.lanes, mprState.processes]
  )
  const allItems = useMemo(() => [...items, ...dynamicMPRItems], [items, dynamicMPRItems])

  const bySection = useMemo(() => {
    const map: Partial<Record<RhythmCategory, RhythmItem[]>> = {}
    allItems.forEach((item) => {
      if (!map[item.category]) map[item.category] = []
      map[item.category]!.push(item)
    })
    return map
  }, [allItems])

  // Published week sets per item
  const publishedSchedules = useMemo(() => {
    const result: Record<string, Set<number>> = {}
    allItems.forEach((item) => {
      if (customSchedules[item.id]) {
        result[item.id] = new Set(customSchedules[item.id])
      } else {
        const s = new Set<number>()
        weeks.forEach((w) => { if (firesInWeek(item.frequency, w.start, item.activeMonths)) s.add(w.index) })
        result[item.id] = s
      }
    })
    return result
  }, [allItems, customSchedules, weeks])

  const draftRemovedByItem = useMemo(() => {
    const r: Record<string, Set<number>> = {}
    draftMoves.forEach(({ itemId, fromWeek }) => { if (!r[itemId]) r[itemId] = new Set(); r[itemId].add(fromWeek) })
    return r
  }, [draftMoves])

  const draftAddedByItem = useMemo(() => {
    const r: Record<string, Set<number>> = {}
    draftMoves.forEach(({ itemId, toWeek }) => { if (!r[itemId]) r[itemId] = new Set(); r[itemId].add(toWeek) })
    return r
  }, [draftMoves])

  const currentWeek = weeks.find((w) => w.isCurrentWeek)

  // ── Schedule helpers ───────────────────────────────────────
  function applyMove(prev: Record<string, number[]>, itemId: string, fromWeek: number, toWeek: number): Record<string, number[]> {
    const item = allItems.find((i) => i.id === itemId)
    if (!item) return prev
    const base = prev[itemId] ? new Set(prev[itemId]) : new Set(weeks.filter((w) => firesInWeek(item.frequency, w.start, item.activeMonths)).map((w) => w.index))
    base.delete(fromWeek); base.add(toWeek)
    return { ...prev, [itemId]: [...base].sort((a, b) => a - b) }
  }

  function addMarker(itemId: string, weekIndex: number) {
    setCustomSchedules((prev) => {
      const item = allItems.find((i) => i.id === itemId)
      if (!item) return prev
      const base = prev[itemId] ? new Set(prev[itemId]) : new Set(weeks.filter((w) => firesInWeek(item.frequency, w.start, item.activeMonths)).map((w) => w.index))
      if (base.has(weekIndex)) return prev
      base.add(weekIndex)
      const next = { ...prev, [itemId]: [...base].sort((a, b) => a - b) }
      saveSchedules(next); return next
    })
  }

  function scheduleMarkers(itemId: string, weekIndices: number[]) {
    setCustomSchedules((prev) => {
      const item = allItems.find((i) => i.id === itemId)
      if (!item) return prev
      const base = prev[itemId] ? new Set(prev[itemId]) : new Set(weeks.filter((w) => firesInWeek(item.frequency, w.start, item.activeMonths)).map((w) => w.index))
      weekIndices.forEach((i) => base.add(i))
      const next = { ...prev, [itemId]: [...base].sort((a, b) => a - b) }
      saveSchedules(next); return next
    })
  }

  function confirmMove(enableAutoSave: boolean) {
    if (!pendingMove) return
    setCustomSchedules((prev) => { const next = applyMove(prev, pendingMove.itemId, pendingMove.fromWeek, pendingMove.toWeek); saveSchedules(next); return next })
    if (enableAutoSave) { setAutoSaveUntil(Date.now() + AUTO_SAVE_MS); setNowTs(Date.now()) }
    setPendingMove(null)
  }

  function publishDrafts() {
    setCustomSchedules((prev) => { let next = { ...prev }; draftMoves.forEach(({ itemId, fromWeek, toWeek }) => { next = applyMove(next, itemId, fromWeek, toWeek) }); saveSchedules(next); return next })
    setDraftMoves([]); setBulkEdit(false); setPublishConfirm(false)
  }

  function discardDrafts() { setDraftMoves([]); setBulkEdit(false) }

  // ── Drag handlers (active in non-weekly views) ─────────────
  function onBlockDragStart(e: React.DragEvent, itemId: string, weekIndex: number) {
    setDragging({ itemId, weekIndex })
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", `${itemId}:${weekIndex}`)
    const el = e.currentTarget as HTMLElement
    const ghost = el.cloneNode(true) as HTMLElement
    Object.assign(ghost.style, { position: "fixed", top: "-1000px", left: "-1000px", transform: "scale(1.15)", borderRadius: "8px", boxShadow: "0 12px 32px rgba(0,0,0,0.35)", opacity: "0.95", pointerEvents: "none" })
    document.body.appendChild(ghost)
    e.dataTransfer.setDragImage(ghost, ghost.offsetWidth / 2, ghost.offsetHeight / 2)
    setTimeout(() => ghost.remove(), 0)
  }

  function onCellDragOver(e: React.DragEvent, itemId: string, weekIndex: number, fires: boolean) {
    if (!dragging || dragging.itemId !== itemId || dragging.weekIndex === weekIndex || fires) return
    e.preventDefault(); e.dataTransfer.dropEffect = "move"
    if (dragOver?.itemId !== itemId || dragOver.weekIndex !== weekIndex) setDragOver({ itemId, weekIndex })
  }

  function onCellDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(null)
  }

  function onCellDrop(e: React.DragEvent, itemId: string, weekIndex: number, fires: boolean) {
    e.preventDefault()
    if (!dragging || dragging.itemId !== itemId || dragging.weekIndex === weekIndex || fires) return
    const from = dragging.weekIndex
    if (bulkEdit) {
      setDraftMoves((prev) => [...prev, { itemId, fromWeek: from, toWeek: weekIndex }])
    } else if (isAutoSave) {
      setCustomSchedules((prev) => { const next = applyMove(prev, itemId, from, weekIndex); saveSchedules(next); return next })
    } else {
      setPendingMove({ itemId, fromWeek: from, toWeek: weekIndex })
    }
    setDragging(null); setDragOver(null)
  }

  function handleBlockClick(item: RhythmItem, week: GridWeek) {
    if (bulkEdit) return
    let processes: ActiveBlock["processes"] = []
    if (item.category === "process-training") {
      const lane = mprState.lanes.find((l) => l.mprSystemKey === (item.mprSystem as string) || l.id === (item.mprSystem as string))
      if (lane) processes = mprState.processes.filter((p) => p.laneId === lane.id).map((p) => ({ id: p.id, title: p.title, writtenDoc: p.writtenDoc, videoUrl: p.videoUrl }))
    }
    setActiveBlock({ item, week, processes })
  }

  function handleAdd(item: RhythmItem) { addItem(item) }

  function linkProcess(itemId: string, processId: string) {
    setLinkedProcesses((prev) => {
      const next = { ...prev, [itemId]: processId }
      localStorage.setItem(LINKED_KEY, JSON.stringify(next))
      return next
    })
  }

  function unlinkProcess(itemId: string) {
    setLinkedProcesses((prev) => {
      const next = { ...prev }
      delete next[itemId]
      localStorage.setItem(LINKED_KEY, JSON.stringify(next))
      return next
    })
  }

  // ── Quarter navigation helpers ─────────────────────────────
  function prevQuarter() { setSelectedMonth((m) => ((Math.floor(m / 3) - 1 + 4) % 4) * 3) }
  function nextQuarter() { setSelectedMonth((m) => ((Math.floor(m / 3) + 1) % 4) * 3) }

  // ── Render ─────────────────────────────────────────────────
  const isWeekly   = viewMode === "weekly"
  const colCount   = isWeekly ? 7 : visibleWeeks.length
  const tableMinW  = LABEL_W + colCount * cellW

  return (
    <div className="flex h-full flex-col overflow-hidden">

      {/* ── Main header ─────────────────────────────────────── */}
      <header className="flex shrink-0 items-center justify-between border-b border-border bg-background px-6 py-4">
        <div>
          <h1 className="text-lg font-bold leading-tight">The Anchor</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            52-Week Rhythm Map · {YEAR} · {allItems.length} ingredients
            {currentWeek && <> · <span className="font-semibold text-orange-600">Week {currentWeek.weekNum}</span></>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Smart Lock indicator */}
          {isAutoSave && (
            <div className="flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-2.5 py-1.5">
              <Lock className="h-3.5 w-3.5 text-green-600" />
              <span className="text-xs font-semibold text-green-700">Auto-Save</span>
              <span className="font-mono text-xs font-bold text-green-800 tabular-nums">{countdownMM}:{countdownSS}</span>
            </div>
          )}
          <button
            onClick={() => bulkEdit ? discardDrafts() : setBulkEdit(true)}
            className={cn("flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors",
              bulkEdit ? "border-orange-400 bg-orange-50 text-orange-700 hover:bg-orange-100" : "border-border text-muted-foreground hover:bg-muted")}
          >
            <Edit3 className="h-3.5 w-3.5" />
            {bulkEdit ? "Exit Bulk Edit" : "Bulk Edit"}
          </button>
          <Button onClick={() => setWizardOpen(true)}>
            <PlusCircle className="h-4 w-4 mr-1.5" />Update the Anchor
          </Button>
        </div>
      </header>

      {/* ── Perspective sub-bar ──────────────────────────────── */}
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-background/80 px-6 py-2 backdrop-blur-sm">
        {/* 4-view toggle */}
        <div className="flex overflow-hidden rounded-lg border border-border text-xs">
          {VIEWS.map((v, i) => (
            <button
              key={v.id}
              onClick={() => switchView(v.id)}
              className={cn(
                "px-3 py-1.5 font-medium transition-colors",
                i > 0 && "border-l border-border",
                viewMode === v.id ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"
              )}
            >
              {v.label}
            </button>
          ))}
        </div>

        {/* Context-sensitive navigator */}
        <div className="flex items-center gap-2">
          {viewMode === "monthly" && (
            <div className="flex items-center overflow-hidden rounded-lg border border-border">
              <button onClick={() => setSelectedMonth((m) => (m + 11) % 12)} className="border-r border-border px-2 py-1.5 hover:bg-muted transition-colors"><ChevronLeft className="h-3.5 w-3.5" /></button>
              <span className="w-14 text-center text-sm font-semibold">{MONTH_ABBR[selectedMonth]}</span>
              <button onClick={() => setSelectedMonth((m) => (m + 1) % 12)} className="border-l border-border px-2 py-1.5 hover:bg-muted transition-colors"><ChevronRight className="h-3.5 w-3.5" /></button>
            </div>
          )}
          {viewMode === "quarterly" && (
            <div className="flex items-center overflow-hidden rounded-lg border border-border">
              <button onClick={prevQuarter} className="border-r border-border px-2 py-1.5 hover:bg-muted transition-colors"><ChevronLeft className="h-3.5 w-3.5" /></button>
              <span className="px-3 text-sm font-semibold">{quarterLabel}</span>
              <button onClick={nextQuarter} className="border-l border-border px-2 py-1.5 hover:bg-muted transition-colors"><ChevronRight className="h-3.5 w-3.5" /></button>
            </div>
          )}
          {viewMode === "weekly" && (
            <div className="flex items-center overflow-hidden rounded-lg border border-border">
              <button onClick={() => setSelectedWeek((w) => Math.max(0, w - 1))} className="border-r border-border px-2 py-1.5 hover:bg-muted transition-colors"><ChevronLeft className="h-3.5 w-3.5" /></button>
              <span className="px-3 text-sm font-semibold">
                Week {selectedWeek + 1} of 52
                {weeks[selectedWeek]?.isCurrentWeek && <span className="ml-1.5 rounded-full bg-orange-500 px-1.5 py-0.5 text-[9px] font-bold text-white">NOW</span>}
              </span>
              <button onClick={() => setSelectedWeek((w) => Math.min(51, w + 1))} className="border-l border-border px-2 py-1.5 hover:bg-muted transition-colors"><ChevronRight className="h-3.5 w-3.5" /></button>
            </div>
          )}
          {viewMode === "annual" && currentWeek && (
            <span className="text-xs text-muted-foreground">
              {Math.round((currentWeek.weekNum / 52) * 100)}% of {YEAR} complete
            </span>
          )}
        </div>
      </div>

      {/* ── Grid (fade on view switch) ───────────────────────── */}
      <div
        ref={wrapRef}
        className={cn(
          "flex-1 overflow-auto bg-[#F0F2F5] transition-opacity duration-[120ms]",
          transitioning && "opacity-0",
          bulkEdit && "pb-[72px]"
        )}
      >
        <table className="border-collapse" style={{ minWidth: `${tableMinW}px` }}>

          {/* ── thead ── */}
          <thead className="sticky top-0 z-20">
            {/* Month spans (annual + quarterly only) */}
            {activeMonthSpans.length > 0 && (
              <tr>
                <th className="sticky left-0 z-30 border-b border-r border-slate-600 bg-slate-800" style={{ width: LABEL_W, minWidth: LABEL_W }} />
                {activeMonthSpans.map((span) => (
                  <th key={span.monthIndex} colSpan={span.weekCount} className="border-r border-slate-600 bg-slate-800 py-1.5 text-center text-[11px] font-bold tracking-wide text-white">
                    {span.label}
                  </th>
                ))}
              </tr>
            )}

            {/* Column labels */}
            <tr>
              <th className="sticky left-0 z-30 border-b border-r border-slate-500 bg-slate-700 px-3 py-2 text-left text-xs font-semibold text-white" style={{ width: LABEL_W, minWidth: LABEL_W }}>
                {isWeekly ? `${weeks[selectedWeek]?.rangeLabel ?? "Week"} · ${YEAR}` : viewMode === "monthly" ? `${MONTH_ABBR[selectedMonth]} ${YEAR}` : "Ingredient"}
                {bulkEdit && <span className="ml-2 rounded-full bg-orange-500 px-1.5 py-0.5 text-[9px] font-bold text-white">BULK EDIT</span>}
              </th>

              {isWeekly
                ? visibleDays.map((day) => (
                    <th key={day.dayIndex}
                        className={cn("border-b border-r border-slate-500 py-1.5 text-center transition-colors",
                          day.isToday ? "bg-orange-500 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                        )}
                        style={{ width: cellW, minWidth: cellW }}>
                      <span className="block text-[11px] font-bold leading-none">{day.shortLabel}</span>
                      <span className="mt-0.5 block text-[9px] leading-none opacity-80">{day.dateLabel}</span>
                      {day.isToday && <span className="mt-0.5 block text-[8px] font-bold leading-none opacity-90">TODAY</span>}
                    </th>
                  ))
                : visibleWeeks.map((week) => (
                    <th key={week.index}
                        className={cn("border-b border-r border-slate-500 py-1.5 text-center transition-colors",
                          week.isCurrentWeek ? "bg-orange-500 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                        )}
                        style={{ width: cellW, minWidth: cellW }}>
                      <span className={cn("block leading-none", viewMode === "annual" ? "text-[9px]" : "text-[11px] font-semibold")}>
                        {viewMode === "annual" ? week.dayLabel : week.rangeLabel}
                      </span>
                      {week.isCurrentWeek && <span className="mt-0.5 block text-[8px] font-bold leading-none opacity-90">NOW</span>}
                    </th>
                  ))
              }
            </tr>
          </thead>

          {/* ── tbody ── */}
          <tbody>
            {SECTION_CONFIG.map((section) => {
              const sectionItems = bySection[section.id]
              if (!sectionItems || sectionItems.length === 0) return null
              return (
                <Fragment key={section.id}>
                  <tr>
                    <td className={cn("sticky left-0 z-10 border-b border-t border-border/40 px-4 py-2 text-xs font-bold uppercase tracking-widest", section.headerBg, section.color)} style={{ width: LABEL_W, minWidth: LABEL_W }}>
                      {section.icon}&nbsp;{section.label}
                      <span className="ml-1.5 font-normal normal-case opacity-60">· {section.sublabel}</span>
                    </td>
                    <td colSpan={colCount} className={cn("border-b border-t border-border/30", section.headerBg)} />
                  </tr>

                  {sectionItems.map((item) => {
                    const baseSet = publishedSchedules[item.id] ?? new Set<number>()
                    const removed = draftRemovedByItem[item.id]
                    const added   = draftAddedByItem[item.id]

                    return (
                      <tr key={item.id} className="group">
                        {/* Sticky label */}
                        <td className="sticky left-0 z-10 border-b border-r border-border/40 bg-white px-3 py-2.5 transition-colors group-hover:bg-orange-50/60" style={{ width: LABEL_W, minWidth: LABEL_W }}>
                          <div className="flex min-w-0 items-center gap-1.5">
                            {item.isLocked ? <Lock className="h-3 w-3 shrink-0 text-amber-500" /> : item.category === "process-training" ? <BookOpen className="h-3 w-3 shrink-0 text-primary/60" /> : null}
                            <span className={cn("truncate text-xs font-medium leading-tight", item.isLocked ? "text-amber-800" : "text-foreground")}>{item.label}</span>
                          </div>
                          {item.owner && <p className="mt-0.5 truncate pl-[18px] text-[10px] leading-tight text-muted-foreground">{item.owner}</p>}
                        </td>

                        {/* ── WEEKLY VIEW cells (7 days) ── */}
                        {isWeekly && visibleDays.map((day) => {
                          const weekFires  = baseSet.has(selectedWeek) && !removed?.has(selectedWeek) || (added?.has(selectedWeek) ?? false)
                          const isDraft    = (added?.has(selectedWeek) ?? false) && !(baseSet.has(selectedWeek) && !removed?.has(selectedWeek))
                          const fires      = weekFires && (item.frequency === "daily" ? true : day.dayIndex === 0)

                          return (
                            <td key={day.dayIndex}
                                className={cn("group/cell relative border-b border-r border-border/20 p-0", day.isToday ? "bg-orange-50" : "bg-white group-hover:bg-slate-50/40")}
                                style={{ width: cellW, minWidth: cellW, height: 40 }}>
                              {fires && (
                                <button onClick={() => handleBlockClick(item, weeks[selectedWeek])}
                                    title={`${item.label} · ${day.dateLabel}`}
                                    className="absolute inset-0 flex items-center justify-center transition-colors hover:bg-orange-100/60 cursor-pointer">
                                  <div className={cn("flex items-center justify-center rounded-[8px] shadow-sm transition-all",
                                      isDraft ? "border-2 border-dashed border-orange-500 bg-orange-100 opacity-70" : "bg-orange-400 hover:bg-orange-500",
                                      item.frequency === "daily" ? "h-[22px] w-[64px]" : "h-[28px] w-[56px]")}>
                                    <span className={cn("text-[10px] font-bold leading-none", isDraft ? "text-orange-600" : "text-white")}>
                                      {isDraft ? "~" : item.frequency === "daily" ? "●" : "✓"}
                                    </span>
                                  </div>
                                </button>
                              )}
                              {/* + button (weekly: adds the whole week marker) */}
                              {!fires && day.dayIndex === 0 && (
                                <button onClick={() => addMarker(item.id, selectedWeek)}
                                    title={`Add marker · ${item.label}`}
                                    className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-100 group-hover/cell:pointer-events-auto group-hover/cell:opacity-100 hover:bg-orange-50">
                                  <div className="flex h-6 w-9 items-center justify-center rounded-full border border-dashed border-slate-300 hover:border-orange-400 hover:bg-orange-50 transition-colors">
                                    <Plus className="h-3 w-3 text-slate-400 hover:text-orange-500 transition-colors" />
                                  </div>
                                </button>
                              )}
                            </td>
                          )
                        })}

                        {/* ── WEEK-COLUMN VIEW cells (monthly/quarterly/annual) ── */}
                        {!isWeekly && visibleWeeks.map((week) => {
                          const isBase      = baseSet.has(week.index) && !removed?.has(week.index)
                          const isDraftBlock = added?.has(week.index) ?? false
                          const fires       = isBase || isDraftBlock
                          const isDraft     = isDraftBlock
                          const isDragSrc   = dragging?.itemId === item.id && dragging.weekIndex === week.index
                          const isGhost     = !fires && dragOver?.itemId === item.id && dragOver.weekIndex === week.index

                          return (
                            <td key={week.index}
                                className={cn("group/cell relative border-b border-r border-border/20 p-0",
                                  week.isCurrentWeek ? "bg-orange-50" : "bg-white group-hover:bg-slate-50/40")}
                                style={{ width: cellW, minWidth: cellW, height: 40 }}
                                onDragOver={(e) => onCellDragOver(e, item.id, week.index, fires)}
                                onDragLeave={onCellDragLeave}
                                onDrop={(e) => onCellDrop(e, item.id, week.index, fires)}>

                              {isGhost && (
                                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                  <div className={cn("rounded-[8px] bg-orange-300 opacity-50", viewMode === "annual" ? "h-[22px] w-[14px]" : "h-[28px] w-[56px]")} />
                                </div>
                              )}

                              {fires && (
                                <button
                                  draggable={!item.isLocked}
                                  onDragStart={(e) => { if (!item.isLocked) onBlockDragStart(e, item.id, week.index) }}
                                  onClick={() => handleBlockClick(item, week)}
                                  title={bulkEdit && !item.isLocked ? `Drag to reschedule · ${item.label}` : `${item.label} · ${week.rangeLabel}`}
                                  className={cn("absolute inset-0 flex items-center justify-center transition-colors",
                                    !bulkEdit && !item.isLocked && "hover:bg-orange-100/60",
                                    isDragSrc && "opacity-25",
                                    item.isLocked ? "cursor-default" : bulkEdit ? "cursor-grab active:cursor-grabbing" : "cursor-pointer")}>
                                  <div className={cn("rounded-[8px] shadow-sm transition-all",
                                      isDraft ? "border-2 border-dashed border-orange-500 bg-orange-100 opacity-70" : "bg-orange-400 hover:bg-orange-500",
                                      viewMode === "annual" ? "h-[22px] w-[14px]" : "flex h-[28px] w-[56px] items-center justify-center")}>
                                    {viewMode !== "annual" && (
                                      <span className={cn("text-[10px] font-bold leading-none", isDraft ? "text-orange-600" : "text-white")}>
                                        {isDraft ? "~" : "✓"}
                                      </span>
                                    )}
                                  </div>
                                </button>
                              )}

                              {/* + hover button */}
                              {!fires && !isGhost && !dragging && (
                                <button onClick={() => addMarker(item.id, week.index)}
                                    title={`Add marker · ${item.label} · ${week.rangeLabel}`}
                                    className={cn("pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-100",
                                      "group-hover/cell:pointer-events-auto group-hover/cell:opacity-100 hover:bg-orange-50")}>
                                  {viewMode === "annual"
                                    ? <Plus className="h-2.5 w-2.5 text-slate-300 hover:text-orange-500 transition-colors" />
                                    : <div className="flex h-6 w-9 items-center justify-center rounded-full border border-dashed border-slate-300 hover:border-orange-400 hover:bg-orange-50 transition-colors">
                                        <Plus className="h-3 w-3 text-slate-400 hover:text-orange-500 transition-colors" />
                                      </div>
                                  }
                                </button>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── Bulk Edit Action Bar ─────────────────────────────── */}
      {bulkEdit && (
        <div className="shrink-0 flex items-center justify-between border-t border-border bg-white px-6 py-4 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-2.5">
            <div className={cn("h-2.5 w-2.5 rounded-full transition-colors", draftMoves.length > 0 ? "animate-pulse bg-orange-500" : "bg-slate-300")} />
            <span className="text-sm font-medium text-foreground">
              {draftMoves.length === 0 ? "Drag orange blocks to reschedule" : `${draftMoves.length} ${draftMoves.length === 1 ? "change" : "changes"} staged`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={discardDrafts} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">Discard Changes</button>
            <button onClick={() => setPublishConfirm(true)} disabled={draftMoves.length === 0}
                className={cn("flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-colors",
                  draftMoves.length > 0 ? "bg-slate-800 text-white hover:bg-slate-700" : "cursor-not-allowed bg-muted text-muted-foreground")}>
              <CheckCircle2 className="h-4 w-4" />Publish Rhythm Map
            </button>
          </div>
        </div>
      )}

      {/* ── Modals ──────────────────────────────────────────── */}
      {pendingMove && (
        <MoveConfirmModal
          item={allItems.find((i) => i.id === pendingMove.itemId)}
          fromWeek={weeks[pendingMove.fromWeek]} toWeek={weeks[pendingMove.toWeek]}
          onConfirm={confirmMove} onCancel={() => setPendingMove(null)}
        />
      )}
      {publishConfirm && <PublishConfirmModal draftCount={draftMoves.length} onConfirm={publishDrafts} onCancel={() => setPublishConfirm(false)} />}
      {wizardOpen && <AnchorWizard onAddIngredient={() => { setWizardOpen(false); setDialogOpen(true) }} onScheduleEvent={() => { setWizardOpen(false); setScheduleOpen(true) }} onClose={() => setWizardOpen(false)} />}
      {scheduleOpen && <ScheduleEventDialog allItems={allItems} weeks={weeks} onSchedule={scheduleMarkers} onClose={() => setScheduleOpen(false)} />}

      {/* ── Block Detail Overlay ─────────────────────────────── */}
      {activeBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]" onClick={() => setActiveBlock(null)}>
          <div className="w-[420px] max-w-[90vw] overflow-hidden rounded-2xl border border-border bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between bg-orange-500 px-5 py-4">
              <div>
                <h3 className="text-base font-bold leading-tight text-white">{activeBlock.item.label}</h3>
                <p className="mt-1 text-xs text-orange-100">{activeBlock.week.rangeLabel} · Week {activeBlock.week.weekNum} · <span className="font-semibold capitalize">{activeBlock.item.frequency}</span></p>
              </div>
              <button onClick={() => setActiveBlock(null)} className="mt-0.5 text-orange-200 hover:text-white transition-colors"><X className="h-5 w-5" /></button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-5 space-y-4">
              {activeBlock.item.description && <p className="text-sm leading-relaxed text-muted-foreground">{activeBlock.item.description}</p>}
              <div className="flex flex-wrap gap-2">
                {activeBlock.item.owner && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Owner</span>
                    <Badge variant="secondary" className="text-xs">{activeBlock.item.owner}</Badge>
                  </div>
                )}
                {activeBlock.item.isLocked && (
                  <div className="flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-1">
                    <Lock className="h-3 w-3 text-amber-600" />
                    <span className="text-[11px] font-semibold text-amber-800">Non-Negotiable</span>
                  </div>
                )}
              </div>
              {activeBlock.item.category === "process-training" && (
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <BookOpen className="h-3.5 w-3.5 text-orange-500" />
                    <span className="text-xs font-bold uppercase tracking-wide text-foreground">Linked MPR Processes</span>
                  </div>
                  {activeBlock.processes.length === 0
                    ? <div className="rounded-lg border border-dashed border-border bg-muted/40 px-4 py-4 text-center">
                        <p className="text-xs text-muted-foreground">No processes in this lane yet.</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">Go to <strong>The MPR</strong> to upload processes.</p>
                      </div>
                    : <>
                        <div className="mb-3">
                          <select
                            value={linkedProcesses[activeBlock.item.id] ?? ""}
                            onChange={(e) => {
                              if (e.target.value) linkProcess(activeBlock.item.id, e.target.value)
                              else unlinkProcess(activeBlock.item.id)
                            }}
                            className="w-full rounded-md border border-border bg-white px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-orange-400/30"
                          >
                            <option value="">Show all processes</option>
                            {activeBlock.processes.map((p) => (
                              <option key={p.id} value={p.id}>{p.title}</option>
                            ))}
                          </select>
                        </div>
                        <ul className="space-y-2">
                          {(linkedProcesses[activeBlock.item.id]
                            ? activeBlock.processes.filter((p) => p.id === linkedProcesses[activeBlock.item.id])
                            : activeBlock.processes
                          ).map((p) => (
                            <li key={p.id} className="flex items-center gap-3 rounded-lg border border-border/60 bg-slate-50 px-3 py-2.5">
                              <div className="h-2 w-2 shrink-0 rounded-full bg-orange-400" />
                              <span className="flex-1 truncate text-sm font-medium text-foreground">{p.title}</span>
                              {(p.writtenDoc || p.videoUrl) && (
                                <Badge variant="outline" className="shrink-0 text-[10px]">
                                  {p.writtenDoc && p.videoUrl ? "Full Doc" : p.writtenDoc ? "Written" : "Video"}
                                </Badge>
                              )}
                            </li>
                          ))}
                        </ul>
                      </>
                  }
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <AddRhythmDialog open={dialogOpen} onOpenChange={setDialogOpen} onAdd={handleAdd} />
    </div>
  )
}

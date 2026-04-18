/**
 * ============================================================
 * Anchor Engine — The 52-Week Rhythm Dashboard
 * ============================================================
 * Organized by six frequency tiers (Daily → Annually).
 *
 * HARD-CODED RULE: Vision Story Review is a Non-Negotiable.
 *   - Frequency: Semi-Annually (every other month = 6x/year)
 *   - Months: Feb, Apr, Jun, Aug, Oct, Dec
 *   - Cannot be deleted or moved.
 *
 * PROCESS TRAINING: Five rows pulled from the MPR systems.
 *   Marketing · Sales · Operations · Administration · Handbook
 *
 * COACH ACTION: "Update the Anchor" adds new items that
 *   self-categorize into the correct tier on save.
 * ============================================================
 */
import { useState, useMemo } from "react"
import {
  PlusCircle, Lock, Trash2, ChevronDown, ChevronUp,
  BookOpen, Calendar,
} from "lucide-react"
import { Button }          from "@/components/ui/button"
import { Badge }           from "@/components/ui/badge"
import { Separator }       from "@/components/ui/separator"
import { AddRhythmDialog } from "./AddRhythmDialog"
import {
  TIER_CONFIG,
  MPR_SYSTEMS,
  SEMI_ANNUAL_MONTHS,
  type FrequencyTier,
  type RhythmItem,
} from "./anchor-types"
import { DEFAULT_RHYTHM_ITEMS } from "./anchor-data"
import { cn } from "@/lib/utils"

// ─────────────────────────────────────────────
// CURRENT WEEK UTILITY
// ─────────────────────────────────────────────
function getCurrentWeek(): number {
  const now   = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  return Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7)
}

function getCurrentMonth(): number {
  return new Date().getMonth() + 1 // 1-indexed
}

const MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]

// ─────────────────────────────────────────────
// YEAR PROGRESS BAR
// ─────────────────────────────────────────────
function YearProgressBar() {
  const week    = getCurrentWeek()
  const pct     = Math.round((week / 52) * 100)
  const month   = getCurrentMonth()

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Jan</span>
        {MONTH_ABBR.map((m, i) => (
          <span
            key={m}
            className={cn(
              "hidden sm:block",
              i + 1 === month && "font-bold text-foreground"
            )}
          >
            {m}
          </span>
        ))}
        <span>Dec</span>
      </div>
      <div className="relative h-3 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
        {/* Week tick */}
        <div
          className="absolute top-0 h-full w-0.5 bg-background"
          style={{ left: `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Week {week} of 52</span>
        <span>{pct}% of the year complete</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// NON-NEGOTIABLE BANNER
// ─────────────────────────────────────────────
function NonNegotiableBanner() {
  const currentMonth = getCurrentMonth()
  const nextFiring   = SEMI_ANNUAL_MONTHS.find((m) => m >= currentMonth) ?? SEMI_ANNUAL_MONTHS[0]

  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-5 py-4">
      <Lock className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-bold text-amber-900">Non-Negotiable Rule</p>
          <Badge variant="warning" className="text-[10px] px-2">Locked</Badge>
        </div>
        <p className="text-xs text-amber-800 mt-0.5">
          <strong>Vision Story Review</strong> must occur every other month —{" "}
          <strong>6× per year</strong>. This rhythm cannot be removed.
        </p>
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          {SEMI_ANNUAL_MONTHS.map((m) => (
            <span
              key={m}
              className={cn(
                "rounded px-2 py-0.5 text-[11px] font-semibold",
                m === currentMonth
                  ? "bg-amber-500 text-white"
                  : m < currentMonth
                  ? "bg-amber-200 text-amber-700 line-through opacity-60"
                  : m === nextFiring
                  ? "bg-amber-300 text-amber-900 ring-1 ring-amber-500"
                  : "bg-amber-100 text-amber-700"
              )}
            >
              {MONTH_ABBR[m - 1]}
            </span>
          ))}
          <span className="text-[11px] text-amber-700 ml-1">
            · Next: <strong>{MONTH_ABBR[nextFiring - 1]}</strong>
          </span>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// RHYTHM ITEM ROW
// ─────────────────────────────────────────────
function RhythmRow({
  item,
  tierColor,
  tierBorder,
  onDelete,
}: {
  item: RhythmItem
  tierColor: string
  tierBorder: string
  onDelete: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const mprMeta = item.mprSystem ? MPR_SYSTEMS[item.mprSystem] : null

  return (
    <div className={cn("rounded-md border bg-background", tierBorder)}>
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Category icon */}
        <div className="shrink-0">
          {item.isLocked ? (
            <Lock className="h-3.5 w-3.5 text-amber-500" />
          ) : item.category === "process-training" ? (
            <BookOpen className={cn("h-3.5 w-3.5", mprMeta?.color ?? "text-muted-foreground")} />
          ) : (
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>

        {/* Label + badges */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium leading-tight">{item.label}</span>
            {item.isLocked && (
              <Badge variant="warning" className="text-[10px] px-1.5 py-0">Non-Negotiable</Badge>
            )}
            {item.category === "process-training" && mprMeta && (
              <Badge variant="ghost" className={cn("text-[10px] px-1.5 py-0", mprMeta.color)}>
                MPR · {mprMeta.label}
              </Badge>
            )}
          </div>
          {item.owner && (
            <p className="text-xs text-muted-foreground mt-0.5">Owner: {item.owner}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {item.description && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={() => setExpanded((p) => !p)}
            >
              {expanded
                ? <ChevronUp  className="h-3.5 w-3.5 text-muted-foreground" />
                : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              }
            </Button>
          )}
          {!item.isLocked && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(item.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Expanded description */}
      {expanded && item.description && (
        <div className="border-t border-border/50 px-4 py-3 bg-muted/30">
          <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
          {item.activeMonths && item.activeMonths.length > 0 && (
            <div className="flex items-center gap-1 mt-2">
              <span className="text-xs text-muted-foreground">Fires:</span>
              {item.activeMonths.map((m) => (
                <span key={m} className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {MONTH_ABBR[m - 1]}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// PROCESS TRAINING PANEL
// Shown as a distinct sub-section within each tier that has MPR items
// ─────────────────────────────────────────────
function ProcessTrainingPanel({
  items,
  tierColor,
  tierBorder,
  onDelete,
}: {
  items: RhythmItem[]
  tierColor: string
  tierBorder: string
  onDelete: (id: string) => void
}) {
  if (items.length === 0) return null

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 mb-2 px-1">
        <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Process Training
        </span>
        <span className="text-xs text-muted-foreground">— MPR Systems</span>
      </div>
      <div className="flex flex-col gap-1.5 pl-4 border-l-2 border-dashed border-muted">
        {items.map((item) => (
          <RhythmRow
            key={item.id}
            item={item}
            tierColor={tierColor}
            tierBorder={tierBorder}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// FREQUENCY TIER SECTION
// ─────────────────────────────────────────────
function TierSection({
  tier,
  items,
  onDelete,
}: {
  tier: typeof TIER_CONFIG[number]
  items: RhythmItem[]
  onDelete: (id: string) => void
}) {
  const [collapsed, setCollapsed] = useState(false)

  const generalItems  = items.filter((i) => i.category !== "process-training")
  const trainingItems = items.filter((i) => i.category === "process-training")
  const total         = items.length

  return (
    <div className={cn("rounded-lg border overflow-hidden", tier.border)}>
      {/* Tier header */}
      <button
        className={cn(
          "flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:brightness-95",
          tier.headerBg
        )}
        onClick={() => setCollapsed((p) => !p)}
      >
        <span className="text-lg leading-none">{tier.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn("font-bold text-sm", tier.color)}>{tier.label}</span>
            <span className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-bold",
              tier.bg, tier.color
            )}>
              {total} {total === 1 ? "item" : "items"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{tier.sublabel}</p>
        </div>
        {collapsed
          ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          : <ChevronUp   className="h-4 w-4 text-muted-foreground shrink-0" />
        }
      </button>

      {/* Tier body */}
      {!collapsed && (
        <div className="flex flex-col gap-1.5 p-4">
          {total === 0 && (
            <p className="text-center text-xs text-muted-foreground py-4">
              No rhythms in this tier yet — use "Update the Anchor" to add one.
            </p>
          )}

          {/* General items first */}
          {generalItems.map((item) => (
            <RhythmRow
              key={item.id}
              item={item}
              tierColor={tier.color}
              tierBorder={tier.border}
              onDelete={onDelete}
            />
          ))}

          {/* Process Training sub-section */}
          {trainingItems.length > 0 && generalItems.length > 0 && (
            <Separator className="my-1" />
          )}
          <ProcessTrainingPanel
            items={trainingItems}
            tierColor={tier.color}
            tierBorder={tier.border}
            onDelete={onDelete}
          />
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export function AnchorEngine() {
  const [items,      setItems]      = useState<RhythmItem[]>(DEFAULT_RHYTHM_ITEMS)
  const [dialogOpen, setDialogOpen] = useState(false)

  const currentWeek  = getCurrentWeek()
  const totalItems   = items.length
  const nonNegCount  = items.filter((i) => i.isLocked).length
  const trainingCount= items.filter((i) => i.category === "process-training").length
  const customCount  = items.filter((i) => i.category === "general").length

  // Group items by frequency tier
  const byTier = useMemo(() => {
    const map: Record<FrequencyTier, RhythmItem[]> = {
      daily: [], weekly: [], monthly: [], quarterly: [], "semi-annually": [], annually: [],
    }
    items.forEach((item) => map[item.frequency].push(item))
    return map
  }, [items])

  function handleAdd(item: RhythmItem) {
    setItems((prev) => [...prev, item])
  }

  function handleDelete(id: string) {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id)
      if (target?.isLocked) return prev  // Non-negotiables cannot be deleted
      return prev.filter((i) => i.id !== id)
    })
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── Header ──────────────────────────────────────────── */}
      <header className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
        <div>
          <h1 className="text-lg font-bold leading-tight">The Anchor</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            52-Week Rhythm Engine · {totalItems} active rhythms
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground mr-2">
            <span className="flex items-center gap-1">
              <Lock className="h-3 w-3 text-amber-500" />
              {nonNegCount} locked
            </span>
            <span className="flex items-center gap-1">
              <BookOpen className="h-3 w-3 text-primary" />
              {trainingCount} training
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {customCount} general
            </span>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <PlusCircle className="h-4 w-4" />
            Update the Anchor
          </Button>
        </div>
      </header>

      {/* ── Scrollable body ─────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-4xl flex flex-col gap-5 p-6">

          {/* Year progress */}
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold">
                Week {currentWeek} of 52
              </p>
              <Badge variant="secondary">{new Date().getFullYear()}</Badge>
            </div>
            <YearProgressBar />
          </div>

          {/* Non-Negotiable banner */}
          <NonNegotiableBanner />

          {/* Frequency tiers */}
          {TIER_CONFIG.map((tier) => (
            <TierSection
              key={tier.id}
              tier={tier}
              items={byTier[tier.id]}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </div>

      {/* ── Add dialog ──────────────────────────────────────── */}
      <AddRhythmDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onAdd={handleAdd}
      />
    </div>
  )
}

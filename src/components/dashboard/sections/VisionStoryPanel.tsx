/**
 * VisionStoryPanel
 * Rich completed-state display for Module 01: Vision Story.
 * Replaces the simple quote banner when all 7 categories are present.
 * Shows the full vision — statement, financials, all 7 narratives, and The Why.
 */
import { Quote, Home, Package, Users, Target, Building2, UserCheck, Flame } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatUSD } from "@/services/databridge/validator"
import type { VisionStoryFinancials } from "@/types/bopos"

interface VisionStoryPanelProps {
  vision: VisionStoryFinancials
  /** Called when "Review" is clicked — opens the ModuleViewer */
  onReview?: () => void
}

// ─────────────────────────────────────────────
// FINANCIAL CELL — current → target
// ─────────────────────────────────────────────
function FinancialCell({
  label,
  current,
  target,
}: {
  label: string
  current: string
  target: string
}) {
  return (
    <div className="flex flex-col gap-0.5 px-4 py-3">
      <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">{label}</span>
      <div className="flex flex-wrap items-baseline gap-1.5">
        <span className="text-xs text-white/40 line-through">{current}</span>
        <span className="text-sm font-bold text-white">→ {target}</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// NARRATIVE CELL — icon + label + narrative text
// ─────────────────────────────────────────────
function NarrativeCell({
  label,
  icon: Icon,
  accent,
  text,
}: {
  label: string
  icon: React.ComponentType<{ className?: string }>
  accent: string
  text: string
}) {
  if (!text) return null
  return (
    <div className="flex flex-col gap-1.5 px-4 py-3">
      <div className="flex items-center gap-1.5">
        <Icon className={cn("h-3 w-3 shrink-0", accent)} />
        <span className={cn("text-[10px] font-bold uppercase tracking-widest", accent)}>{label}</span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{text}</p>
    </div>
  )
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export function VisionStoryPanel({ vision, onReview }: VisionStoryPanelProps) {
  if (!vision.visionStatement) return null

  return (
    <div className="overflow-hidden rounded-xl border border-border shadow-sm">

      {/* ── Header ───────────────────────────────────────── */}
      <div className="flex items-center justify-between bg-bop-dark-blue px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Module 01</span>
          <span className="text-white/20">·</span>
          <span className="text-xs font-semibold text-white">Vision Story</span>
          <span className="text-white/20">·</span>
          <span className="text-[10px] text-white/50">{vision.term} · Target {vision.targetYear}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
            Complete
          </span>
          {onReview && (
            <button
              onClick={onReview}
              className="rounded-md px-2.5 py-1 text-[10px] font-medium text-white/50 hover:bg-white/10 hover:text-white transition-colors"
            >
              Review
            </button>
          )}
        </div>
      </div>

      {/* ── Vision Statement ─────────────────────────────── */}
      <div className="flex items-start gap-3 border-b border-border bg-muted/20 px-5 py-4">
        <Quote className="mt-0.5 h-5 w-5 shrink-0 text-bop-dark-orange" />
        <p className="text-sm font-semibold italic leading-snug text-foreground">
          "{vision.visionStatement}"
        </p>
      </div>

      {/* ── Financial Summary ────────────────────────────── */}
      <div className="grid grid-cols-2 divide-x divide-border border-b border-border bg-bop-dark-blue/90 sm:grid-cols-4">
        <FinancialCell
          label="Revenue"
          current={formatUSD(vision.currentAnnualRevenue)}
          target={formatUSD(vision.targetAnnualRevenue)}
        />
        <FinancialCell
          label="Profit Margin"
          current={`${vision.currentProfitMargin}%`}
          target={`${vision.targetProfitMargin}%`}
        />
        <FinancialCell
          label="Owner Pay"
          current={formatUSD(vision.currentOwnerPay)}
          target={formatUSD(vision.targetOwnerPay)}
        />
        <FinancialCell
          label="Team Size"
          current={`${vision.currentTeamSize} people`}
          target={`${vision.targetTeamSize} people`}
        />
      </div>

      {/* ── 6 Narrative Categories — 3-col grid ─────────── */}
      <div className="grid grid-cols-1 divide-y divide-border border-b border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <NarrativeCell
          label="Family & Freedom"
          icon={Home}
          accent="text-violet-600"
          text={vision.familyAndFreedom}
        />
        <NarrativeCell
          label="Products & Services"
          icon={Package}
          accent="text-bop-light-blue"
          text={vision.productsAndServices}
        />
        <NarrativeCell
          label="Personnel"
          icon={Users}
          accent="text-blue-600"
          text={vision.personnelNarrative}
        />
      </div>

      <div className="grid grid-cols-1 divide-y divide-border border-b border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <NarrativeCell
          label="Client Type"
          icon={Target}
          accent="text-amber-600"
          text={vision.clientType}
        />
        <NarrativeCell
          label="Culture"
          icon={Building2}
          accent="text-emerald-600"
          text={vision.culture}
        />
        <NarrativeCell
          label="Owner's Role"
          icon={UserCheck}
          accent="text-rose-600"
          text={vision.ownerRole}
        />
      </div>

      {/* ── The Why ──────────────────────────────────────── */}
      {vision.ownerWhy && (
        <div className="flex items-start gap-3 bg-bop-light-orange/5 px-5 py-4">
          <Flame className="mt-0.5 h-4 w-4 shrink-0 text-bop-dark-orange" />
          <div>
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-bop-dark-orange">
              The Why
            </span>
            <p className="text-xs font-medium italic leading-relaxed text-foreground">
              "{vision.ownerWhy}"
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

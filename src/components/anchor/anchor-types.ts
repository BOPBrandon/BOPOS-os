/**
 * ============================================================
 * Anchor Engine — Type System
 * ============================================================
 */

// The six frequency tiers — used by fire logic (firesInWeek)
export type FrequencyTier =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "semi-annually"
  | "annually"

/** How many times per year each tier fires */
export const TIER_FREQUENCY_COUNT: Record<FrequencyTier, number> = {
  "daily":           365,
  "weekly":          52,
  "monthly":         12,
  "quarterly":       4,
  "semi-annually":   6,
  "annually":        1,
}

/** Which calendar months a semi-annual item fires (every other month) */
export const SEMI_ANNUAL_MONTHS = [2, 4, 6, 8, 10, 12] as const

/** The five MPR process systems */
export type MPRSystem =
  | "marketing"
  | "sales"
  | "operations"
  | "administration"
  | "handbook"

export const MPR_SYSTEMS: Record<MPRSystem, { label: string; description: string; color: string }> = {
  marketing:      { label: "Marketing",      description: "Lead generation, brand, content systems",        color: "text-pink-600"   },
  sales:          { label: "Sales",          description: "Pipeline, closing, CRM, follow-up sequences",    color: "text-blue-600"   },
  operations:     { label: "Operations",     description: "Delivery, scheduling, quality control",          color: "text-amber-600"  },
  administration: { label: "Administration", description: "Finance, HR, legal, compliance, tools",          color: "text-slate-600"  },
  handbook:       { label: "Handbook",       description: "Culture, onboarding, role clarity, core values", color: "text-purple-600" },
}

/**
 * RhythmCategory determines the visual section grouping in the grid.
 * The 8 master-cadence categories match the rows in the BOP Master Schedule.
 * Legacy categories (non-negotiable, process-training, general) remain for
 * backward compatibility with existing locked items and MPR-dynamic rows.
 */
export type RhythmCategory =
  | "weekly"            // Weekly cadence items (team meetings, check-ins)
  | "training"          // Training sessions (various frequencies)
  | "bop-birthdays"     // BOP Birthdays & Anniversaries
  | "qb-roles"          // Quarterback responsibilities
  | "monthly"           // Monthly reviews and events
  | "quarterly"         // Quarterly planning and reviews
  | "semi-annually"     // Semi-annual evaluations
  | "annually"          // Annual strategic items
  | "non-negotiable"    // Locked items — Vision Story Review
  | "process-training"  // MPR system training cadence (dynamic)
  | "general"           // Coach-added custom rhythm items

export interface RhythmItem {
  id: string
  label: string
  description?: string
  frequency: FrequencyTier
  category: RhythmCategory
  /** Set for process-training items */
  mprSystem?: MPRSystem
  /** True = item cannot be deleted or moved */
  isLocked?: boolean
  /** Owner initials or name */
  owner?: string
  /** ISO date string when item was added */
  createdAt: string
  /** For display: which months this fires (primarily for semi-annual) */
  activeMonths?: number[]
}

// ─────────────────────────────────────────────
// SECTION CONFIG — controls visual grouping
// ─────────────────────────────────────────────
export interface SectionConfig {
  id: RhythmCategory
  label: string
  sublabel: string
  icon: string
  color: string
  bg: string
  border: string
  headerBg: string
}

export const SECTION_CONFIG: SectionConfig[] = [
  {
    id:        "weekly",
    label:     "Weekly",
    sublabel:  "52x per year",
    icon:      "📅",
    color:     "text-violet-700",
    bg:        "bg-violet-50",
    border:    "border-violet-200",
    headerBg:  "bg-violet-100",
  },
  {
    id:        "training",
    label:     "Training",
    sublabel:  "Monthly cadence",
    icon:      "📚",
    color:     "text-blue-700",
    bg:        "bg-blue-50",
    border:    "border-blue-200",
    headerBg:  "bg-blue-100",
  },
  {
    id:        "bop-birthdays",
    label:     "BOP Birthdays & Anniversaries",
    sublabel:  "Annual touchpoints",
    icon:      "🎂",
    color:     "text-pink-700",
    bg:        "bg-pink-50",
    border:    "border-pink-200",
    headerBg:  "bg-pink-100",
  },
  {
    id:        "qb-roles",
    label:     "QB Roles",
    sublabel:  "Quarterback responsibilities",
    icon:      "🏈",
    color:     "text-yellow-700",
    bg:        "bg-yellow-50",
    border:    "border-yellow-200",
    headerBg:  "bg-yellow-100",
  },
  {
    id:        "monthly",
    label:     "Monthly",
    sublabel:  "12x per year",
    icon:      "📆",
    color:     "text-emerald-700",
    bg:        "bg-emerald-50",
    border:    "border-emerald-200",
    headerBg:  "bg-emerald-100",
  },
  {
    id:        "quarterly",
    label:     "Quarterly",
    sublabel:  "4x per year",
    icon:      "🗓️",
    color:     "text-orange-700",
    bg:        "bg-orange-50",
    border:    "border-orange-200",
    headerBg:  "bg-orange-100",
  },
  {
    id:        "semi-annually",
    label:     "Semi-Annually",
    sublabel:  "6x per year",
    icon:      "📋",
    color:     "text-amber-700",
    bg:        "bg-amber-50",
    border:    "border-amber-200",
    headerBg:  "bg-amber-100",
  },
  {
    id:        "annually",
    label:     "Annually",
    sublabel:  "1x per year",
    icon:      "🎯",
    color:     "text-rose-700",
    bg:        "bg-rose-50",
    border:    "border-rose-200",
    headerBg:  "bg-rose-100",
  },
  // ── Legacy sections ──────────────────────────
  {
    id:        "non-negotiable",
    label:     "Non-Negotiable",
    sublabel:  "Always",
    icon:      "🔒",
    color:     "text-amber-800",
    bg:        "bg-amber-50",
    border:    "border-amber-300",
    headerBg:  "bg-amber-100",
  },
  {
    id:        "process-training",
    label:     "Process Training",
    sublabel:  "MPR-linked",
    icon:      "📖",
    color:     "text-sky-700",
    bg:        "bg-sky-50",
    border:    "border-sky-200",
    headerBg:  "bg-sky-100",
  },
  {
    id:        "general",
    label:     "General",
    sublabel:  "Custom rhythms",
    icon:      "⭐",
    color:     "text-slate-700",
    bg:        "bg-slate-50",
    border:    "border-slate-200",
    headerBg:  "bg-slate-100",
  },
]

// ─────────────────────────────────────────────
// TIER_CONFIG — kept for backward compat
// (fire logic in anchor-grid.ts uses FrequencyTier)
// ─────────────────────────────────────────────
export interface FrequencyTierConfig {
  id: FrequencyTier
  label: string
  sublabel: string
  countPerYear: number
  icon: string
  color: string
  bg: string
  border: string
  headerBg: string
}

export const TIER_CONFIG: FrequencyTierConfig[] = [
  { id: "daily",          label: "Daily",         sublabel: "365x per year",                   countPerYear: 365, icon: "🌅", color: "text-sky-700",    bg: "bg-sky-50",    border: "border-sky-200",    headerBg: "bg-sky-100"    },
  { id: "weekly",         label: "Weekly",        sublabel: "52x per year",                    countPerYear: 52,  icon: "📅", color: "text-violet-700", bg: "bg-violet-50", border: "border-violet-200", headerBg: "bg-violet-100" },
  { id: "monthly",        label: "Monthly",       sublabel: "12x per year",                    countPerYear: 12,  icon: "📆", color: "text-emerald-700",bg: "bg-emerald-50",border: "border-emerald-200",headerBg: "bg-emerald-100"},
  { id: "quarterly",      label: "Quarterly",     sublabel: "4x per year",                     countPerYear: 4,   icon: "🗓️",color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200", headerBg: "bg-orange-100" },
  { id: "semi-annually",  label: "Semi-Annually", sublabel: "Every other month · 6x per year", countPerYear: 6,   icon: "📋", color: "text-amber-700",  bg: "bg-amber-50",  border: "border-amber-200",  headerBg: "bg-amber-100"  },
  { id: "annually",       label: "Annually",      sublabel: "1x per year",                     countPerYear: 1,   icon: "🎯", color: "text-rose-700",   bg: "bg-rose-50",   border: "border-rose-200",   headerBg: "bg-rose-100"   },
]

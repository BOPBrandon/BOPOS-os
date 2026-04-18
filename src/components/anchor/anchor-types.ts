/**
 * ============================================================
 * Anchor Engine — Type System
 * ============================================================
 */

// The six frequency tiers — ordered from highest to lowest cadence
export type FrequencyTier =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "semi-annually"   // every other month = 6x/year (Non-Negotiable tier)
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

/** Category determines visual treatment in the UI */
export type RhythmCategory =
  | "non-negotiable"    // Locked items — cannot be deleted; Vision Story Review
  | "process-training"  // MPR system training cadence
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
  /** Owner name or role */
  owner?: string
  /** ISO date string when item was added */
  createdAt: string
  /** For display: which months this fires (primarily for semi-annual) */
  activeMonths?: number[]
}

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
  {
    id:           "daily",
    label:        "Daily",
    sublabel:     "365x per year",
    countPerYear: 365,
    icon:         "🌅",
    color:        "text-sky-700",
    bg:           "bg-sky-50",
    border:       "border-sky-200",
    headerBg:     "bg-sky-100",
  },
  {
    id:           "weekly",
    label:        "Weekly",
    sublabel:     "52x per year",
    countPerYear: 52,
    icon:         "📅",
    color:        "text-violet-700",
    bg:           "bg-violet-50",
    border:       "border-violet-200",
    headerBg:     "bg-violet-100",
  },
  {
    id:           "monthly",
    label:        "Monthly",
    sublabel:     "12x per year",
    countPerYear: 12,
    icon:         "📆",
    color:        "text-emerald-700",
    bg:           "bg-emerald-50",
    border:       "border-emerald-200",
    headerBg:     "bg-emerald-100",
  },
  {
    id:           "quarterly",
    label:        "Quarterly",
    sublabel:     "4x per year",
    countPerYear: 4,
    icon:         "🗓️",
    color:        "text-orange-700",
    bg:           "bg-orange-50",
    border:       "border-orange-200",
    headerBg:     "bg-orange-100",
  },
  {
    id:           "semi-annually",
    label:        "Semi-Annually",
    sublabel:     "Every other month · 6x per year",
    countPerYear: 6,
    icon:         "📋",
    color:        "text-amber-700",
    bg:           "bg-amber-50",
    border:       "border-amber-200",
    headerBg:     "bg-amber-100",
  },
  {
    id:           "annually",
    label:        "Annually",
    sublabel:     "1x per year",
    countPerYear: 1,
    icon:         "🎯",
    color:        "text-rose-700",
    bg:           "bg-rose-50",
    border:       "border-rose-200",
    headerBg:     "bg-rose-100",
  },
]

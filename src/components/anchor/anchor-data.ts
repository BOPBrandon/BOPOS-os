/**
 * ============================================================
 * Anchor Engine — Master Cadence Data
 * ============================================================
 * BOP 2026 Master Schedule — migrated from image_18 / image_19.
 * Categories match the visual section groupings in the Anchor grid.
 * Frequency drives the fire logic (firesInWeek) independently of
 * which visual section an item belongs to.
 * ============================================================
 */

import type { RhythmItem } from "./anchor-types"
import { SEMI_ANNUAL_MONTHS } from "./anchor-types"

function id(slug: string) { return `bop-${slug}` }
const TODAY = new Date().toISOString().slice(0, 10)

// ─────────────────────────────────────────────
// NON-NEGOTIABLE (locked — hard-coded rule)
// ─────────────────────────────────────────────
export const NON_NEGOTIABLE_ITEMS: RhythmItem[] = [
  {
    id:           id("vision-story-review"),
    label:        "Vision Story Review",
    description:  "Revisit the Vision Story with the owner. Are the targets still right? Is the Why still true? Update financials.",
    frequency:    "semi-annually",
    category:     "non-negotiable",
    isLocked:     true,
    owner:        "Coach + Owner",
    createdAt:    TODAY,
    activeMonths: [...SEMI_ANNUAL_MONTHS],
  },
]

// ─────────────────────────────────────────────
// MASTER CADENCE — BOP 2026 Schedule
// ─────────────────────────────────────────────

// WEEKLY
const WEEKLY_ITEMS: RhythmItem[] = [
  { id: id("team-meeting"),          label: "Team Meeting",               frequency: "weekly", category: "weekly",  owner: "BW", createdAt: TODAY },
  { id: id("coaches-meeting"),       label: "Coaches Meeting",            frequency: "weekly", category: "weekly",  owner: "TJ", createdAt: TODAY },
  { id: id("mktg-sales-meeting"),    label: "Marketing & Sales Meeting",  frequency: "weekly", category: "weekly",  owner: "SB", createdAt: TODAY },
  { id: id("check-ins"),             label: "Check Ins",                  frequency: "weekly", category: "weekly",  owner: "AS", createdAt: TODAY },
  { id: id("coaches-scorecard"),     label: "Coaches Scorecard",          frequency: "weekly", category: "weekly",  owner: "TJ", createdAt: TODAY },
]

// TRAINING
const TRAINING_ITEMS: RhythmItem[] = [
  { id: id("training-admin-hr"),     label: "Admin/HR Reviews",            frequency: "monthly", category: "training", owner: "AB", createdAt: TODAY },
  { id: id("training-marketing"),    label: "Marketing Training",          frequency: "monthly", category: "training", owner: "AS", createdAt: TODAY },
  { id: id("training-sales"),        label: "Sales Training",              frequency: "monthly", category: "training", owner: "SB", createdAt: TODAY },
  { id: id("training-bop-module"),   label: "BOP Module Training",         frequency: "monthly", category: "training", owner: "TJ", createdAt: TODAY },
  { id: id("training-art-coaching"), label: "Art of Coaching Training",    frequency: "monthly", category: "training", owner: "TJ", createdAt: TODAY },
  { id: id("training-construction"), label: "Construction Training",       frequency: "monthly", category: "training", owner: "TJ", createdAt: TODAY },
  { id: id("training-streak-tech"),  label: "Streak/Slack/Tech Training",  frequency: "monthly", category: "training", owner: "TJ", createdAt: TODAY },
  { id: id("training-maturity-26"),  label: "2026 Maturity Training",      frequency: "monthly", category: "training", owner: "SB", createdAt: TODAY },
]

// BOP BIRTHDAYS & ANNIVERSARIES (all owned by AS)
const BOP_BIRTHDAY_ITEMS: RhythmItem[] = [
  { id: id("bday-birthday"),         label: "Birthday",              frequency: "annually", category: "bop-birthdays", owner: "AS", createdAt: TODAY },
  { id: id("bday-kids-spouse"),      label: "Kids/Spouse Birthdays", frequency: "annually", category: "bop-birthdays", owner: "AS", createdAt: TODAY },
  { id: id("bday-work-anniv"),       label: "Work Anniversary",      frequency: "annually", category: "bop-birthdays", owner: "AS", createdAt: TODAY },
  { id: id("bday-family-anniv"),     label: "Family Anniversary",    frequency: "annually", category: "bop-birthdays", owner: "AS", createdAt: TODAY },
  { id: id("bday-client-anniv"),     label: "Client Anniversary",    frequency: "annually", category: "bop-birthdays", owner: "AS", createdAt: TODAY },
]

// QB ROLES
const QB_ROLE_ITEMS: RhythmItem[] = [
  { id: id("qb-12wk-prep"),          label: "12 Week Plan LIVE Preparation", frequency: "quarterly", category: "qb-roles", owner: "BG", createdAt: TODAY },
]

// MONTHLY
const MONTHLY_ITEMS: RhythmItem[] = [
  { id: id("monthly-12wk-review"),   label: "12 Week Plan Review",         frequency: "monthly", category: "monthly", owner: "BW", createdAt: TODAY },
  { id: id("monthly-vision-day"),    label: "Vision Day",                  frequency: "monthly", category: "monthly", owner: "SB", createdAt: TODAY },
  { id: id("monthly-speaker"),       label: "Speaker Events",              frequency: "monthly", category: "monthly", owner: "AS", createdAt: TODAY },
  { id: id("monthly-speaker-prep"),  label: "PREP for Speaker Events",     frequency: "monthly", category: "monthly", owner: "AS", createdAt: TODAY },
  { id: id("monthly-masterclass"),   label: "Masterclasses & Roundtables", frequency: "monthly", category: "monthly", owner: "KD", createdAt: TODAY },
  { id: id("monthly-prayer"),        label: "Team Prayer Day",             frequency: "monthly", category: "monthly", owner: "AS", createdAt: TODAY },
  { id: id("monthly-mktg-review"),   label: "MARKETING Review",            frequency: "monthly", category: "monthly", owner: "AS", createdAt: TODAY },
  { id: id("monthly-l2-dashboard"),  label: "Level Two Dashboard Review",  frequency: "monthly", category: "monthly", owner: "SB", createdAt: TODAY },
]

// QUARTERLY
const QUARTERLY_ITEMS: RhythmItem[] = [
  { id: id("qtr-ideal-weekly"),      label: "Ideal Weekly Schedule Review", frequency: "quarterly", category: "quarterly", owner: "AS", createdAt: TODAY },
]

// SEMI-ANNUALLY
const SEMI_ANNUAL_ITEMS: RhythmItem[] = [
  { id: id("semi-team-dinner"),      label: "Local Team Dinner",  frequency: "semi-annually", category: "semi-annually", createdAt: TODAY, activeMonths: [...SEMI_ANNUAL_MONTHS] },
  { id: id("semi-bank-eval"),        label: "Bank Account Eval",  frequency: "semi-annually", category: "semi-annually", createdAt: TODAY, activeMonths: [...SEMI_ANNUAL_MONTHS] },
  { id: id("semi-pl-review"),        label: "P&L Review",         frequency: "semi-annually", category: "semi-annually", createdAt: TODAY, activeMonths: [...SEMI_ANNUAL_MONTHS] },
]

// ANNUALLY
const ANNUAL_ITEMS: RhythmItem[] = [
  { id: id("annual-delegation"),     label: "Director's Complete Delegation Roadmap", frequency: "annually", category: "annually", createdAt: TODAY },
  { id: id("annual-bop-offsite"),    label: "BOP Offsite Training",                   frequency: "annually", category: "annually", createdAt: TODAY },
  { id: id("annual-perf-evals"),     label: "Perf. Evals",                            frequency: "annually", category: "annually", createdAt: TODAY },
  { id: id("annual-prep-week"),      label: "PREP WEEK",                              frequency: "annually", category: "annually", createdAt: TODAY },
  { id: id("annual-letter"),         label: "Annual Letter",                          frequency: "annually", category: "annually", createdAt: TODAY },
  { id: id("annual-financial-barn"), label: "Financial Barn",                         frequency: "annually", category: "annually", createdAt: TODAY },
  { id: id("annual-next-budget"),    label: "Next Year Budget",                       frequency: "annually", category: "annually", createdAt: TODAY },
  { id: id("annual-estate-plan"),    label: "Estate Planning Eval",                   frequency: "annually", category: "annually", createdAt: TODAY },
  { id: id("annual-insurance"),      label: "Insurance Eval",                         frequency: "annually", category: "annually", createdAt: TODAY },
  { id: id("annual-coach-sched"),    label: "COACH: Coaching Schedule for '26",       frequency: "annually", category: "annually", createdAt: TODAY },
  { id: id("annual-swag"),           label: "SWAG Inventory/Order",                   frequency: "annually", category: "annually", createdAt: TODAY },
]

export const MASTER_CADENCE_ITEMS: RhythmItem[] = [
  ...WEEKLY_ITEMS,
  ...TRAINING_ITEMS,
  ...BOP_BIRTHDAY_ITEMS,
  ...QB_ROLE_ITEMS,
  ...MONTHLY_ITEMS,
  ...QUARTERLY_ITEMS,
  ...SEMI_ANNUAL_ITEMS,
  ...ANNUAL_ITEMS,
]

// ─────────────────────────────────────────────
// FULL DEFAULT SET
// ─────────────────────────────────────────────
export const DEFAULT_RHYTHM_ITEMS: RhythmItem[] = [
  ...NON_NEGOTIABLE_ITEMS,
  ...MASTER_CADENCE_ITEMS,
]

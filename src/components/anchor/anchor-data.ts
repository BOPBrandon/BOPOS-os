/**
 * ============================================================
 * Anchor Engine — Default Rhythm Data
 * ============================================================
 * Pre-populated rhythm items for a new BOPOS client.
 * Non-negotiables are locked. Process Training items pull
 * from the five MPR systems.
 *
 * NON-NEGOTIABLE RULE (hard-coded):
 *   Vision Story Review → semi-annually → fires months 2,4,6,8,10,12
 *   This item can NEVER be deleted or moved.
 * ============================================================
 */

import type { RhythmItem } from "./anchor-types"
import { SEMI_ANNUAL_MONTHS } from "./anchor-types"

function id(slug: string) { return `default-${slug}` }
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
// PROCESS TRAINING (pulled from the 5 MPR systems)
// ─────────────────────────────────────────────
export const PROCESS_TRAINING_ITEMS: RhythmItem[] = [
  {
    id:          id("training-marketing"),
    label:       "Marketing System Training",
    description: "Review and train the team on the current marketing system: lead gen, content, and brand standards.",
    frequency:   "monthly",
    category:    "process-training",
    mprSystem:   "marketing",
    isLocked:    false,
    owner:       "Marketing Lead",
    createdAt:   TODAY,
  },
  {
    id:          id("training-sales"),
    label:       "Sales System Training",
    description: "Pipeline review, objection handling, CRM hygiene, and closing sequence walk-through.",
    frequency:   "monthly",
    category:    "process-training",
    mprSystem:   "sales",
    isLocked:    false,
    owner:       "Sales Lead",
    createdAt:   TODAY,
  },
  {
    id:          id("training-operations"),
    label:       "Operations System Training",
    description: "Delivery standards, scheduling process, quality control checklist, and escalation protocols.",
    frequency:   "monthly",
    category:    "process-training",
    mprSystem:   "operations",
    isLocked:    false,
    owner:       "Ops Lead",
    createdAt:   TODAY,
  },
  {
    id:          id("training-administration"),
    label:       "Administration System Training",
    description: "Finance, HR, legal, and tool stack review. Ensure every team member can access what they need.",
    frequency:   "quarterly",
    category:    "process-training",
    mprSystem:   "administration",
    isLocked:    false,
    owner:       "Owner / Admin Lead",
    createdAt:   TODAY,
  },
  {
    id:          id("training-handbook"),
    label:       "Handbook Review & Update",
    description: "Review core values in action, onboarding updates, role clarity changes, and culture health.",
    frequency:   "quarterly",
    category:    "process-training",
    mprSystem:   "handbook",
    isLocked:    false,
    owner:       "Owner",
    createdAt:   TODAY,
  },
]

// ─────────────────────────────────────────────
// GENERAL DEFAULT RHYTHMS
// ─────────────────────────────────────────────
export const DEFAULT_GENERAL_ITEMS: RhythmItem[] = [
  // Daily
  {
    id:          id("daily-huddle"),
    label:       "Daily Huddle",
    description: "10-minute team sync: good news, daily numbers, stuck points.",
    frequency:   "daily",
    category:    "general",
    owner:       "Integrator",
    createdAt:   TODAY,
  },

  // Weekly
  {
    id:          id("weekly-scorecard"),
    label:       "Weekly Scorecard Review",
    description: "Review the 5–15 leading indicators. Any number off-track gets an owner and a plan.",
    frequency:   "weekly",
    category:    "general",
    owner:       "Integrator",
    createdAt:   TODAY,
  },
  {
    id:          id("weekly-lma"),
    label:       "L10 / Leadership Meeting",
    description: "Weekly 90-minute leadership team meeting: Scorecard, Rocks, headlines, IDS.",
    frequency:   "weekly",
    category:    "general",
    owner:       "Visionary + Integrator",
    createdAt:   TODAY,
  },

  // Monthly
  {
    id:          id("monthly-financials"),
    label:       "Monthly Financial Review",
    description: "P&L, Real Revenue, bank account balances, Profit First allocations. Validate all figures.",
    frequency:   "monthly",
    category:    "general",
    owner:       "Owner",
    createdAt:   TODAY,
  },
  {
    id:          id("monthly-1on1"),
    label:       "Team 1-on-1s",
    description: "Individual check-ins with each direct report: wins, challenges, development.",
    frequency:   "monthly",
    category:    "general",
    owner:       "Integrator",
    createdAt:   TODAY,
  },

  // Quarterly
  {
    id:          id("quarterly-rocks"),
    label:       "Quarterly Rocks Planning",
    description: "Set the 3–5 most important priorities for the next 90 days. Assign owners. Remove blockers.",
    frequency:   "quarterly",
    category:    "general",
    owner:       "Leadership Team",
    createdAt:   TODAY,
  },
  {
    id:          id("quarterly-profit-distribution"),
    label:       "Profit Distribution",
    description: "Transfer 50% of Profit account balance to owners. Review tax account balance.",
    frequency:   "quarterly",
    category:    "general",
    owner:       "Owner",
    createdAt:   TODAY,
  },

  // Semi-Annually (non-negotiable already covers Vision Story Review)
  {
    id:          id("semi-annual-performance-reviews"),
    label:       "Team Performance Reviews",
    description: "Formal review of each team member against role scorecard and accountabilities.",
    frequency:   "semi-annually",
    category:    "general",
    owner:       "Integrator",
    createdAt:   TODAY,
    activeMonths: [1, 7],
  },

  // Annually
  {
    id:          id("annual-planning"),
    label:       "Annual Planning Day",
    description: "Full-day off-site: review the year, set the 3 Annual Goals, map the next 52 weeks.",
    frequency:   "annually",
    category:    "general",
    owner:       "Leadership Team",
    createdAt:   TODAY,
  },
  {
    id:          id("annual-exit-review"),
    label:       "Exit & Succession Review",
    description: "Assess business value, key-person risk, and readiness to run without the owner.",
    frequency:   "annually",
    category:    "general",
    owner:       "Owner",
    createdAt:   TODAY,
  },
]

// ─────────────────────────────────────────────
// FULL DEFAULT SET
// ─────────────────────────────────────────────
export const DEFAULT_RHYTHM_ITEMS: RhythmItem[] = [
  ...NON_NEGOTIABLE_ITEMS,
  ...PROCESS_TRAINING_ITEMS,
  ...DEFAULT_GENERAL_ITEMS,
]

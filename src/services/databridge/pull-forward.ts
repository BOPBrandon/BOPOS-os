/**
 * ============================================================
 * DataBridge — PullForward Engine
 * ============================================================
 * When a BOPOS module is marked "completed", its data must
 * automatically cascade into every downstream component that
 * depends on it. This is the "completed tool → live fields"
 * contract.
 *
 * Architecture:
 *  - PULL_FORWARD_MAP defines explicit source → targets
 *  - pullForward() applies the mapping to a ClientProfile
 *  - Each mapping is a pure transform: (source data) → partial profile
 *  - The result is merged (never replaces) into the existing profile
 *
 * Four Build Filter check:
 *  ✦ One-Click      — one function call cascades all downstream fields
 *  ✦ Scalable       — map-based dispatch; adding a new module = one entry
 *  ✦ Use What We Have — reads from existing types; no new abstractions
 *  ✦ Continual Progress — partial merges ensure no completed work is lost
 * ============================================================
 */

import type {
  ClientProfile,
  ModuleSlot,
  VisionStoryFinancials,
  RealRevenue,
  BankAccountAllocation,
} from "@/types/bopos"
import { applyAllocations, roundCents } from "./validator"

// ─────────────────────────────────────────────
// PULL-FORWARD MAP
// Defines what each module affects when completed.
// ─────────────────────────────────────────────

type PullForwardTransform = (
  moduleData: Record<string, unknown>,
  profile: ClientProfile
) => Partial<ClientProfile>

const PULL_FORWARD_MAP: Partial<Record<ModuleSlot, PullForwardTransform>> = {

  /**
   * Module 01 — Vision Story
   * → Populates visionStory financials on the OS/Profit dashboard
   * → Seeds targetAnnualRevenue into realRevenue for future planning
   */
  "module-01-vision-story": (data, profile) => {
    const vision = data as Partial<VisionStoryFinancials>
    const updatedVision: VisionStoryFinancials = {
      ...profile.visionStory,
      ...(vision.currentAnnualRevenue !== undefined && { currentAnnualRevenue: vision.currentAnnualRevenue }),
      ...(vision.targetAnnualRevenue  !== undefined && { targetAnnualRevenue:  vision.targetAnnualRevenue  }),
      ...(vision.targetYear           !== undefined && { targetYear:           vision.targetYear           }),
      ...(vision.currentProfitMargin  !== undefined && { currentProfitMargin:  vision.currentProfitMargin  }),
      ...(vision.targetProfitMargin   !== undefined && { targetProfitMargin:   vision.targetProfitMargin   }),
      ...(vision.currentTeamSize      !== undefined && { currentTeamSize:      vision.currentTeamSize      }),
      ...(vision.targetTeamSize       !== undefined && { targetTeamSize:       vision.targetTeamSize       }),
      ...(vision.visionStatement      !== undefined && { visionStatement:      vision.visionStatement      }),
      ...(vision.ownerWhy             !== undefined && { ownerWhy:             vision.ownerWhy             }),
    }
    return { visionStory: updatedVision }
  },

  /**
   * Module 04 — Subdivided Bank Accounts
   * Part 1: Calculates Real Revenue from totalRevenue - totalCOGS
   * Part 2: Persists allocation percentages
   * Part 3: Re-derives computed monthly amounts (Math Redundancy)
   */
  "module-04-bank-accounts": (data, profile) => {
    const raw = data as Partial<BankAccountAllocation>
    const merged: BankAccountAllocation = { ...profile.bankAccounts, ...raw }

    // Derive Real Revenue if totalRevenue and totalCOGS are present
    if (merged.totalRevenue !== undefined && merged.totalCOGS !== undefined) {
      merged.realRevenue = roundCents(merged.totalRevenue - merged.totalCOGS)
      merged.monthlyRealRevenue = roundCents(merged.realRevenue / 12)
    }

    // Use monthly real revenue from Module 04 data if available,
    // otherwise fall back to legacy realRevenue field
    const monthlyRR =
      merged.monthlyRealRevenue ??
      roundCents(profile.realRevenue.realRevenue / 12)

    const updated = applyAllocations(merged, monthlyRR)

    // Also keep legacy realRevenue in sync for backward compatibility
    const legacyRR: RealRevenue = {
      ...profile.realRevenue,
      grossRevenue:       merged.totalRevenue      ?? profile.realRevenue.grossRevenue,
      materialsCosts:     merged.totalCOGS         ?? profile.realRevenue.materialsCosts,
      subcontractorCosts: 0,
      realRevenue:        merged.realRevenue        ?? profile.realRevenue.realRevenue,
    }

    return {
      bankAccounts: updated,
      realRevenue:  legacyRR,
    }
  },

  /**
   * Module 06 — Ideal Weekly Schedule
   * → Captures the owner's scheduled block structure
   * → No financial cascade; rhythm impact only
   */
  "module-06-ideal-weekly-schedule": (_data, _profile) => {
    // Schedule data is stored inside the module record itself.
    // No top-level ClientProfile fields are overwritten.
    return {}
  },

  /**
   * Module 20 — Annual Planning
   * → Seeds Anchor rhythms with planned weeks from the annual plan
   */
  "module-20-annual-planning": (data) => {
    const { weekThemes } = data as { weekThemes?: Array<{ week: number; theme: string }> }
    if (!weekThemes) return {}

    const anchorRhythms = weekThemes.map((wt) => ({
      weekNumber: wt.week,
      theme: wt.theme,
      status: "planned" as const,
    }))

    return { anchorRhythms }
  },
}

// ─────────────────────────────────────────────
// PULL-FORWARD FUNCTION
// ─────────────────────────────────────────────

export interface PullForwardResult {
  updatedProfile: ClientProfile
  fieldsAffected: string[]
  modulesTriggered: ModuleSlot[]
}

/**
 * pullForward
 * Applies the cascade for a single completed module.
 *
 * @param moduleSlot  The module that was just completed
 * @param profile     The current ClientProfile
 * @returns           Updated profile + audit trail of what changed
 *
 * @example
 *   const { updatedProfile } = pullForward("module-04-bank-accounts", profile)
 *   // updatedProfile.bankAccounts (including realRevenue) is now in sync
 */
export function pullForward(
  moduleSlot: ModuleSlot,
  profile: ClientProfile
): PullForwardResult {
  const module = profile.modules[moduleSlot]
  if (!module) {
    return {
      updatedProfile: profile,
      fieldsAffected: [],
      modulesTriggered: [],
    }
  }

  const transform = PULL_FORWARD_MAP[moduleSlot]
  if (!transform) {
    return {
      updatedProfile: profile,
      fieldsAffected: [],
      modulesTriggered: [moduleSlot],
    }
  }

  const moduleData = module.data ?? {}
  const partial = transform(moduleData, profile)
  const fieldsAffected = Object.keys(partial)

  const updatedProfile: ClientProfile = {
    ...profile,
    ...partial,
    updatedAt: new Date().toISOString().slice(0, 10),
    modules: {
      ...profile.modules,
      [moduleSlot]: { ...module, status: "completed" },
    },
  }

  return {
    updatedProfile,
    fieldsAffected,
    modulesTriggered: [moduleSlot],
  }
}

/**
 * pullForwardAll
 * Cascades ALL completed modules in dependency order.
 * Use this after a bulk import (e.g., Drive sync) to ensure
 * the entire profile is internally consistent.
 *
 * Dependency order: 01 → 04 → 06 → 20
 */
export const PULL_FORWARD_ORDER: ModuleSlot[] = [
  "module-01-vision-story",
  "module-04-bank-accounts",
  "module-06-ideal-weekly-schedule",
  "module-20-annual-planning",
]

export function pullForwardAll(profile: ClientProfile): PullForwardResult {
  let current = profile
  const allFields: string[] = []
  const allModules: ModuleSlot[] = []

  for (const slot of PULL_FORWARD_ORDER) {
    const mod = current.modules[slot]
    if (mod?.status === "completed") {
      const result = pullForward(slot, current)
      current = result.updatedProfile
      allFields.push(...result.fieldsAffected)
      allModules.push(...result.modulesTriggered)
    }
  }

  return {
    updatedProfile: current,
    fieldsAffected: [...new Set(allFields)],
    modulesTriggered: [...new Set(allModules)],
  }
}

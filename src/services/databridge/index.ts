/**
 * ============================================================
 * DataBridge — The 10/80/10 Engine
 * ============================================================
 * DataBridge is the central orchestrator for all client data
 * movement inside BOPOS. Every read, write, validation, and
 * import passes through this surface.
 *
 * THE 10/80/10 MODEL:
 *  ┌─────────────────────────────────────────────────────────┐
 *  │  10%  Opening   │  B.I.G. Wins → Previous Tool Review   │
 *  │  80%  Work      │  Current Work (the module session)     │
 *  │  10%  Closing   │  Validate → PullForward → Save        │
 *  └─────────────────────────────────────────────────────────┘
 *
 * Usage:
 *   const bridge = DataBridge.create(clientProfile)
 *   const session = bridge.openSession()
 *   // ... user works through phases ...
 *   const closed = await bridge.closeSession(session, updatedProfile)
 *
 * ============================================================
 */

import type {
  ClientProfile,
  SessionData,
  ModuleSlot,
  DriveConfig,
  ValidationReport,
} from "@/types/bopos"

// Re-export all sub-services so consumers import from one place
export * from "./validator"
export * from "./pull-forward"
export * from "./session"
export * from "./google-drive"

import { validateFinancials }              from "./validator"
import { pullForwardAll }                  from "./pull-forward"
import { openSession, closeSession }       from "./session"
import { importFromDrive }                 from "./google-drive"
import type { DriveImportResult }          from "./google-drive"
import type { PullForwardResult }          from "./pull-forward"

// ─────────────────────────────────────────────
// DEFAULT CLIENT PROFILE FACTORY
// Returns a blank-slate profile with safe defaults.
// ─────────────────────────────────────────────

export function createBlankProfile(
  id: string,
  businessName: string,
  ownerName: string
): ClientProfile {
  const today = new Date().toISOString().slice(0, 10)

  return {
    id,
    businessName,
    ownerName,
    ownerEmail: "",
    industry: "",
    createdAt: today,
    updatedAt: today,

    visionStory: {
      term:                 "3-year",
      targetYear:           new Date().getFullYear() + 3,
      familyAndFreedom:     "",
      currentAnnualRevenue: 0,
      targetAnnualRevenue:  0,
      currentProfitMargin:  0,
      targetProfitMargin:   15,
      currentOwnerPay:      0,
      targetOwnerPay:       0,
      productsAndServices:  "",
      currentTeamSize:      1,
      targetTeamSize:       5,
      personnelNarrative:   "",
      clientType:           "",
      culture:              "",
      ownerRole:            "",
      ownerWhy:             "",
      visionStatement:      "",
    },

    mission: {
      missionStatement: "",
      wordCount:        0,
      keywords:         [],
    },

    coreValues: {
      values: [],
    },

    realRevenue: {
      grossRevenue:       0,
      materialsCosts:     0,
      subcontractorCosts: 0,
      realRevenue:        0,
      period:             "annual",
      periodStart:        today,
    },

    bankAccounts: {
      // Real Revenue (Part 1 of Module 04)
      totalRevenue:             0,
      totalCOGS:                0,
      realRevenue:              0,
      monthlyRealRevenue:       0,
      // Business structure
      businessStructure:              "",
      sCorporElectionRecommended:     false,
      // Income label
      incomeLabel: "Income",
      // Current allocations (where the business is today)
      currentProfitPercent:    5,
      currentOwnersPayPercent: 50,
      currentTaxPercent:       15,
      currentOpexPercent:      25,
      currentCapexPercent:     5,
      // Target allocations (Priority Solutions destination)
      targetProfitPercent:     10,
      targetOwnersPayPercent:  50,
      targetTaxPercent:        15,
      targetOpexPercent:       20,
      targetCapexPercent:      5,
      // Legacy aliases kept for validator compatibility
      profitPercent:    5,
      ownersPayPercent: 50,
      taxPercent:       15,
      opexPercent:      25,
      capexPercent:     5,
    },

    anchorRhythms: Array.from({ length: 52 }, (_, i) => ({
      weekNumber: i + 1,
      theme:      "",
      status:     "planned" as const,
    })),

    modules: {},
  }
}

// ─────────────────────────────────────────────
// DATABRIDGE CLASS
// ─────────────────────────────────────────────

export interface DataBridgeCloseResult {
  session: SessionData
  profile: ClientProfile
  validation: ValidationReport
  pullForward: PullForwardResult
}

export class DataBridge {
  private profile: ClientProfile

  private constructor(profile: ClientProfile) {
    this.profile = profile
  }

  /** Create a DataBridge instance from an existing profile */
  static create(profile: ClientProfile): DataBridge {
    return new DataBridge(profile)
  }

  /** Create a DataBridge instance from scratch */
  static blank(id: string, businessName: string, ownerName: string): DataBridge {
    return new DataBridge(createBlankProfile(id, businessName, ownerName))
  }

  // ── 10% Opening ──────────────────────────────────────────

  /**
   * openSession
   * Initializes the Session Opening Sequence for the current profile.
   * Returns a SessionData object in the "big_wins" phase.
   */
  openSession(): SessionData {
    return openSession(this.profile)
  }

  // ── 80% Work ─────────────────────────────────────────────

  /**
   * importFromDrive
   * BYOC: fetches Drive files, maps them to modules, and updates
   * the profile in-place. Run pullForwardAll afterward to cascade.
   */
  async importFromDrive(config: DriveConfig): Promise<DriveImportResult> {
    const result = await importFromDrive(config, this.profile)
    this.profile = result.updatedProfile
    return result
  }

  /**
   * completeModule
   * Marks a module as completed and triggers PullForward cascade.
   * Returns the updated profile and the list of affected fields.
   */
  completeModule(slot: ModuleSlot, data: Record<string, unknown>): PullForwardResult {
    // Merge data into the module
    const existing = this.profile.modules[slot]
    const today    = new Date().toISOString().slice(0, 10)

    this.profile = {
      ...this.profile,
      modules: {
        ...this.profile.modules,
        [slot]: {
          ...existing,
          id:          slot,
          slot:        existing?.slot ?? 0,
          label:       existing?.label ?? slot,
          layer:       existing?.layer ?? 1,
          category:    existing?.category ?? "",
          status:      "completed" as const,
          completedAt: today,
          data,
        },
      },
    }

    // PullForward cascades this module's data downstream
    const result = pullForwardAll(this.profile)
    this.profile = result.updatedProfile
    return result
  }

  // ── 10% Closing ──────────────────────────────────────────

  /**
   * closeSession
   * The closing 10%:
   *  1. Closes the session
   *  2. Runs Math Redundancy validation on all financials
   *  3. Runs PullForward on any newly completed modules
   *  4. Updates the profile
   *
   * Returns a full audit of what happened.
   */
  async closeSession(session: SessionData): Promise<DataBridgeCloseResult> {
    // 1. Close session
    const closedSession = closeSession(session)

    // 2. Validate financials
    const validation = validateFinancials(this.profile)

    // 3. Pull forward all completed modules
    const pullResult = pullForwardAll(this.profile)
    this.profile = pullResult.updatedProfile

    return {
      session:     closedSession,
      profile:     this.profile,
      validation,
      pullForward: pullResult,
    }
  }

  // ── Utilities ─────────────────────────────────────────────

  getProfile(): ClientProfile {
    return this.profile
  }

  validate(): ValidationReport {
    return validateFinancials(this.profile)
  }

  /**
   * getModuleCompletionStats
   * Returns a breakdown of module status counts — useful for dashboard rings.
   */
  getModuleCompletionStats(): {
    total: number
    completed: number
    inProgress: number
    notStarted: number
    completionPercent: number
  } {
    const all   = Object.values(this.profile.modules).filter(Boolean)
    const total = 24
    const completed  = all.filter((m) => m?.status === "completed").length
    const inProgress = all.filter((m) => m?.status === "in_progress").length
    const notStarted = total - completed - inProgress

    return {
      total,
      completed,
      inProgress,
      notStarted,
      completionPercent: Math.round((completed / total) * 100),
    }
  }
}

// ─────────────────────────────────────────────
// DEMO PROFILE
// A pre-populated profile for development and testing.
// Mirrors what a real BYOC import would produce.
// ─────────────────────────────────────────────

export function createDemoProfile(): ClientProfile {
  const profile = createBlankProfile("demo-001", "Business on Purpose", "Alex Owner")

  return {
    ...profile,
    ownerEmail: "alex@businessonpurpose.com",
    industry:   "Professional Services",

    visionStory: {
      term:                 "3-year",
      targetYear:           2029,
      familyAndFreedom:     "Working 30 hours/week, 4 weeks of vacation, mornings with family.",
      currentAnnualRevenue: 48000000,
      targetAnnualRevenue:  120000000,
      currentProfitMargin:  12,
      targetProfitMargin:   25,
      currentOwnerPay:      8000000,
      targetOwnerPay:       18000000,
      productsAndServices:  "Business coaching and operating system implementation.",
      currentTeamSize:      3,
      targetTeamSize:       8,
      personnelNarrative:   "GM running day-to-day, sales lead, two delivery coaches. I am Visionary only.",
      clientType:           "Small business owners $500K-$5M revenue who feel trapped in their business.",
      culture:              "High accountability, deep care, relentless forward motion.",
      ownerRole:            "Visionary — strategy, key relationships, culture.",
      ownerWhy:             "Freedom, legacy, and time with family.",
      visionStatement:      "By 2029, Business on Purpose will help 50 small businesses achieve financial freedom, generating $1.2M in revenue at 25% profit, led by a team of 8, so I can be fully present with my family.",
    },

    mission: {
      missionStatement: "We exist to help small business owners stop being prisoners of their business.",
      wordCount:        12,
      keywords:         ["freedom", "small business owners", "prisoners", "stop"],
    },

    coreValues: {
      values: [
        {
          name:       "Own It Completely",
          definition: "We own it completely — which means we never pass a problem without bringing a solution.",
          hireFor:    true,
          fireFor:    true,
        },
        {
          name:       "Do What You Said",
          definition: "We do what we said — which means our word is our contract, no exceptions.",
          hireFor:    true,
          fireFor:    true,
        },
        {
          name:       "Make It Simple",
          definition: "We make it simple — which means we strip out complexity until a 6th grader could follow it.",
          hireFor:    true,
          fireFor:    false,
        },
      ],
    },

    realRevenue: {
      grossRevenue:       48000000,
      materialsCosts:      8000000,
      subcontractorCosts:  4000000,
      realRevenue:        36000000,
      period:             "annual",
      periodStart:        "2026-01-01",
    },

    bankAccounts: {
      totalRevenue:             48000000,
      totalCOGS:                12000000,
      realRevenue:              36000000,
      monthlyRealRevenue:        3000000,
      businessStructure:              "S-Corp",
      sCorporElectionRecommended:     false,
      incomeLabel:      "Income",
      currentProfitPercent:    5,
      currentOwnersPayPercent: 45,
      currentTaxPercent:       15,
      currentOpexPercent:      30,
      currentCapexPercent:     5,
      targetProfitPercent:     10,
      targetOwnersPayPercent:  50,
      targetTaxPercent:        15,
      targetOpexPercent:       20,
      targetCapexPercent:      5,
      profitPercent:    5,
      ownersPayPercent: 45,
      taxPercent:       15,
      opexPercent:      30,
      capexPercent:     5,
      computed: {
        monthlyRealRevenue: 3000000,
        profitAmount:        150000,
        ownersPayAmount:    1350000,
        taxAmount:           450000,
        opexAmount:          900000,
        capexAmount:         150000,
      },
    },
  }
}

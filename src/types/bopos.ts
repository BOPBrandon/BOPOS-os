/**
 * ============================================================
 * BOPOS — Core Type System
 * "How You Know What This Client Has Built"
 * ============================================================
 * This schema is the single source of truth for every data
 * shape in the system. All 24 modules, financial structures,
 * and rhythms are represented here.
 *
 * Four Build Filter check:
 *  ✦ One-Click      — flat, direct field access; no deep nesting to chase
 *  ✦ Scalable       — index signatures + discriminated unions instead of any[]
 *  ✦ Use What We Have — extends bopos-config constants; no new primitives
 *  ✦ Continual Progress — each field maps to an exact UI or calculation
 * ============================================================
 */

// ─────────────────────────────────────────────
// PRIMITIVES
// ─────────────────────────────────────────────

/** ISO 8601 date string — "2026-04-15" */
export type ISODate = string

/** 0–100 percentage */
export type Percentage = number

/** USD value (stored as cents to avoid float drift) */
export type Cents = number

export type ModuleStatus = "not_started" | "in_progress" | "completed" | "skipped"
export type ToolLayer = 1 | 2 | 3
export type SessionPhase = "big_wins" | "previous_tool_review" | "current_work" | "closed"

// ─────────────────────────────────────────────
// VISION STORY — 7 Categories (Module 01)
// ─────────────────────────────────────────────

export interface VisionStoryFinancials {
  // ── Meta ──────────────────────────────────
  /** "3-year" | "5-year" | custom label */
  term: string
  /** 4-digit year the vision targets */
  targetYear: number

  // ── Category 1: Family & Freedom ──────────
  /** Narrative: lifestyle, hours, vacation, personal life */
  familyAndFreedom: string

  // ── Category 2: Financials ─────────────────
  /** Gross annual revenue today (cents) */
  currentAnnualRevenue: Cents
  /** Target gross annual revenue at vision horizon (cents) */
  targetAnnualRevenue: Cents
  /** Current net profit margin (0–100) */
  currentProfitMargin: Percentage
  /** Target net profit margin (0–100) */
  targetProfitMargin: Percentage
  /** Annual owner pay (salary + distributions) today (cents) */
  currentOwnerPay: Cents
  /** Annual owner pay target at vision horizon (cents) */
  targetOwnerPay: Cents

  // ── Category 3: Products & Services ───────
  /** Narrative: what the business sells in the vision */
  productsAndServices: string

  // ── Category 4: Personnel ─────────────────
  /** Current number of team members (FTE equivalent) */
  currentTeamSize: number
  /** Target team size at vision horizon */
  targetTeamSize: number
  /** Narrative: who does what, owner's role in org chart */
  personnelNarrative: string

  // ── Category 5: Client Type ───────────────
  /** Narrative: ideal client, anti-avatar, any shift from today */
  clientType: string

  // ── Category 6: Culture ───────────────────
  /** Narrative: what it feels like to work here — seeds Module 03 */
  culture: string

  // ── Category 7: Owner Role & Why ──────────
  /** Narrative: what the owner actually does in the vision */
  ownerRole: string
  /** Verbatim "Why" — the personal force behind the vision */
  ownerWhy: string

  // ── Synthesis ─────────────────────────────
  /** One-sentence vision statement (all 7 categories compressed) */
  visionStatement: string
}

// ─────────────────────────────────────────────
// MISSION STATEMENT (Module 02)
// ─────────────────────────────────────────────

export interface MissionStatement {
  /** "We exist to..." — 12 words or fewer */
  missionStatement: string
  /** Word count — must be <= 12 */
  wordCount: number
  /** Keywords extracted from Vision Story that informed the statement */
  keywords: string[]
}

// ─────────────────────────────────────────────
// CORE VALUES (Module 03)
// ─────────────────────────────────────────────

export interface CoreValue {
  /** 1–4 word value name (ownable, specific) */
  name: string
  /** "We [X] — which means we [Y]." */
  definition: string
  /** Passed the hire-for stress test */
  hireFor: boolean
  /** Passed the fire-for stress test */
  fireFor: boolean
}

export interface CoreValues {
  values: CoreValue[]
}

// ─────────────────────────────────────────────
// REAL REVENUE (legacy — now embedded in Module 04)
// Kept for backward compatibility with DataBridge / validator.
// Prefer bankAccounts.realRevenue for new code.
// ─────────────────────────────────────────────

export interface RealRevenue {
  /** Total money in from all sources (cents) */
  grossRevenue: Cents
  /** Direct material costs (cents) */
  materialsCosts: Cents
  /** Subcontractor / pass-through costs (cents) */
  subcontractorCosts: Cents
  /**
   * Real Revenue = grossRevenue - materialsCosts - subcontractorCosts
   * Computed by calculateRealRevenue(); stored for Math Redundancy checks.
   */
  realRevenue: Cents
  /** Period this snapshot covers */
  period: "monthly" | "quarterly" | "annual"
  /** Start date of the period */
  periodStart: ISODate
}

// ─────────────────────────────────────────────
// BANK ACCOUNT ALLOCATIONS (Module 04)
// Real Revenue = Total Revenue - COGS (Profit First formula)
// Current percentages = where the business is today.
// Target percentages  = where it's heading (Priority Solutions).
// All percentage sets must sum to exactly 100.
// ─────────────────────────────────────────────

export interface BankAccountAllocation {
  // ── Real Revenue (Part 1 of Module 04) ────
  /** Total gross revenue last 12 months (cents) */
  totalRevenue: Cents
  /** Total COGS last 12 months (cents) */
  totalCOGS: Cents
  /**
   * Real Revenue = totalRevenue - totalCOGS
   * Computed by calculateRealRevenue(); stored for Math Redundancy.
   */
  realRevenue: Cents
  /** monthlyRealRevenue = realRevenue / 12 (cents) */
  monthlyRealRevenue: Cents

  // ── Business Structure (Part 2 of Module 04) ──
  /** "LLC" | "S-Corp" | "C-Corp" | "Sole Proprietor" | "Partnership" */
  businessStructure: string
  /** Whether CPA should evaluate S-Corp election */
  sCorporElectionRecommended: boolean

  // ── Income account ─────────────────────────
  /**
   * Income account — always receives 100% of deposits.
   * Distributions drain from here on the 10th & 25th.
   * Stored for display only; not included in the 100% split.
   */
  incomeLabel: string

  // ── Current allocation percentages ────────
  /** Current Profit percentage (where the business is today) */
  currentProfitPercent: Percentage
  /** Current Owner's Pay percentage */
  currentOwnersPayPercent: Percentage
  /** Current Tax percentage */
  currentTaxPercent: Percentage
  /** Current OpEx percentage */
  currentOpexPercent: Percentage
  /** Current CapEx percentage */
  currentCapexPercent: Percentage

  // ── Target allocation percentages ─────────
  /** Target Profit percentage (Priority Solutions destination) */
  targetProfitPercent: Percentage
  /** Target Owner's Pay percentage */
  targetOwnersPayPercent: Percentage
  /** Target Tax percentage */
  targetTaxPercent: Percentage
  /** Target OpEx percentage */
  targetOpexPercent: Percentage
  /** Target CapEx percentage */
  targetCapexPercent: Percentage

  // ── Legacy aliases (used by validator / DataBridge) ───
  /** @deprecated use currentProfitPercent or targetProfitPercent */
  profitPercent?: Percentage
  /** @deprecated use currentOwnersPayPercent or targetOwnersPayPercent */
  ownersPayPercent?: Percentage
  /** @deprecated use currentTaxPercent or targetTaxPercent */
  taxPercent?: Percentage
  /** @deprecated use currentOpexPercent or targetOpexPercent */
  opexPercent?: Percentage
  /** @deprecated use currentCapexPercent or targetCapexPercent */
  capexPercent?: Percentage

  /**
   * Computed monthly allocations (cents).
   * Populated by applyAllocations(); validated by validateBankAccounts().
   */
  computed?: {
    monthlyRealRevenue: Cents
    profitAmount: Cents
    ownersPayAmount: Cents
    taxAmount: Cents
    opexAmount: Cents
    capexAmount: Cents
  }
}

// ─────────────────────────────────────────────
// ANCHOR RHYTHMS — 52-Week Schedule (Module 20)
// ─────────────────────────────────────────────

export interface AnchorWeek {
  weekNumber: number  // 1–52
  /** Theme or focus for the week */
  theme: string
  /** Which BOPOS module is the primary focus, if any */
  moduleSlot?: number
  status: "planned" | "active" | "completed" | "skipped"
  /** Coach or owner notes for this week */
  notes?: string
  /** ISO date of the Monday of this week */
  weekStartDate?: ISODate
  /** B.I.G. Wins recorded at week close */
  bigWins?: string[]
}

// ─────────────────────────────────────────────
// THE 24 MODULES
// ─────────────────────────────────────────────

/** Union of all BOPOS module slot IDs */
export type ModuleSlot =
  | "module-01-vision-story"
  | "module-02-mission-statement"
  | "module-03-core-values"
  | "module-04-bank-accounts"
  | "module-05-anchor"
  | "module-06-ideal-weekly-schedule"
  | "module-07-master-process-roadmap"
  | "module-08-team-meetings"
  | "module-09-org-chart"
  | "module-10-role-clarity"
  | "module-11-hiring-roadmap"
  | "module-12-onboarding-system"
  | "module-13-core-process-map"
  | "module-14-quality-control"
  | "module-15-customer-journey"
  | "module-16-sales-system"
  | "module-17-marketing-strategy"
  | "module-18-lead-generation"
  | "module-19-retention-system"
  | "module-20-annual-planning"
  | "module-21-quarterly-rocks"
  | "module-22-annual-budget"
  | "module-23-compensation-pro-forma"
  | "module-24-project-start-sheet"
  | "module-25-revenue-pro-forma"
  | "module-26-financial-barn"
  | "module-27-level-two-dashboard"

export const MODULE_REGISTRY: Record<
  ModuleSlot,
  { slot: number; label: string; layer: ToolLayer; category: string }
> = {
  "module-01-vision-story":              { slot: 1,  label: "Vision Story",             layer: 1, category: "Purpose" },
  "module-02-mission-statement":         { slot: 2,  label: "Mission Statement",        layer: 1, category: "Purpose" },
  "module-03-core-values":               { slot: 3,  label: "Core Values",              layer: 1, category: "People"  },
  "module-04-bank-accounts":             { slot: 4,  label: "Subdivided Bank Accounts", layer: 1, category: "Profit"  },
  "module-05-anchor":                    { slot: 5,  label: "The Anchor",               layer: 3, category: "Process" },
  "module-06-ideal-weekly-schedule":     { slot: 6,  label: "Ideal Weekly Schedule",    layer: 1, category: "People"  },
  "module-07-master-process-roadmap":   { slot: 7,  label: "Master Process Roadmap",   layer: 1, category: "Process" },
  "module-08-team-meetings":            { slot: 8,  label: "Team Meetings",             layer: 1, category: "People"  },
  "module-09-org-chart":                 { slot: 9,  label: "Org Chart",                layer: 1, category: "People"  },
  "module-10-role-clarity":              { slot: 10, label: "Role Clarity",             layer: 1, category: "People"  },
  "module-11-hiring-roadmap":            { slot: 11, label: "Hiring Roadmap",           layer: 2, category: "People"  },
  "module-12-onboarding-system":         { slot: 12, label: "Onboarding System",        layer: 2, category: "People"  },
  "module-13-core-process-map":          { slot: 13, label: "Core Process Map",         layer: 2, category: "Process" },
  "module-14-quality-control":           { slot: 14, label: "Quality Control",          layer: 2, category: "Process" },
  "module-15-customer-journey":          { slot: 15, label: "Customer Journey",         layer: 2, category: "Product" },
  "module-16-sales-system":              { slot: 16, label: "Sales System",             layer: 2, category: "Product" },
  "module-17-marketing-strategy":        { slot: 17, label: "Marketing Strategy",       layer: 2, category: "Product" },
  "module-18-lead-generation":           { slot: 18, label: "Lead Generation",          layer: 2, category: "Product" },
  "module-19-retention-system":          { slot: 19, label: "Retention System",         layer: 2, category: "Product" },
  "module-20-annual-planning":           { slot: 20, label: "Annual Planning",          layer: 3, category: "Process" },
  "module-21-quarterly-rocks":           { slot: 21, label: "Quarterly Rocks",          layer: 3, category: "Process" },
  "module-22-annual-budget":             { slot: 22, label: "Annual Budget",            layer: 1, category: "Profit"  },
  "module-23-compensation-pro-forma":    { slot: 23, label: "Compensation Pro Forma",   layer: 2, category: "Profit"  },
  "module-24-project-start-sheet":       { slot: 24, label: "Project Start Sheet",      layer: 2, category: "Profit"  },
  "module-25-revenue-pro-forma":         { slot: 25, label: "Revenue Pro Forma",        layer: 2, category: "Profit"  },
  "module-26-financial-barn":            { slot: 26, label: "Financial Barn",           layer: 2, category: "Profit"  },
  "module-27-level-two-dashboard":       { slot: 27, label: "Level Two Dashboard",      layer: 2, category: "Profit"  },
}

export interface BOPOSModule {
  id: ModuleSlot
  slot: number
  label: string
  layer: ToolLayer
  category: string
  status: ModuleStatus
  completedAt?: ISODate
  /** Module-specific structured data — shape depends on module */
  data?: Record<string, unknown>
  /**
   * AI-gathered staging area. Fields here are collected during a live
   * coaching session but not yet committed to data[]. Promoted by the
   * "Sync to Dashboard" action in the CoachPanel.
   */
  draftData?: Record<string, unknown>
  /** Google Drive file ID if this module was imported via BYOC */
  driveFileId?: string
  /** Last time this module was synced from Drive */
  lastSyncedAt?: ISODate
}

// ─────────────────────────────────────────────
// CLIENT PROFILE — Root document
// ─────────────────────────────────────────────

export interface ClientProfile {
  id: string
  businessName: string
  ownerName: string
  ownerEmail: string
  industry: string
  createdAt: ISODate
  updatedAt: ISODate

  /** Layer 1 — The OS */
  visionStory: VisionStoryFinancials
  mission: MissionStatement
  coreValues: CoreValues
  /** @deprecated use bankAccounts.realRevenue — kept for DataBridge compatibility */
  realRevenue: RealRevenue
  bankAccounts: BankAccountAllocation

  /** Layer 3 — The Anchor */
  anchorRhythms: AnchorWeek[]

  /** All 24 modules — keyed by ModuleSlot for O(1) access */
  modules: Partial<Record<ModuleSlot, BOPOSModule>>

  /** Google Drive folder ID for this client's BYOC workspace */
  driveFolderId?: string
}

// ─────────────────────────────────────────────
// SESSION DATA
// ─────────────────────────────────────────────

export interface BIGWin {
  id: string
  text: string
  category: "People" | "Process" | "Product" | "Profit"
  recordedAt: ISODate
}

export interface SessionData {
  sessionId: string
  clientId: string
  phase: SessionPhase
  startedAt: ISODate
  closedAt?: ISODate

  /** 10% Opening — B.I.G. Wins */
  bigWins: BIGWin[]

  /** 10% Opening — Previous Tool Review */
  previousToolReview: {
    moduleId: ModuleSlot | null
    reviewNotes: string
    isComplete: boolean
  }

  /** 80% — Current Work */
  currentWork: {
    moduleId: ModuleSlot | null
    workNotes: string
    progressPercent: Percentage
  }
}

// ─────────────────────────────────────────────
// VALIDATION RESULT (used by Math Redundancy engine)
// ─────────────────────────────────────────────

export type ValidationSeverity = "ok" | "warning" | "error"

export interface ValidationResult {
  field: string
  severity: ValidationSeverity
  expected: number | string
  actual: number | string
  message: string
}

export interface ValidationReport {
  isValid: boolean
  checkedAt: ISODate
  results: ValidationResult[]
  /** Summary counts */
  summary: {
    ok: number
    warnings: number
    errors: number
  }
}

// ─────────────────────────────────────────────
// GOOGLE DRIVE BYOC CONFIG
// ─────────────────────────────────────────────

export interface DriveConfig {
  /** OAuth access token — never stored; passed per-session */
  accessToken: string
  /** Root folder ID for this client's BOPOS workspace on Drive */
  rootFolderId: string
  /** Map of module slot → Drive file ID */
  moduleFileMap: Partial<Record<ModuleSlot, string>>
}

export interface DriveFile {
  id: string
  name: string
  mimeType: string
  modifiedTime: ISODate
  /** Parsed content — JSON for spreadsheets, text for docs */
  content: Record<string, unknown> | string
}

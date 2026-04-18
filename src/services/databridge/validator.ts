/**
 * ============================================================
 * DataBridge — Math Redundancy Engine
 * ============================================================
 * Every financial figure shown in the UI passes through here.
 * "Validator" re-derives figures from source inputs independently
 * and compares against stored values. Any mismatch surfaces as
 * a warning or error before the number ever reaches the screen.
 *
 * Design principles:
 *  - Pure functions only — no side effects, no external calls
 *  - All money in cents (integer arithmetic, no float drift)
 *  - Every check returns a ValidationResult, never throws
 *  - Percentages use integer basis points internally where needed
 * ============================================================
 */

import type {
  BankAccountAllocation,
  RealRevenue,
  VisionStoryFinancials,
  ValidationResult,
  ValidationReport,
  ClientProfile,
  Cents,
  Percentage,
} from "@/types/bopos"

// ─────────────────────────────────────────────
// MATH PRIMITIVES
// All arithmetic on Cents to avoid IEEE 754 drift.
// ─────────────────────────────────────────────

/** Round cents to nearest integer — the only rounding that should ever happen */
export function roundCents(value: number): Cents {
  return Math.round(value)
}

/** Apply a percentage (0–100) to a Cents value */
export function applyPercent(cents: Cents, percent: Percentage): Cents {
  return roundCents((cents * percent) / 100)
}

/** Format cents as a USD string for display */
export function formatUSD(cents: Cents): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(cents / 100)
}

/** Format percentage for display */
export function formatPercent(value: Percentage): string {
  return `${value.toFixed(1)}%`
}

// ─────────────────────────────────────────────
// INDIVIDUAL VALIDATORS
// Each returns a ValidationResult[].
// ─────────────────────────────────────────────

/**
 * Bank Account Validation
 * Rule: profitPercent + ownersPayPercent + taxPercent + opexPercent === 100
 * Also re-derives computed amounts from monthlyRealRevenue.
 */
export function validateBankAccounts(
  allocation: BankAccountAllocation,
  monthlyRealRevenue: Cents
): ValidationResult[] {
  const results: ValidationResult[] = []

  // ── Check 1: Percentages sum to 100 ───────────────────────
  // Use current allocations (the live operating percentages)
  const percentSum =
    allocation.currentProfitPercent +
    allocation.currentOwnersPayPercent +
    allocation.currentTaxPercent +
    allocation.currentOpexPercent +
    allocation.currentCapexPercent

  results.push({
    field: "bankAccounts.percentageSum",
    severity: percentSum === 100 ? "ok" : "error",
    expected: 100,
    actual: percentSum,
    message:
      percentSum === 100
        ? "Bank account percentages sum to 100%."
        : `Percentages sum to ${percentSum}%. Must equal exactly 100%.`,
  })

  // ── Check 2: Computed amounts match stored amounts ─────────
  if (allocation.computed) {
    const fields: Array<{
      key: keyof typeof allocation.computed
      pct: Percentage
      label: string
    }> = [
      { key: "profitAmount",    pct: allocation.currentProfitPercent,    label: "Profit" },
      { key: "ownersPayAmount", pct: allocation.currentOwnersPayPercent, label: "Owner Comp" },
      { key: "taxAmount",       pct: allocation.currentTaxPercent,       label: "Tax" },
      { key: "opexAmount",      pct: allocation.currentOpexPercent,      label: "OpEx" },
      { key: "capexAmount",     pct: allocation.currentCapexPercent,     label: "CapEx" },
    ]

    for (const { key, pct, label } of fields) {
      const expected = applyPercent(monthlyRealRevenue, pct)
      const actual = allocation.computed[key]
      const delta = Math.abs(expected - actual)

      results.push({
        field: `bankAccounts.computed.${key}`,
        // Allow ±1 cent rounding tolerance
        severity: delta <= 1 ? "ok" : "error",
        expected,
        actual,
        message:
          delta <= 1
            ? `${label} amount verified: ${formatUSD(actual)}`
            : `${label} amount mismatch. Expected ${formatUSD(expected)}, got ${formatUSD(actual)}.`,
      })
    }

    // ── Check 3: Amounts sum to Real Revenue ──────────────────
    const amountSum =
      allocation.computed.profitAmount +
      allocation.computed.ownersPayAmount +
      allocation.computed.taxAmount +
      allocation.computed.opexAmount +
      allocation.computed.capexAmount

    const delta = Math.abs(amountSum - monthlyRealRevenue)

    results.push({
      field: "bankAccounts.computed.amountSum",
      severity: delta <= 5 ? "ok" : "error", // ±1 cent per bucket = ±5 max
      expected: monthlyRealRevenue,
      actual: amountSum,
      message:
        delta <= 4
          ? `Allocation total verified: ${formatUSD(amountSum)}`
          : `Allocation total ${formatUSD(amountSum)} does not match Real Revenue ${formatUSD(monthlyRealRevenue)}.`,
    })
  }

  return results
}

/**
 * Real Revenue Validation
 * Rule: grossRevenue - materialsCosts - subcontractorCosts === realRevenue
 */
export function validateRealRevenue(revenue: RealRevenue): ValidationResult[] {
  const results: ValidationResult[] = []

  const derived = revenue.grossRevenue - revenue.materialsCosts - revenue.subcontractorCosts

  results.push({
    field: "realRevenue.realRevenue",
    severity: derived === revenue.realRevenue ? "ok" : "error",
    expected: derived,
    actual: revenue.realRevenue,
    message:
      derived === revenue.realRevenue
        ? `Real Revenue verified: ${formatUSD(derived)}`
        : `Real Revenue mismatch. ${formatUSD(revenue.grossRevenue)} gross − ${formatUSD(
            revenue.materialsCosts
          )} materials − ${formatUSD(revenue.subcontractorCosts)} subs = ${formatUSD(derived)}, but stored as ${formatUSD(revenue.realRevenue)}.`,
  })

  // Sanity: real revenue should not exceed gross
  if (revenue.realRevenue > revenue.grossRevenue) {
    results.push({
      field: "realRevenue.sanity",
      severity: "error",
      expected: `≤ ${formatUSD(revenue.grossRevenue)}`,
      actual: formatUSD(revenue.realRevenue),
      message: "Real Revenue cannot exceed Gross Revenue.",
    })
  }

  // Warning: very high pass-through costs (>60% of gross)
  const passThroughRatio = (revenue.materialsCosts + revenue.subcontractorCosts) / revenue.grossRevenue
  if (passThroughRatio > 0.6) {
    results.push({
      field: "realRevenue.passThroughRatio",
      severity: "warning",
      expected: "≤ 60%",
      actual: `${(passThroughRatio * 100).toFixed(1)}%`,
      message: `Pass-through costs are ${(passThroughRatio * 100).toFixed(1)}% of gross revenue. Consider reviewing material and subcontractor spend.`,
    })
  }

  return results
}

/**
 * Vision Story Validation
 * Checks internal consistency of financial targets.
 */
export function validateVisionStory(vision: VisionStoryFinancials): ValidationResult[] {
  const results: ValidationResult[] = []

  // Target revenue should be greater than current
  results.push({
    field: "visionStory.targetAnnualRevenue",
    severity: vision.targetAnnualRevenue > vision.currentAnnualRevenue ? "ok" : "warning",
    expected: `> ${formatUSD(vision.currentAnnualRevenue)}`,
    actual: formatUSD(vision.targetAnnualRevenue),
    message:
      vision.targetAnnualRevenue > vision.currentAnnualRevenue
        ? "Target revenue exceeds current revenue."
        : "Target revenue should be greater than current revenue.",
  })

  // Target year should be in the future
  const currentYear = new Date().getFullYear()
  results.push({
    field: "visionStory.targetYear",
    severity: vision.targetYear > currentYear ? "ok" : "warning",
    expected: `> ${currentYear}`,
    actual: vision.targetYear,
    message:
      vision.targetYear > currentYear
        ? `Vision target year ${vision.targetYear} is in the future.`
        : `Vision target year ${vision.targetYear} is not in the future.`,
  })

  // Target margin should be achievable (warn if > 50%)
  if (vision.targetProfitMargin > 50) {
    results.push({
      field: "visionStory.targetProfitMargin",
      severity: "warning",
      expected: "≤ 50%",
      actual: formatPercent(vision.targetProfitMargin),
      message: `Target profit margin of ${formatPercent(vision.targetProfitMargin)} is unusually high. Verify this is intentional.`,
    })
  }

  return results
}

// ─────────────────────────────────────────────
// COMPOSITE VALIDATOR
// Runs all checks and produces a full report.
// ─────────────────────────────────────────────

/**
 * validateFinancials
 * The top-level Math Redundancy check. Pass in any ClientProfile
 * and receive a full ValidationReport before any figure is displayed.
 *
 * @example
 *   const report = validateFinancials(clientProfile)
 *   if (!report.isValid) console.error(report.results.filter(r => r.severity === 'error'))
 */
export function validateFinancials(profile: ClientProfile): ValidationReport {
  const allResults: ValidationResult[] = []

  // 1. Real Revenue
  allResults.push(...validateRealRevenue(profile.realRevenue))

  // 2. Bank Accounts — use Module 04 monthlyRealRevenue if set,
  //    else fall back to legacy realRevenue for backward compat
  const monthlyRR =
    (profile.bankAccounts.monthlyRealRevenue > 0)
      ? profile.bankAccounts.monthlyRealRevenue
      : profile.realRevenue.period === "monthly"
      ? profile.realRevenue.realRevenue
      : profile.realRevenue.period === "quarterly"
      ? roundCents(profile.realRevenue.realRevenue / 3)
      : roundCents(profile.realRevenue.realRevenue / 12)

  allResults.push(...validateBankAccounts(profile.bankAccounts, monthlyRR))

  // 3. Vision Story
  allResults.push(...validateVisionStory(profile.visionStory))

  const errors   = allResults.filter((r) => r.severity === "error").length
  const warnings = allResults.filter((r) => r.severity === "warning").length
  const ok       = allResults.filter((r) => r.severity === "ok").length

  return {
    isValid: errors === 0,
    checkedAt: new Date().toISOString().slice(0, 10),
    results: allResults,
    summary: { ok, warnings, errors },
  }
}

// ─────────────────────────────────────────────
// APPLY ALLOCATIONS
// Derives computed amounts from percentages + real revenue.
// Always run this before saving BankAccountAllocation.
// ─────────────────────────────────────────────

/**
 * applyAllocations
 * Populates the `computed` fields on a BankAccountAllocation.
 * Should be called any time percentages or real revenue change.
 */
export function applyAllocations(
  allocation: BankAccountAllocation,
  monthlyRealRevenue: Cents
): BankAccountAllocation {
  return {
    ...allocation,
    computed: {
      monthlyRealRevenue,
      profitAmount:    applyPercent(monthlyRealRevenue, allocation.currentProfitPercent),
      ownersPayAmount: applyPercent(monthlyRealRevenue, allocation.currentOwnersPayPercent),
      taxAmount:       applyPercent(monthlyRealRevenue, allocation.currentTaxPercent),
      opexAmount:      applyPercent(monthlyRealRevenue, allocation.currentOpexPercent),
      capexAmount:     applyPercent(monthlyRealRevenue, allocation.currentCapexPercent),
    },
  }
}

/**
 * calculateRealRevenue
 * Derives and sets the `realRevenue` field from source inputs.
 * Always call this before saving a RealRevenue object.
 */
export function calculateRealRevenue(revenue: Omit<RealRevenue, "realRevenue">): RealRevenue {
  return {
    ...revenue,
    realRevenue: revenue.grossRevenue - revenue.materialsCosts - revenue.subcontractorCosts,
  }
}

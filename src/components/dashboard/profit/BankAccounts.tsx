/**
 * BankAccounts
 * Displays the 5 Profit First accounts with:
 *  - Monthly allocation from Real Revenue baseline
 *  - Visual % bar per account
 *  - Math Redundancy badge (runs validateBankAccounts live)
 *  - Inline edit of percentages with live revalidation
 */
import { useState } from "react"
import { ShieldCheck, ShieldAlert, TrendingUp, DollarSign, Receipt, Wrench, Building2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  validateBankAccounts,
  applyAllocations,
  formatUSD,
  formatPercent,
  roundCents,
} from "@/services/databridge/validator"
import type { BankAccountAllocation, RealRevenue, ValidationResult } from "@/types/bopos"

interface BankAccountsProps {
  bankAccounts: BankAccountAllocation
  realRevenue: RealRevenue
  onUpdate?: (updated: BankAccountAllocation) => void
}

const ACCOUNT_CONFIG = [
  {
    key: "profit"    as const,
    pctKey: "currentProfitPercent"    as const,
    amtKey: "profitAmount"            as const,
    label: "Profit",
    description: "Non-touchable. Paid on the 10th & 25th.",
    icon: TrendingUp,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    bar: "bg-emerald-500",
  },
  {
    key: "ownersPay" as const,
    pctKey: "currentOwnersPayPercent" as const,
    amtKey: "ownersPayAmount"         as const,
    label: "Owner Comp",
    description: "Owner's salary. Pay yourself like an employee.",
    icon: DollarSign,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    bar: "bg-blue-500",
  },
  {
    key: "tax"       as const,
    pctKey: "currentTaxPercent"       as const,
    amtKey: "taxAmount"               as const,
    label: "Tax",
    description: "Quarterly tax reserve. Never touch it.",
    icon: Receipt,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    bar: "bg-amber-500",
  },
  {
    key: "opex"      as const,
    pctKey: "currentOpexPercent"      as const,
    amtKey: "opexAmount"              as const,
    label: "OpEx",
    description: "Operating expenses. Everything it takes to run.",
    icon: Wrench,
    color: "text-slate-600",
    bg: "bg-slate-50",
    border: "border-slate-200",
    bar: "bg-slate-500",
  },
  {
    key: "capex"     as const,
    pctKey: "currentCapexPercent"     as const,
    amtKey: "capexAmount"             as const,
    label: "CapEx",
    description: "Capital expenditure reserve. Equipment & growth.",
    icon: Building2,
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-200",
    bar: "bg-purple-500",
  },
]

function ValidationBadge({ results }: { results: ValidationResult[] }) {
  const errors   = results.filter((r) => r.severity === "error").length
  const warnings = results.filter((r) => r.severity === "warning").length

  if (errors > 0) {
    return (
      <Badge variant="destructive" className="gap-1">
        <ShieldAlert className="h-3 w-3" />
        {errors} error{errors > 1 ? "s" : ""}
      </Badge>
    )
  }
  if (warnings > 0) {
    return (
      <Badge variant="warning" className="gap-1">
        <ShieldAlert className="h-3 w-3" />
        {warnings} warning{warnings > 1 ? "s" : ""}
      </Badge>
    )
  }
  return (
    <Badge variant="success" className="gap-1">
      <ShieldCheck className="h-3 w-3" />
      Math Verified
    </Badge>
  )
}

export function BankAccounts({ bankAccounts, realRevenue, onUpdate }: BankAccountsProps) {
  const [editing, setEditing]     = useState(false)
  const [local, setLocal]         = useState(bankAccounts)

  // Monthly real revenue as the allocation base.
  // Prefer bankAccounts.monthlyRealRevenue (Module 04 source of truth),
  // fall back to legacy realRevenue prop for backward compat.
  const monthlyRR: number =
    (bankAccounts.monthlyRealRevenue > 0)
      ? bankAccounts.monthlyRealRevenue
      : realRevenue.period === "monthly"   ? realRevenue.realRevenue
      : realRevenue.period === "quarterly" ? roundCents(realRevenue.realRevenue / 3)
      :                                      roundCents(realRevenue.realRevenue / 12)

  const current  = applyAllocations(local, monthlyRR)
  const results  = validateBankAccounts(current, monthlyRR)
  const pctSum   = local.currentProfitPercent + local.currentOwnersPayPercent + local.currentTaxPercent + local.currentOpexPercent + local.currentCapexPercent
  const hasError = results.some((r) => r.severity === "error")

  function handlePctChange(pctKey: keyof BankAccountAllocation, value: number) {
    setLocal((prev) => ({ ...prev, [pctKey]: value }))
  }

  function handleSave() {
    const updated = applyAllocations(local, monthlyRR)
    onUpdate?.(updated)
    setEditing(false)
  }

  function handleCancel() {
    setLocal(bankAccounts)
    setEditing(false)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Bank Accounts</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Based on{" "}
            <span className="font-medium text-foreground">{formatUSD(monthlyRR)}/mo</span>
            {" "}Real Revenue
            {realRevenue.period !== "monthly" && (
              <span className="text-muted-foreground"> ({realRevenue.period} ÷ {realRevenue.period === "quarterly" ? 3 : 12})</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ValidationBadge results={results} />
          {!editing && (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              Edit %
            </Button>
          )}
        </div>
      </div>

      {/* Editing: percentage sum indicator */}
      {editing && (
        <div
          className={cn(
            "flex items-center justify-between rounded-md border px-4 py-2 text-sm",
            pctSum === 100
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          )}
        >
          <span>
            Total: <strong>{pctSum}%</strong>
            {pctSum !== 100 && <span className="ml-1">(must equal 100%)</span>}
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleCancel}>Cancel</Button>
            <Button size="sm" disabled={pctSum !== 100 || hasError} onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      )}

      {/* Account cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {ACCOUNT_CONFIG.map((acct) => {
          const pct = local[acct.pctKey] as number
          const amt = current.computed?.[acct.amtKey] ?? 0
          const Icon = acct.icon

          return (
            <div
              key={acct.key}
              className={cn(
                "flex flex-col gap-3 rounded-lg border p-4",
                acct.bg,
                acct.border
              )}
            >
              {/* Account header */}
              <div className="flex items-center gap-2">
                <Icon className={cn("h-4 w-4 shrink-0", acct.color)} />
                <span className={cn("text-sm font-bold", acct.color)}>{acct.label}</span>
              </div>

              {/* Amount */}
              <div>
                <p className="text-xl font-bold leading-none">{formatUSD(amt)}</p>
                <p className="text-xs text-muted-foreground mt-1">/month</p>
              </div>

              {/* Percentage — editable or static */}
              {editing ? (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={pct}
                    onChange={(e) => handlePctChange(acct.pctKey, Number(e.target.value))}
                    className="w-16 rounded border border-border bg-background px-2 py-1 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              ) : (
                <div>
                  {/* Visual bar */}
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-muted-foreground">
                      {formatPercent(pct)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-white/60">
                    <div
                      className={cn("h-1.5 rounded-full transition-all", acct.bar)}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Description */}
              <p className="text-[11px] text-muted-foreground leading-snug">{acct.description}</p>
            </div>
          )
        })}
      </div>

      {/* Validation detail — only show errors/warnings */}
      {results.some((r) => r.severity !== "ok") && (
        <div className="flex flex-col gap-1.5">
          {results
            .filter((r) => r.severity !== "ok")
            .map((r, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-start gap-2 rounded-md border px-3 py-2 text-xs",
                  r.severity === "error"
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-amber-200 bg-amber-50 text-amber-700"
                )}
              >
                <ShieldAlert className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>{r.message}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

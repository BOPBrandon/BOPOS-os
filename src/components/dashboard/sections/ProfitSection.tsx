/**
 * Profit Section
 * Bank Accounts (with Real Revenue baseline), Owner's Pay Strategy,
 * Tax Planning, OpEx Audit, and Exit/Succession.
 */
import { TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { BankAccounts } from "../profit/BankAccounts"
import { ModuleCard } from "../shared/ModuleCard"
import { formatUSD } from "@/services/databridge/validator"
import type { ClientProfile, BankAccountAllocation } from "@/types/bopos"

interface ProfitSectionProps {
  profile: ClientProfile
  onBankAccountsUpdate?: (updated: BankAccountAllocation) => void
  onLaunch?: (moduleId: number) => void
}

export function ProfitSection({ profile, onBankAccountsUpdate, onLaunch }: ProfitSectionProps) {
  const bankModule  = profile.modules["module-04-bank-accounts"]
  const annualBudget = profile.modules["module-22-annual-budget"]
  const l2dash      = profile.modules["module-27-level-two-dashboard"]
  const compPro     = profile.modules["module-23-compensation-pro-forma"]
  const startSheet  = profile.modules["module-24-project-start-sheet"]
  const revPro      = profile.modules["module-25-revenue-pro-forma"]
  const barn        = profile.modules["module-26-financial-barn"]
  const ba          = profile.bankAccounts
  const vision      = profile.visionStory

  // Real Revenue is now embedded in Module 04 (bankAccounts)
  const grossRevenue = ba.totalRevenue ?? profile.realRevenue.grossRevenue
  const realRevenue  = ba.realRevenue  ?? profile.realRevenue.realRevenue
  const revenueGap   = vision.targetAnnualRevenue - grossRevenue
  const onTrack      = revenueGap <= 0

  return (
    <div className="flex flex-col gap-6">

      {/* Real Revenue headline (now sourced from Module 04 bankAccounts) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <RevenueCard
          label="Gross Revenue"
          value={grossRevenue}
          sub="Total revenue (last 12 months)"
          tone="neutral"
        />
        <RevenueCard
          label="Real Revenue"
          value={realRevenue}
          sub="After COGS (Profit First baseline)"
          tone="positive"
        />
        <RevenueCard
          label="Revenue Gap"
          value={Math.abs(revenueGap)}
          sub={`to ${formatUSD(vision.targetAnnualRevenue)} target (${vision.targetYear})`}
          tone={onTrack ? "positive" : "negative"}
          prefix={onTrack ? "+" : "-"}
        />
      </div>

      {/* Module cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ModuleCard
          moduleSlot="module-04-bank-accounts"
          title="Subdivided Bank Accounts"
          description="Real Revenue calculation + 5 Profit First accounts with current and target allocations."
          status={bankModule?.status ?? "not_started"}
          onLaunch={onLaunch}
        >
          {realRevenue > 0 && (
            <div className="flex flex-col gap-1">
              <Stat label="Total Revenue" value={formatUSD(grossRevenue)} />
              <Stat label="COGS"          value={`− ${formatUSD(ba.totalCOGS ?? 0)}`} tone="red" />
              <div className="border-t border-border my-1" />
              <Stat label="Real Revenue"  value={formatUSD(realRevenue)} bold />
              {ba.monthlyRealRevenue > 0 && (
                <Stat label="Monthly RR" value={formatUSD(ba.monthlyRealRevenue)} />
              )}
            </div>
          )}
        </ModuleCard>

        <ModuleCard
          moduleSlot="module-22-annual-budget"
          title="Annual Budget"
          description="A vision-aligned, history-informed spending plan — reviewed every month against actual results."
          status={annualBudget?.status ?? "not_started"}
          onLaunch={onLaunch}
        >
          {annualBudget?.data?.totalAnnualBudget && (
            <Stat label="Annual Budget" value={formatUSD(annualBudget.data.totalAnnualBudget as number)} bold />
          )}
        </ModuleCard>

        <ModuleCard
          moduleSlot="module-27-level-two-dashboard"
          title="Level Two Dashboard"
          description="The business cockpit — Accounts, QARPET, and 5 Customer metrics reviewed every week in 20 minutes."
          status={l2dash?.status ?? "not_started"}
          onLaunch={onLaunch}
        >
          {l2dash?.data?.weeklyReviewDay && (
            <Stat label="Weekly Review" value={`${l2dash.data.weeklyReviewDay as string} ${l2dash.data.weeklyReviewTime as string ?? ""}`} />
          )}
        </ModuleCard>

        <ModuleCard
          moduleSlot="module-23-compensation-pro-forma"
          title="Compensation Pro Forma"
          description="Role-by-role compensation model with base pay, variable triggers, and full package view using the 1:3 ratio."
          status={compPro?.status ?? "not_started"}
          onLaunch={onLaunch}
        >
          {compPro?.data?.roles && (
            <Stat label="Roles Built" value={`${(compPro.data.roles as unknown[]).length} role${(compPro.data.roles as unknown[]).length !== 1 ? "s" : ""}`} />
          )}
        </ModuleCard>

        <ModuleCard
          moduleSlot="module-24-project-start-sheet"
          title="Project Start Sheet"
          description="Revenue forecasting radar — contracted work mapped month by month, pipeline tracked, red-flag months identified."
          status={startSheet?.status ?? "not_started"}
          onLaunch={onLaunch}
        >
          {startSheet?.data?.contracts && (
            <Stat label="Contracts Mapped" value={`${(startSheet.data.contracts as unknown[]).length}`} />
          )}
        </ModuleCard>

        <ModuleCard
          moduleSlot="module-25-revenue-pro-forma"
          title="Revenue Pro Forma"
          description="Scenario modeling engine — type in any revenue number and see COGS, overhead, taxes, CAPEX, and net profit cascade instantly."
          status={revPro?.status ?? "not_started"}
          onLaunch={onLaunch}
        >
          {revPro?.data?.scenarios && (
            <Stat label="Scenarios Built" value={`${(revPro.data.scenarios as unknown[]).length}`} />
          )}
        </ModuleCard>

        <ModuleCard
          moduleSlot="module-26-financial-barn"
          title="Financial Barn"
          description="Personal financial clarity — every life spending category with one real annual number, totaled into what the business must produce."
          status={barn?.status ?? "not_started"}
          onLaunch={onLaunch}
        >
          {barn?.data?.barnTotal && (
            <Stat label="Barn Total" value={formatUSD(barn.data.barnTotal as number)} bold />
          )}
        </ModuleCard>
      </div>

      {/* Bank Accounts — always visible, uses live DataBridge data */}
      <div className="rounded-lg border border-border bg-card p-5">
        <BankAccounts
          bankAccounts={profile.bankAccounts}
          realRevenue={profile.realRevenue}
          onUpdate={onBankAccountsUpdate}
        />
      </div>
    </div>
  )
}

function RevenueCard({
  label,
  value,
  sub,
  tone,
  prefix = "",
}: {
  label: string
  value: number
  sub: string
  tone: "positive" | "negative" | "neutral"
  prefix?: string
}) {
  const Icon = tone === "positive" ? ArrowUpRight : tone === "negative" ? ArrowDownRight : TrendingUp
  const color =
    tone === "positive" ? "text-emerald-600"
    : tone === "negative" ? "text-red-500"
    : "text-muted-foreground"

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <p className="text-2xl font-bold leading-none">
        {prefix}{formatUSD(value)}
      </p>
      <p className="text-xs text-muted-foreground capitalize">{sub}</p>
    </div>
  )
}

function Stat({
  label,
  value,
  tone,
  bold,
}: {
  label: string
  value: string
  tone?: "red" | "green"
  bold?: boolean
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={
          bold ? "font-bold"
          : tone === "red" ? "text-red-500"
          : tone === "green" ? "text-emerald-600"
          : "font-medium"
        }
      >
        {value}
      </span>
    </div>
  )
}

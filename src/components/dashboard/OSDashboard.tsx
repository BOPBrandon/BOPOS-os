/**
 * ============================================================
 * OS Dashboard — Layer 1: The Operating System
 * The four P's in a single tabbed view.
 * ============================================================
 * Four Build Filter check:
 *  ✦ One-Click      — tab switch is a single click; every unbuilt tool
 *                     shows exactly one primary action: "Start Module"
 *  ✦ Scalable       — each section is an isolated component; adding a
 *                     new P or module never touches the others
 *  ✦ Use What We Have — DataBridge + existing types drive all data;
 *                     no new state shape introduced here
 *  ✦ Continual Progress — completion ring + per-tab badge counts
 *                         show measurable forward movement at a glance
 * ============================================================
 */
import { useState } from "react"
import {
  Lightbulb, Users, Cog, TrendingUp,
  ShieldCheck, ShieldAlert, RefreshCw,
} from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PurposeSection }  from "./sections/PurposeSection"
import { PeopleSection }   from "./sections/PeopleSection"
import { ProcessSection }  from "./sections/ProcessSection"
import { ProfitSection }   from "./sections/ProfitSection"
import { ModuleViewer }    from "./ModuleViewer"
import { VisionStoryViewer } from "@/mothership/modules/module-01-vision-story/VisionStoryViewer"
import { createDemoProfile, validateFinancials } from "@/services/databridge"
import { pullForward } from "@/services/databridge/pull-forward"
import { MODULE_REGISTRY } from "@/types/bopos"
import { useProfile } from "@/context/ProfileContext"
import type { BankAccountAllocation } from "@/types/bopos"
import type { ModuleCompletionResult } from "./ModuleViewer"

// ─────────────────────────────────────────────
// TAB CONFIG
// ─────────────────────────────────────────────

const TABS = [
  {
    id:          "purpose" as const,
    label:       "Purpose",
    icon:        Lightbulb,
    description: "Vision · Values · Avatar",
    modules:     ["module-01-vision-story", "module-02-mission-statement", "module-03-core-values"],
  },
  {
    id:          "people" as const,
    label:       "People",
    icon:        Users,
    description: "Meetings · Schedule · Org · Roles",
    modules:     [
      "module-08-team-meetings",     "module-06-ideal-weekly-schedule",
      "module-09-org-chart",         "module-10-role-clarity",
      "module-11-hiring-roadmap",    "module-12-onboarding-system",
    ],
  },
  {
    id:          "process" as const,
    label:       "Process",
    icon:        Cog,
    description: "Process Map · Quality · Rhythms",
    modules:     [
      "module-07-master-process-roadmap",
      "module-13-core-process-map", "module-14-quality-control", "module-15-customer-journey",
      "module-20-annual-planning",  "module-21-quarterly-rocks",
    ],
  },
  {
    id:          "profit" as const,
    label:       "Profit",
    icon:        TrendingUp,
    description: "Revenue · Accounts · Budget · Forecasting",
    modules:     [
      "module-04-bank-accounts",         "module-22-annual-budget",
      "module-27-level-two-dashboard",   "module-23-compensation-pro-forma",
      "module-24-project-start-sheet",   "module-25-revenue-pro-forma",
      "module-26-financial-barn",
    ],
  },
] as const

type TabId = (typeof TABS)[number]["id"]

// ─────────────────────────────────────────────
// COMPLETION RING
// ─────────────────────────────────────────────

function CompletionRing({ percent }: { percent: number }) {
  const r  = 20
  const cx = 24
  const cy = 24
  const circumference = 2 * Math.PI * r
  const dash = (percent / 100) * circumference

  return (
    <svg width={48} height={48} className="-rotate-90">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={4} />
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={percent === 100 ? "hsl(142 76% 36%)" : "hsl(var(--primary))"}
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circumference}`}
        className="transition-all duration-700"
      />
      <text
        x={cx} y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        className="rotate-90 origin-center fill-white text-[10px] font-bold"
        transform={`rotate(90, ${cx}, ${cy})`}
      >
        {percent}%
      </text>
    </svg>
  )
}

// ─────────────────────────────────────────────
// TAB BADGE — completed / total for that P
// ─────────────────────────────────────────────

function tabBadge(profile: ClientProfile, modules: readonly string[]) {
  const done = modules.filter(
    (m) => profile.modules[m as keyof typeof profile.modules]?.status === "completed"
  ).length
  return { done, total: modules.length }
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────

export function OSDashboard() {
  const { profile, setProfile }           = useProfile()
  const [activeTab, setActiveTab]         = useState<TabId>("purpose")
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null)

  const report      = validateFinancials(profile)
  const totalMods   = 24
  const completedMods = Object.values(profile.modules).filter(
    (m) => m?.status === "completed"
  ).length
  const completionPct = Math.round((completedMods / totalMods) * 100)

  function handleBankAccountsUpdate(updated: BankAccountAllocation) {
    setProfile((prev) => ({ ...prev, bankAccounts: updated }))
  }

  function handleLaunch(moduleId: number) {
    setSelectedModuleId(moduleId)
  }

  function handleModuleComplete(result: ModuleCompletionResult) {
    const { moduleSlot, moduleId, data } = result
    const meta = MODULE_REGISTRY[moduleSlot]

    setProfile((prev) => {
      const existing = prev.modules[moduleSlot]

      // Build the updated module with data from the viewer
      const updatedModule = {
        id:          moduleSlot,
        slot:        moduleId,
        label:       meta?.label      ?? moduleSlot,
        layer:       meta?.layer      ?? ("purpose" as const),
        category:    meta?.category   ?? ("foundation" as const),
        ...existing,
        data,
        status:      "completed" as const,
        completedAt: new Date().toISOString().slice(0, 10),
      }

      const withModule: ClientProfile = {
        ...prev,
        modules: { ...prev.modules, [moduleSlot]: updatedModule },
      }

      // Cascade to downstream fields (visionStory, bankAccounts, etc.)
      const { updatedProfile } = pullForward(moduleSlot, withModule)
      return updatedProfile
    })

    setSelectedModuleId(null)
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── Top bar ──────────────────────────────────────────── */}
      <header className="flex items-center justify-between bg-bop-dark-blue px-6 py-4 shrink-0">
        <div className="flex items-center gap-4">
          <CompletionRing percent={completionPct} />
          <div>
            <h1 className="text-lg font-bold leading-tight text-white">{profile.businessName}</h1>
            <p className="text-xs text-bop-white/60">
              {completedMods} of {totalMods} modules complete · OS Layer 1
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Math Redundancy status */}
          {report.isValid ? (
            <Badge variant="success" className="gap-1">
              <ShieldCheck className="h-3 w-3" />
              Financials Verified
            </Badge>
          ) : (
            <Badge variant="destructive" className="gap-1">
              <ShieldAlert className="h-3 w-3" />
              {report.summary.errors} Financial {report.summary.errors === 1 ? "Error" : "Errors"}
            </Badge>
          )}

          <Button
            size="sm"
            onClick={() => setProfile(createDemoProfile())}
            className="bg-bop-light-orange text-white hover:bg-bop-dark-orange border-0"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reset Demo
          </Button>
        </div>
      </header>

      {/* ── Tabs ─────────────────────────────────────────────── */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as TabId)}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <div className="border-b border-border px-6 pt-3 shrink-0">
          <TabsList className="h-auto bg-transparent p-0 gap-1">
            {TABS.map((tab) => {
              const Icon  = tab.icon
              const badge = tabBadge(profile, tab.modules)
              const allDone = badge.done === badge.total

              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="group flex h-14 flex-col items-start gap-0.5 rounded-t-md border-b-2 border-transparent px-4 pb-2 pt-3 text-left data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="font-semibold text-sm">{tab.label}</span>
                    <span
                      className={
                        allDone
                          ? "rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700"
                          : "rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground"
                      }
                    >
                      {badge.done}/{badge.total}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">{tab.description}</span>
                </TabsTrigger>
              )
            })}
          </TabsList>
        </div>

        {/* ── Tab content ────────────────────────────────────── */}
        <div className="flex-1 overflow-auto">
          <TabsContent value="purpose" className="m-0 p-6">
            <PurposeSection profile={profile} onLaunch={handleLaunch} />
          </TabsContent>

          <TabsContent value="people" className="m-0 p-6">
            <PeopleSection profile={profile} onLaunch={handleLaunch} />
          </TabsContent>

          <TabsContent value="process" className="m-0 p-6">
            <ProcessSection profile={profile} onLaunch={handleLaunch} />
          </TabsContent>

          <TabsContent value="profit" className="m-0 p-6">
            <ProfitSection
              profile={profile}
              onBankAccountsUpdate={handleBankAccountsUpdate}
              onLaunch={handleLaunch}
            />
          </TabsContent>
        </div>
      </Tabs>

      {/* ── Module Viewer overlay ─────────────────────────── */}
      {selectedModuleId === 1 && (
        <VisionStoryViewer
          onComplete={handleModuleComplete}
          onClose={() => setSelectedModuleId(null)}
        />
      )}
      {selectedModuleId !== null && selectedModuleId !== 1 && (
        <ModuleViewer
          moduleId={selectedModuleId}
          onComplete={handleModuleComplete}
          onClose={() => setSelectedModuleId(null)}
        />
      )}
    </div>
  )
}

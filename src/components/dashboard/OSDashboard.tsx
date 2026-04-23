/**
 * ============================================================
 * OS Dashboard — Layer 1: The Operating System
 * Four P's in a four-column vertical layout.
 * ============================================================
 */
import { useState, useEffect } from "react"
import {
  Lightbulb, Users, Cog, TrendingUp,
  ShieldCheck, ShieldAlert, RefreshCw, Hammer, ExternalLink,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ModuleViewer } from "./ModuleViewer"
import { VisionStoryViewer } from "@/mothership/modules/module-01-vision-story/VisionStoryViewer"
import { MissionStatementViewer } from "@/mothership/modules/module-02-mission-statement/MissionStatementViewer"
import { createDemoProfile, validateFinancials } from "@/services/databridge"
import { pullForward } from "@/services/databridge/pull-forward"
import { MODULE_REGISTRY } from "@/types/bopos"
import { useProfile } from "@/context/ProfileContext"
import { supabase, type CustomTool } from "@/lib/supabase"
import type { ClientProfile, ModuleSlot } from "@/types/bopos"
import type { ModuleCompletionResult } from "./ModuleViewer"

// ─────────────────────────────────────────────
// QUICK ACCESS
// ─────────────────────────────────────────────
function QuickAccessSection() {
  const [tools, setTools] = useState<CustomTool[]>([])

  async function fetchTools() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from("bop_custom_tools")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(3)
    setTools(data ?? [])
  }

  useEffect(() => {
    fetchTools()
    window.addEventListener("bop-deploy", fetchTools)
    return () => window.removeEventListener("bop-deploy", fetchTools)
  }, [])

  if (tools.length === 0) return null

  const locationLabel: Record<string, string> = {
    os: "OS", mpr: "MPR", anchor: "Anchor",
  }

  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center gap-2">
        <Hammer className="h-4 w-4 text-[#002855]" />
        <h3 className="text-sm font-bold text-[#002855]">Quick Access</h3>
        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
          {tools.length} tool{tools.length !== 1 && "s"}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {tools.map((tool) => (
          <div
            key={tool.id}
            className="rounded-xl border border-border/60 border-l-4 border-l-[#002855] bg-white p-4 shadow-sm flex flex-col gap-2"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-foreground leading-snug">{tool.tool_name}</p>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50 mt-0.5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#002855]/10 px-2 py-0.5 text-[10px] font-semibold text-[#002855]">
                {locationLabel[tool.target_location] ?? tool.target_location}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {new Date(tool.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

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
// COLUMN HEADER
// ─────────────────────────────────────────────
function ColumnHeader({
  icon: Icon,
  label,
  done,
  total,
}: {
  icon: React.ElementType
  label: string
  done: number
  total: number
}) {
  const allDone = done === total
  return (
    <div className="flex items-center justify-between pb-3 border-b border-border">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-[#002855]" />
        <span className="font-bold text-sm text-foreground">{label}</span>
      </div>
      <span
        className={
          allDone
            ? "rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700"
            : "rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground"
        }
      >
        {done}/{total}
      </span>
    </div>
  )
}

// ─────────────────────────────────────────────
// MODULE TILE — clickable name-only card
// ─────────────────────────────────────────────
function ModuleTile({
  moduleSlot,
  title,
  onLaunch,
}: {
  moduleSlot: ModuleSlot
  title: string
  onLaunch?: (moduleId: number) => void
}) {
  const numericId = MODULE_REGISTRY[moduleSlot]?.slot ?? 0
  return (
    <button
      onClick={() => onLaunch?.(numericId)}
      className="w-full rounded-md border border-border bg-card px-3 py-3 text-center text-xs font-bold uppercase tracking-wider text-foreground transition-colors hover:bg-accent hover:border-primary/40 cursor-pointer"
    >
      {title}
    </button>
  )
}

// ─────────────────────────────────────────────
// BADGE COUNTS helper
// ─────────────────────────────────────────────
function columnBadge(profile: ClientProfile, modules: readonly string[]) {
  const done = modules.filter(
    (m) => profile.modules[m as keyof typeof profile.modules]?.status === "completed"
  ).length
  return { done, total: modules.length }
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export function OSDashboard() {
  const { profile, setProfile }               = useProfile()
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null)

  const report      = validateFinancials(profile)
  const totalMods   = 24
  const completedMods = Object.values(profile.modules).filter(
    (m) => m?.status === "completed"
  ).length
  const completionPct = Math.round((completedMods / totalMods) * 100)

  // ── Handlers ─────────────────────────────────────────────
  function handleLaunch(moduleId: number) {
    setSelectedModuleId(moduleId)
  }

  function handleModuleComplete(result: ModuleCompletionResult) {
    const { moduleSlot, moduleId, data } = result
    const meta = MODULE_REGISTRY[moduleSlot]

    setProfile((prev) => {
      const existing = prev.modules[moduleSlot]

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

      const { updatedProfile } = pullForward(moduleSlot, withModule)
      return updatedProfile
    })

    setSelectedModuleId(null)
  }

  // ── Column badge counts ───────────────────────────────────
  const purposeBadge = columnBadge(profile, [
    "module-01-vision-story", "module-02-mission-statement", "module-03-core-values",
  ])
  const peopleBadge = columnBadge(profile, [
    "module-08-team-meetings", "module-06-ideal-weekly-schedule",
    "module-09-org-chart", "module-10-role-clarity",
    "module-11-hiring-roadmap", "module-12-onboarding-system",
  ])
  const processBadge = columnBadge(profile, [
    "module-07-master-process-roadmap", "module-14-quality-control",
    "module-15-customer-journey", "module-20-annual-planning",
    "module-13-core-process-map", "module-21-quarterly-rocks",
  ])
  const profitBadge = columnBadge(profile, [
    "module-25-revenue-pro-forma", "module-04-bank-accounts",
    "module-22-annual-budget", "module-23-compensation-pro-forma",
    "module-26-financial-barn", "module-24-project-start-sheet",
    "module-27-level-two-dashboard",
  ])

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

      {/* ── Four-column layout ───────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-4 divide-x divide-border min-h-full">

          {/* ── Purpose ── */}
          <div className="flex flex-col gap-3 p-5">
            <ColumnHeader
              icon={Lightbulb}
              label="Purpose"
              done={purposeBadge.done}
              total={purposeBadge.total}
            />

            <ModuleTile moduleSlot="module-01-vision-story"      title="Vision Story"       onLaunch={handleLaunch} />
            <ModuleTile moduleSlot="module-02-mission-statement" title="Mission Statement"  onLaunch={handleLaunch} />
            <ModuleTile moduleSlot="module-03-core-values"       title="Core Values"        onLaunch={handleLaunch} />
          </div>

          {/* ── People ── */}
          <div className="flex flex-col gap-3 p-5">
            <ColumnHeader
              icon={Users}
              label="People"
              done={peopleBadge.done}
              total={peopleBadge.total}
            />

            <ModuleTile moduleSlot="module-08-team-meetings"         title="Meetings"   onLaunch={handleLaunch} />
            <ModuleTile moduleSlot="module-06-ideal-weekly-schedule" title="Schedule"   onLaunch={handleLaunch} />
            <ModuleTile moduleSlot="module-09-org-chart"             title="Org Chart"  onLaunch={handleLaunch} />
            <ModuleTile moduleSlot="module-10-role-clarity"          title="Job Roles"  onLaunch={handleLaunch} />
            <ModuleTile moduleSlot="module-11-hiring-roadmap"        title="Hiring"     onLaunch={handleLaunch} />
            <ModuleTile moduleSlot="module-12-onboarding-system"     title="Onboarding" onLaunch={handleLaunch} />
          </div>

          {/* ── Process ── */}
          <div className="flex flex-col gap-3 p-5">
            <ColumnHeader
              icon={Cog}
              label="Process"
              done={processBadge.done}
              total={processBadge.total}
            />

            <ModuleTile moduleSlot="module-07-master-process-roadmap" title="Process Map"       onLaunch={handleLaunch} />
            <ModuleTile moduleSlot="module-14-quality-control"        title="Quality"           onLaunch={handleLaunch} />
            <ModuleTile moduleSlot="module-15-customer-journey"       title="Rhythms"           onLaunch={handleLaunch} />
            <ModuleTile moduleSlot="module-20-annual-planning"        title="12-Week Plan"      onLaunch={handleLaunch} />
            <ModuleTile moduleSlot="module-13-core-process-map"       title="Delegation Roadmap" onLaunch={handleLaunch} />
            <ModuleTile moduleSlot="module-21-quarterly-rocks"        title="Team Meetings"     onLaunch={handleLaunch} />
          </div>

          {/* ── Profit ── */}
          <div className="flex flex-col gap-3 p-5">
            <ColumnHeader
              icon={TrendingUp}
              label="Profit"
              done={profitBadge.done}
              total={profitBadge.total}
            />

            <ModuleTile moduleSlot="module-25-revenue-pro-forma"    title="Revenue"               onLaunch={handleLaunch} />
            <ModuleTile moduleSlot="module-04-bank-accounts"        title="Accounts"              onLaunch={handleLaunch} />
            <ModuleTile moduleSlot="module-22-annual-budget"        title="Budget"                onLaunch={handleLaunch} />
            <ModuleTile moduleSlot="module-23-compensation-pro-forma" title="Compensation"        onLaunch={handleLaunch} />
            <ModuleTile moduleSlot="module-26-financial-barn"       title="Financial Barn"        onLaunch={handleLaunch} />
            <ModuleTile moduleSlot="module-24-project-start-sheet"  title="Project Start Sheet"   onLaunch={handleLaunch} />
            <ModuleTile moduleSlot="module-27-level-two-dashboard"  title="Level Two Dashboard"   onLaunch={handleLaunch} />
          </div>

        </div>
      </div>

      {/* ── Module Viewer overlays ─────────────────────────── */}
      {selectedModuleId === 1 && (
        <VisionStoryViewer
          onComplete={handleModuleComplete}
          onClose={() => setSelectedModuleId(null)}
        />
      )}
      {selectedModuleId === 2 && (
        <MissionStatementViewer
          onComplete={handleModuleComplete}
          onClose={() => setSelectedModuleId(null)}
        />
      )}
      {selectedModuleId !== null && selectedModuleId !== 1 && selectedModuleId !== 2 && (
        <ModuleViewer
          moduleId={selectedModuleId}
          onComplete={handleModuleComplete}
          onClose={() => setSelectedModuleId(null)}
        />
      )}
    </div>
  )
}

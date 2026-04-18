/**
 * DelegationRoadmap
 * Visual pipeline showing every seat's journey from
 * "Owner In Seat" → "Training" → "Delegated" → "Systemized".
 * Ordered by delegation priority.
 */
import { ArrowRight, User, BookOpen, UserCheck, Cpu } from "lucide-react"
import { cn } from "@/lib/utils"
import type { RoleEntry } from "./RoleScorecard"

export type DelegationStage = "owner" | "training" | "delegated" | "systemized"

export interface DelegationItem extends RoleEntry {
  stage: DelegationStage
}

interface DelegationRoadmapProps {
  items: DelegationItem[]
}

const STAGES: Array<{
  id: DelegationStage
  label: string
  sublabel: string
  icon: typeof User
  color: string
  bg: string
  border: string
}> = [
  {
    id: "owner",
    label: "Owner In Seat",
    sublabel: "Still you",
    icon: User,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  {
    id: "training",
    label: "Training",
    sublabel: "Teaching someone",
    icon: BookOpen,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  {
    id: "delegated",
    label: "Delegated",
    sublabel: "They own it",
    icon: UserCheck,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
  {
    id: "systemized",
    label: "Systemized",
    sublabel: "Process owns it",
    icon: Cpu,
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-200",
  },
]

function RoleChip({
  item,
  stageColor,
  stageBg,
  stageBorder,
}: {
  item: DelegationItem
  stageColor: string
  stageBg: string
  stageBorder: string
}) {
  return (
    <div
      className={cn(
        "rounded-md border px-3 py-2 text-xs",
        stageBg,
        stageBorder
      )}
    >
      <p className={cn("font-semibold leading-tight", stageColor)}>{item.title}</p>
      <p className="text-muted-foreground mt-0.5">{item.filledBy}</p>
      {item.delegationOrder < 99 && (
        <p className="text-muted-foreground">Priority #{item.delegationOrder}</p>
      )}
    </div>
  )
}

export function DelegationRoadmap({ items }: DelegationRoadmapProps) {
  const byStage = STAGES.reduce<Record<DelegationStage, DelegationItem[]>>(
    (acc, s) => ({ ...acc, [s.id]: [] }),
    {} as Record<DelegationStage, DelegationItem[]>
  )
  items.forEach((item) => byStage[item.stage].push(item))

  const ownerSeatCount = byStage.owner.length
  const freedHours = items
    .filter((i) => i.stage !== "owner")
    .reduce((s, i) => s + i.hoursPerWeek, 0)

  return (
    <div className="flex flex-col gap-5">
      {/* Progress summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STAGES.map((s) => {
          const count = byStage[s.id].length
          const Icon = s.icon
          return (
            <div key={s.id} className={cn("rounded-lg border p-3", s.bg, s.border)}>
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className={cn("h-3.5 w-3.5", s.color)} />
                <span className={cn("text-xs font-semibold", s.color)}>{s.label}</span>
              </div>
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-xs text-muted-foreground">{count === 1 ? "seat" : "seats"}</p>
            </div>
          )
        })}
      </div>

      {ownerSeatCount > 0 && (
        <p className="text-xs text-muted-foreground">
          Owner still holds <strong className="text-amber-600">{ownerSeatCount} seats</strong>.{" "}
          Delegating them frees approximately <strong>{items.filter(i => i.stage === "owner").reduce((s, i) => s + i.hoursPerWeek, 0)} hrs/week</strong>.
          {freedHours > 0 && ` ${freedHours} hrs/week already reclaimed.`}
        </p>
      )}

      {/* Pipeline */}
      <div className="flex items-start gap-2 overflow-x-auto pb-2">
        {STAGES.map((stage, idx) => {
          const Icon = stage.icon
          const stageItems = byStage[stage.id]

          return (
            <div key={stage.id} className="flex items-start gap-2">
              <div className="flex flex-col gap-2 min-w-[160px]">
                {/* Stage header */}
                <div className={cn("rounded-md border px-3 py-2 text-center", stage.bg, stage.border)}>
                  <div className="flex items-center justify-center gap-1.5">
                    <Icon className={cn("h-3.5 w-3.5", stage.color)} />
                    <span className={cn("text-xs font-bold", stage.color)}>{stage.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{stage.sublabel}</p>
                </div>

                {/* Role chips */}
                {stageItems.length > 0 ? (
                  stageItems.map((item) => (
                    <RoleChip
                      key={item.id}
                      item={item}
                      stageColor={stage.color}
                      stageBg={stage.bg}
                      stageBorder={stage.border}
                    />
                  ))
                ) : (
                  <div className={cn("rounded-md border border-dashed px-3 py-4 text-center", stage.border)}>
                    <p className="text-xs text-muted-foreground">Empty</p>
                  </div>
                )}
              </div>

              {/* Arrow connector */}
              {idx < STAGES.length - 1 && (
                <ArrowRight className="mt-[34px] h-4 w-4 shrink-0 text-muted-foreground/40" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Demo data ─────────────────────────────────────────────────
import { DEMO_ROLES } from "./RoleScorecard"

export const DEMO_DELEGATION: DelegationItem[] = DEMO_ROLES.map((r): DelegationItem => ({
  ...r,
  stage: r.id === "ops" ? "delegated"
       : r.id === "finance" ? "training"
       : "owner",
}))

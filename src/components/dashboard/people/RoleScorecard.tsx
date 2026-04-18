/**
 * RoleScorecard
 * Displays every seat in the org, who fills it, hours/week,
 * and a 1–10 fit score. Owner-filled seats glow amber — those
 * are delegation targets.
 */
import { AlertTriangle, User, UserCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export interface RoleEntry {
  id: string
  title: string
  filledBy: string
  isOwnerFilled: boolean
  hoursPerWeek: number
  fitScore: number   // 1–10
  accountabilities: string[]
  delegationOrder: number  // lower = higher priority to delegate
}

interface RoleScorecardProps {
  roles: RoleEntry[]
}

function FitDots({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 10 }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-2 w-2 rounded-full",
            i < score
              ? score >= 8 ? "bg-emerald-500"
                : score >= 5 ? "bg-amber-400"
                : "bg-red-400"
              : "bg-muted"
          )}
        />
      ))}
      <span className="ml-1.5 text-xs font-semibold text-muted-foreground">{score}/10</span>
    </div>
  )
}

export function RoleScorecard({ roles }: RoleScorecardProps) {
  const sorted = [...roles].sort((a, b) => a.delegationOrder - b.delegationOrder)
  const ownerHours = roles.filter((r) => r.isOwnerFilled).reduce((s, r) => s + r.hoursPerWeek, 0)

  return (
    <div className="flex flex-col gap-4">
      {/* Owner hours summary */}
      {ownerHours > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
          <p className="text-sm text-amber-800">
            Owner is in <strong>{roles.filter((r) => r.isOwnerFilled).length} seats</strong> for{" "}
            <strong>~{ownerHours} hrs/week</strong>. Prioritize delegation below.
          </p>
        </div>
      )}

      {/* Role rows */}
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Seat
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Filled By
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Hrs/Wk
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Fit Score
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((role, idx) => (
              <tr
                key={role.id}
                className={cn(
                  "border-b border-border last:border-0",
                  role.isOwnerFilled ? "bg-amber-50/60" : idx % 2 === 0 ? "bg-background" : "bg-muted/20"
                )}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {role.isOwnerFilled ? (
                      <User className="h-3.5 w-3.5 text-amber-500" />
                    ) : (
                      <UserCheck className="h-3.5 w-3.5 text-emerald-500" />
                    )}
                    <div>
                      <p className="font-medium leading-tight">{role.title}</p>
                      {role.accountabilities[0] && (
                        <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                          {role.accountabilities[0]}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm">{role.filledBy}</td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "font-medium",
                      role.hoursPerWeek > 15 && role.isOwnerFilled ? "text-amber-600" : "text-foreground"
                    )}
                  >
                    {role.hoursPerWeek}h
                  </span>
                </td>
                <td className="px-4 py-3">
                  <FitDots score={role.fitScore} />
                </td>
                <td className="px-4 py-3">
                  {role.isOwnerFilled ? (
                    <Badge variant="warning">
                      Delegate #{role.delegationOrder}
                    </Badge>
                  ) : (
                    <Badge variant="success">Filled</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Demo data ─────────────────────────────────────────────────
export const DEMO_ROLES: RoleEntry[] = [
  {
    id: "visionary",
    title: "Visionary / CEO",
    filledBy: "Owner",
    isOwnerFilled: true,
    hoursPerWeek: 10,
    fitScore: 9,
    accountabilities: ["Set direction", "Culture", "Key relationships"],
    delegationOrder: 99,
  },
  {
    id: "integrator",
    title: "Integrator / COO",
    filledBy: "Owner",
    isOwnerFilled: true,
    hoursPerWeek: 20,
    fitScore: 6,
    accountabilities: ["Run the business", "Team harmony", "P&L accountability"],
    delegationOrder: 1,
  },
  {
    id: "sales",
    title: "Sales Lead",
    filledBy: "Owner",
    isOwnerFilled: true,
    hoursPerWeek: 15,
    fitScore: 7,
    accountabilities: ["Close new clients", "Pipeline management"],
    delegationOrder: 2,
  },
  {
    id: "ops",
    title: "Operations Lead",
    filledBy: "Jordan M.",
    isOwnerFilled: false,
    hoursPerWeek: 40,
    fitScore: 8,
    accountabilities: ["Delivery quality", "Team scheduling", "Process SOPs"],
    delegationOrder: 99,
  },
  {
    id: "finance",
    title: "Finance / Bookkeeper",
    filledBy: "Owner",
    isOwnerFilled: true,
    hoursPerWeek: 5,
    fitScore: 5,
    accountabilities: ["Bank transfers", "Invoice tracking", "Tax prep liaison"],
    delegationOrder: 3,
  },
]

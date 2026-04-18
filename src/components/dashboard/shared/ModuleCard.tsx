/**
 * ModuleCard
 * The universal wrapper for any BOPOS tool card.
 * One-Click: if not built → "Start Module" is the dominant action.
 * In-progress: progress bar + "Continue" button.
 * Completed: green badge + data preview slot.
 *
 * Phase 5 — Iterative Sharpening:
 *  - Shows a pulsing amber ring when the AI is actively staging data for this slot
 *  - Shows a "Staged" badge when a pending update is waiting to be synced
 *  - Flashes "Updated ✓" for 2 seconds after a commit lands on this slot
 */
import { CheckCircle2, Circle, Clock, Sparkles } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { StartModuleButton } from "./StartModuleButton"
import { cn } from "@/lib/utils"
import { MODULE_REGISTRY } from "@/types/bopos"
import type { ModuleStatus, ModuleSlot } from "@/types/bopos"
import { useActiveSession } from "@/context/ActiveSessionContext"

interface ModuleCardProps {
  moduleSlot: ModuleSlot
  title: string
  description: string
  status: ModuleStatus
  progress?: number           // 0–100; only shown when in_progress
  children?: React.ReactNode  // data preview when completed
  onLaunch?: (moduleId: number) => void
  onContinue?: () => void
  className?: string
}

const STATUS_CONFIG: Record<
  ModuleStatus,
  { icon: typeof Circle; label: string; badgeVariant: "success" | "warning" | "ghost" | "secondary" }
> = {
  completed:   { icon: CheckCircle2, label: "Completed",   badgeVariant: "success"   },
  in_progress: { icon: Clock,        label: "In Progress", badgeVariant: "warning"   },
  not_started: { icon: Circle,       label: "Not Started", badgeVariant: "ghost"     },
  skipped:     { icon: Circle,       label: "Skipped",     badgeVariant: "secondary" },
}

export function ModuleCard({
  moduleSlot,
  title,
  description,
  status,
  progress,
  children,
  onLaunch,
  onContinue,
  className,
}: ModuleCardProps) {
  const numericId = MODULE_REGISTRY[moduleSlot]?.slot ?? 0
  const launch = () => onLaunch?.(numericId)
  const { icon: Icon, label, badgeVariant } = STATUS_CONFIG[status]

  // ── Phase 5: AI sync state ───────────────────────────────
  const { pendingUpdate, isAILoading, justCommittedSlot } = useActiveSession()

  const isStaged      = pendingUpdate?.moduleSlot === moduleSlot
  const isAITyping    = isAILoading && isStaged
  const justUpdated   = justCommittedSlot === moduleSlot
  // ─────────────────────────────────────────────────────────

  return (
    <Card
      className={cn(
        "flex flex-col transition-all duration-300",
        status === "completed" && "border-emerald-200",
        // Pulsing amber ring while AI is actively staging data for this card
        isAITyping  && "ring-2 ring-bop-light-orange ring-offset-1 animate-pulse",
        // Solid amber ring while a staged update is waiting (but AI done typing)
        isStaged && !isAITyping && "ring-2 ring-bop-light-orange/60 ring-offset-1",
        // Green ring flash on successful commit
        justUpdated && "ring-2 ring-emerald-400 ring-offset-1",
        className
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-semibold leading-snug">{title}</CardTitle>
          <div className="flex items-center gap-1.5 shrink-0">
            {/* AI typing indicator badge */}
            {isAITyping && (
              <span className="inline-flex items-center gap-1 rounded-full bg-bop-light-orange/15 px-2 py-0.5 text-[10px] font-medium text-bop-dark-orange">
                <span className="h-1 w-1 rounded-full bg-bop-light-orange animate-bounce" />
                AI typing…
              </span>
            )}
            {/* Staged (pending) badge */}
            {isStaged && !isAITyping && (
              <span className="inline-flex items-center gap-1 rounded-full bg-bop-light-orange/15 px-2 py-0.5 text-[10px] font-medium text-bop-dark-orange">
                <Sparkles className="h-2.5 w-2.5" />
                Staged
              </span>
            )}
            {/* Updated ✓ flash */}
            {justUpdated && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                <CheckCircle2 className="h-2.5 w-2.5" />
                Updated ✓
              </span>
            )}
            <Badge variant={badgeVariant} className="gap-1">
              <Icon className="h-3 w-3" />
              {label}
            </Badge>
          </div>
        </div>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>

      {status === "in_progress" && progress !== undefined && (
        <CardContent className="pb-3 pt-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted-foreground">Progress</span>
            <span className="text-xs font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </CardContent>
      )}

      {status === "completed" && children && (
        <CardContent className="pb-3 pt-0 flex-1">
          {children}
        </CardContent>
      )}

      <CardFooter className="mt-auto pt-0">
        {status === "not_started" && (
          onLaunch
            ? <Button size="sm" className="w-full gap-1.5" onClick={launch}>
                <Sparkles className="h-3.5 w-3.5" />
                Start Module
              </Button>
            : <StartModuleButton moduleSlot={moduleSlot} size="sm" className="w-full" />
        )}
        {status === "in_progress" && (
          <Button size="sm" variant="outline" className="w-full" onClick={onLaunch ? launch : onContinue}>
            Continue
          </Button>
        )}
        {status === "completed" && (
          <Button size="sm" variant="ghost" className="w-full text-muted-foreground" onClick={onLaunch ? launch : onContinue}>
            Review
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

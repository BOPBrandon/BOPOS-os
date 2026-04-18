/**
 * Home Page — "Where should we begin?"
 * Root route (/). Three priority cards: OS, MPR, Anchor.
 * Renders outside the sidebar Layout for a clean, full-screen entry.
 */
import { useNavigate } from "react-router-dom"
import { LayoutDashboard, Anchor, GitBranch, ArrowRight, CheckCircle2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useProfile } from "@/context/ProfileContext"
import { APP_FULL_NAME } from "@/bopos-config"

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

type CardStatus = "not-started" | "in-progress" | "completed"

interface PriorityCardProps {
  icon: React.ComponentType<{ className?: string }>
  title: string
  layerTag?: string        // e.g. "Layer 2 · The MPR" — rendered small/light above description
  description: string      // plain one-line hook
  status: CardStatus
  recommended?: boolean
  onAction: () => void
}

// ─────────────────────────────────────────────
// STATUS HELPERS
// ─────────────────────────────────────────────

function statusLabel(status: CardStatus): string {
  if (status === "completed")   return "Complete"
  if (status === "in-progress") return "In Progress"
  return "Not Started"
}

function statusDot(status: CardStatus) {
  return cn(
    "h-2 w-2 rounded-full shrink-0",
    status === "completed"   && "bg-emerald-500",
    status === "in-progress" && "bg-bop-light-blue",
    status === "not-started" && "bg-muted-foreground/30"
  )
}

// ─────────────────────────────────────────────
// PRIORITY CARD
// ─────────────────────────────────────────────

function PriorityCard({
  icon: Icon,
  title,
  layerTag,
  description,
  status,
  recommended,
  onAction,
}: PriorityCardProps) {
  const hasStarted = status !== "not-started"

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-2xl border bg-white p-8 shadow-sm transition-shadow duration-200 hover:shadow-md",
        recommended
          ? "border-bop-dark-blue/30 ring-1 ring-bop-dark-blue/10"
          : "border-border"
      )}
    >
      {/* Recommended badge */}
      {recommended && (
        <div className="absolute -top-3 left-8 flex items-center gap-1.5 rounded-full bg-bop-dark-blue px-3 py-1 shadow-sm">
          <Sparkles className="h-3 w-3 text-white" />
          <span className="text-[11px] font-semibold text-white tracking-wide">
            Start Here
          </span>
        </div>
      )}

      {/* Icon */}
      <div
        className={cn(
          "mb-5 flex h-12 w-12 items-center justify-center rounded-xl",
          recommended ? "bg-bop-dark-blue" : "bg-muted"
        )}
      >
        <Icon
          className={cn(
            "h-5 w-5",
            recommended ? "text-white" : "text-muted-foreground"
          )}
        />
      </div>

      {/* Text */}
      <div className="flex-1">
        <h2 className="text-lg font-bold tracking-tight text-foreground">{title}</h2>

        {/* Layer tag — smaller, lighter, clear visual hierarchy below the title */}
        {layerTag && (
          <p className="mt-1 text-[11px] font-medium uppercase tracking-widest text-muted-foreground/50">
            {layerTag}
          </p>
        )}

        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>

      {/* Status + CTA */}
      <div className="mt-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className={statusDot(status)} />
          <span className="text-xs text-muted-foreground">{statusLabel(status)}</span>
        </div>

        <Button
          onClick={onAction}
          variant={recommended ? "default" : "outline"}
          className={cn(
            "gap-2 rounded-xl font-semibold transition-all",
            recommended && "bg-bop-dark-blue hover:bg-bop-dark-blue/90 text-white shadow-sm"
          )}
        >
          {hasStarted ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Continue
            </>
          ) : (
            <>
              Start
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────

export function HomePage() {
  const navigate    = useNavigate()
  const { profile } = useProfile()

  // OS: in-progress/complete if any module has been touched
  const completedModules = Object.values(profile.modules).filter(
    (m) => m?.status === "completed"
  ).length
  const osStatus: CardStatus =
    completedModules > 0
      ? "in-progress"
      : profile.visionStory?.visionStatement
      ? "in-progress"
      : "not-started"

  // MPR: in-progress if any process-layer module has been completed
  const mprModuleSlots = [
    "module-07-master-process-roadmap",
    "module-13-core-process-map",
    "module-14-quality-control",
    "module-15-customer-journey",
  ] as const
  const mprStarted = mprModuleSlots.some(
    (slot) => profile.modules[slot]?.status === "completed"
  )
  const mprStatus: CardStatus = mprStarted ? "in-progress" : "not-started"

  // Anchor: in-progress if any rhythms have been added
  const anchorStatus: CardStatus =
    profile.anchorRhythms?.length > 0 ? "in-progress" : "not-started"

  const cards: PriorityCardProps[] = [
    {
      icon:        LayoutDashboard,
      title:       "OS",
      description: "The Operating System — The tools to run your business.",
      status:      osStatus,
      recommended: true,
      onAction:    () => navigate("/os"),
    },
    {
      icon:        GitBranch,
      title:       "Master Process Roadmap",
      layerTag:    "Layer 2 · The MPR",
      description: "The processes to deliver your product.",
      status:      mprStatus,
      onAction:    () => navigate("/mpr"),
    },
    {
      icon:        Anchor,
      title:       "The Anchor",
      layerTag:    "Layer 3 · 52-Week Rhythm",
      description: "The rhythms that make your business inevitable.",
      status:      anchorStatus,
      onAction:    () => navigate("/anchor"),
    },
  ]

  return (
    <div className="flex min-h-screen flex-col bg-[#F8F9FB]">

      {/* ── Top bar ─────────────────────────────────────────── */}
      <header className="flex items-center justify-between border-b border-border bg-white px-10 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-bop-dark-blue">
            <span className="text-xs font-bold text-white">B</span>
          </div>
          <span className="text-sm font-semibold text-foreground">
            {APP_FULL_NAME}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/os")}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          Full OS Dashboard
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </header>

      {/* ── Hero ────────────────────────────────────────────── */}
      <div className="flex flex-col items-center px-10 pb-10 pt-20 text-center">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
          {profile.businessName}
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Welcome to your Business on Purpose OS.
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Where should we begin?
        </p>
      </div>

      {/* ── Priority Cards ──────────────────────────────────── */}
      <div className="mx-auto w-full max-w-5xl flex-1 px-10 pb-20">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {cards.map((card) => (
            <PriorityCard key={card.title} {...card} />
          ))}
        </div>
      </div>
    </div>
  )
}

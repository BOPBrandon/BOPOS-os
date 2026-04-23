/**
 * Command Center — Post-login landing page.
 * Sidebar-free zone. Three dashboard cards lead into the full OS (with sidebar).
 * Route: /home
 */
import { useNavigate } from "react-router-dom"
import { LayoutDashboard, Anchor, GitBranch, ArrowRight, CheckCircle2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useProfile } from "@/context/ProfileContext"
import bopLogo from "@/assets/bop-logo.png"

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
type CardStatus = "not-started" | "in-progress" | "completed"

interface PriorityCardProps {
  icon:         React.ComponentType<{ className?: string }>
  title:        string
  layerTag?:    string
  description:  string
  status:       CardStatus
  recommended?: boolean
  onAction:     () => void
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
  icon: Icon, title, layerTag, description, status, recommended, onAction,
}: PriorityCardProps) {
  const hasStarted = status !== "not-started"

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-2xl border bg-white p-8 shadow-sm",
        "transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5",
        recommended
          ? "border-bop-dark-blue/30 ring-1 ring-bop-dark-blue/10"
          : "border-border"
      )}
    >
      {recommended && (
        <div className="absolute -top-3 left-8 flex items-center gap-1.5 rounded-full bg-bop-dark-blue px-3 py-1 shadow-sm">
          <Sparkles className="h-3 w-3 text-white" />
          <span className="text-[11px] font-semibold text-white tracking-wide">Start Here</span>
        </div>
      )}

      <div className="flex-1 flex flex-col items-center text-center">
        <h2 className="text-lg font-bold tracking-tight text-foreground">{title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>

      <div className="mt-8 flex justify-center">
        <Button
          onClick={onAction}
          variant={recommended ? "default" : "outline"}
          className={cn(
            "gap-2 rounded-xl font-semibold transition-all",
            recommended && "bg-bop-dark-blue hover:bg-bop-dark-blue/90 text-white shadow-sm"
          )}
        >
          {hasStarted ? (
            <><CheckCircle2 className="h-4 w-4" />Continue</>
          ) : (
            <>Start<ArrowRight className="h-4 w-4" /></>
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

  // Derive status from profile data
  const completedModules = Object.values(profile.modules).filter((m) => m?.status === "completed").length
  const osStatus: CardStatus =
    completedModules > 0 || profile.visionStory?.visionStatement ? "in-progress" : "not-started"

  const mprModuleSlots = [
    "module-07-master-process-roadmap",
    "module-13-core-process-map",
    "module-14-quality-control",
    "module-15-customer-journey",
  ] as const
  const mprStatus: CardStatus =
    mprModuleSlots.some((s) => profile.modules[s]?.status === "completed") ? "in-progress" : "not-started"

  const anchorStatus: CardStatus = profile.anchorRhythms?.length > 0 ? "in-progress" : "not-started"

  const cards: PriorityCardProps[] = [
    {
      icon:        LayoutDashboard,
      title:       "OS",
      description: "Tools to run the business.",
      status:      osStatus,
      recommended: true,
      onAction:    () => navigate("/os"),
    },
    {
      icon:        GitBranch,
      title:       "Master Process Roadmap",
      layerTag:    "Layer 2 · The MPR",
      description: "Processes to deliver the product.",
      status:      mprStatus,
      onAction:    () => navigate("/mpr"),
    },
    {
      icon:        Anchor,
      title:       "Anchor",
      layerTag:    "Layer 3 · 52-Week Rhythm",
      description: "Implementation with repetition, predictability, and meaning.",
      status:      anchorStatus,
      onAction:    () => navigate("/anchor"),
    },
  ]

  // First name only for the greeting
  const firstName = profile.ownerName?.split(" ")[0] ?? "there"

  return (
    <div className="flex min-h-screen flex-col bg-[#F8F9FB]">

      {/* ── Top bar — clean, no nav clutter ─────────────────── */}
      <header className="flex items-center justify-between border-b border-border bg-white px-10 py-4">
        <img
          src={bopLogo}
          alt="Business on Purpose"
          className="h-8 w-auto"
        />
        <span className="text-xs font-medium text-muted-foreground">
          Command Center
        </span>
      </header>

      {/* ── Greeting ─────────────────────────────────────────── */}
      <div className="flex flex-col items-center px-10 pb-10 pt-16 text-center">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground/50">
          {profile.businessName}
        </p>
        <h1
          className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          Welcome back, {firstName}.
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          What are we working on today?
        </p>
      </div>

      {/* ── Priority Cards ───────────────────────────────────── */}
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

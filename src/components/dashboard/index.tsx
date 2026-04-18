import { Users, Cog, Package, TrendingUp } from "lucide-react"
import { FOUR_PS } from "@/bopos-config"

const P_ICONS = {
  People: Users,
  Process: Cog,
  Product: Package,
  Profit: TrendingUp,
}

/**
 * Layer 1 — The Operating System
 * Displays the 4 P's health dashboard: People, Process, Product, Profit.
 * This is the executive view of the business.
 */
export function OSDashboard() {
  return (
    <div className="flex flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">The Operating System</h1>
        <p className="text-muted-foreground mt-1">4 P's — Executive health view of your business</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {FOUR_PS.map((p) => {
          const Icon = P_ICONS[p]
          return (
            <div
              key={p}
              className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">{p}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {p} metrics and KPIs will appear here.
              </p>
              <div className="mt-auto h-1.5 w-full rounded-full bg-muted">
                <div className="h-1.5 w-1/3 rounded-full bg-primary opacity-40" />
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Layer 1 of 3 — Connect your data sources to populate the 4 P's.
      </p>
    </div>
  )
}

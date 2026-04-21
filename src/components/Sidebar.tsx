import { NavLink } from "react-router-dom"
import { LayoutDashboard, Map, Anchor, ChevronRight, LogOut, Hammer } from "lucide-react"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import { APP_NAME, APP_FULL_NAME, PRIMARY_DASHBOARDS } from "@/bopos-config"

const TOKEN_KEY = "bopos_token"

const NAV_ICONS = {
  os:     LayoutDashboard,
  mpr:    Map,
  anchor: Anchor,
} as const

function handleSignOut() {
  localStorage.removeItem(TOKEN_KEY)
  // Full reload so App re-evaluates the token gate
  window.location.href = "/"
}

export function Sidebar() {
  return (
    <aside className="flex h-screen w-64 flex-col bg-bop-dark-blue">

      {/* Brand */}
      <div className="flex flex-col gap-1 px-6 py-5">
        <span className="text-xs font-semibold uppercase tracking-widest text-bop-white/50">
          {APP_NAME}
        </span>
        <span className="text-sm font-medium leading-tight text-bop-white">
          {APP_FULL_NAME}
        </span>
      </div>

      <Separator className="bg-bop-white/10" />

      {/* Primary Navigation */}
      <nav className="flex flex-col gap-1 px-3 py-4">
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-widest text-bop-white/40">
          Dashboards
        </p>

        {PRIMARY_DASHBOARDS.map((dashboard) => {
          const Icon = NAV_ICONS[dashboard.id as keyof typeof NAV_ICONS]
          return (
            <NavLink
              key={dashboard.id}
              to={dashboard.path}
              className={({ isActive }) =>
                cn(
                  "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-bop-light-orange text-white"
                    : "text-bop-white/70 hover:bg-bop-white/10 hover:text-bop-white"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 leading-tight">
                    <span className="block">{dashboard.shortLabel}</span>
                  </span>
                  <ChevronRight
                    className={cn(
                      "h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-60",
                      isActive && "opacity-60"
                    )}
                  />
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      <Separator className="bg-bop-white/10" />

      {/* Build Tools */}
      <nav className="flex flex-col gap-1 px-3 py-4">
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-widest text-bop-white/40">
          Build
        </p>
        <NavLink
          to="/workbench"
          className={({ isActive }) =>
            cn(
              "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-bop-light-orange text-white"
                : "text-bop-white/70 hover:bg-bop-white/10 hover:text-bop-white"
            )
          }
        >
          {({ isActive }) => (
            <>
              <Hammer className="h-4 w-4 shrink-0" />
              <span className="flex-1 leading-tight">The Workbench</span>
              <ChevronRight
                className={cn(
                  "h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-60",
                  isActive && "opacity-60"
                )}
              />
            </>
          )}
        </NavLink>
      </nav>

      <Separator className="bg-bop-white/10" />

      {/* Layer indicator */}
      <div className="px-6 py-4">
        <p className="text-xs text-bop-white/40">
          Three-Layer Architecture
        </p>
        <div className="mt-2 flex flex-col gap-1">
          {PRIMARY_DASHBOARDS.map((d) => (
            <div key={d.id} className="flex items-center gap-2">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-bop-white/10 text-[10px] font-bold text-bop-white/60">
                {d.layer}
              </span>
              <span className="text-xs text-bop-white/60">{d.shortLabel}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sign Out — pinned to bottom */}
      <div className="mt-auto px-3 pb-4">
        <Separator className="mb-4 bg-bop-white/10" />
        <button
          onClick={handleSignOut}
          className={cn(
            "group flex w-full items-center gap-3 rounded-md px-3 py-2.5",
            "text-sm font-medium text-bop-white/50",
            "hover:bg-red-500/20 hover:text-red-300 transition-colors"
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>

    </aside>
  )
}

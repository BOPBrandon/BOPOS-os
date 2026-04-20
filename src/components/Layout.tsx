import { useState, useEffect } from "react"
import { Outlet, useLocation } from "react-router-dom"
import { Sidebar } from "@/components/Sidebar"
import { CoachPanel } from "@/components/coach/CoachPanel"

export function Layout() {
  const location = useLocation()

  // Auto-open coach on MPR and Anchor routes (split-screen experience)
  const isCoachRoute = location.pathname.startsWith("/mpr") || location.pathname.startsWith("/anchor")
  const [coachOpen, setCoachOpen] = useState(isCoachRoute)

  // When navigating TO a coach route, open the panel
  useEffect(() => {
    if (isCoachRoute) setCoachOpen(true)
  }, [isCoachRoute])

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-auto min-w-0">
        <Outlet />
      </main>
      <CoachPanel isOpen={coachOpen} onToggle={() => setCoachOpen((p) => !p)} />
    </div>
  )
}

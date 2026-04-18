import { useState } from "react"
import { Outlet } from "react-router-dom"
import { Sidebar } from "@/components/Sidebar"
import { CoachPanel } from "@/components/coach/CoachPanel"

export function Layout() {
  const [coachOpen, setCoachOpen] = useState(false)

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

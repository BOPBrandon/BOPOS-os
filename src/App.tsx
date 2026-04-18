import { BrowserRouter, Routes, Route } from "react-router-dom"
import { ProfileProvider } from "@/context/ProfileContext"
import { ActiveSessionProvider } from "@/context/ActiveSessionContext"
import { Layout } from "@/components/Layout"
import { OSDashboard } from "@/components/dashboard/OSDashboard"
import { MPRDashboard } from "@/components/mpr"
import { AnchorEngine } from "@/components/anchor/AnchorEngine"
import { HomePage } from "@/pages/HomePage"
import { VisionStoryPage } from "@/pages/VisionStoryPage"

export default function App() {
  return (
    <ProfileProvider>
      <ActiveSessionProvider>
      <BrowserRouter>
        <Routes>
          {/* Full-screen routes — no sidebar Layout */}
          <Route index element={<HomePage />} />
          <Route path="/vision-story" element={<VisionStoryPage />} />

          {/* Dashboard routes — inside sidebar Layout */}
          <Route element={<Layout />}>
            <Route path="/os" element={<OSDashboard />} />
            <Route path="/mpr" element={<MPRDashboard />} />
            <Route path="/anchor" element={<AnchorEngine />} />
          </Route>
        </Routes>
      </BrowserRouter>
      </ActiveSessionProvider>
    </ProfileProvider>
  )
}

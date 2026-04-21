import { useState } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { ProfileProvider } from "@/context/ProfileContext"
import { ActiveSessionProvider } from "@/context/ActiveSessionContext"
import { MPRProvider } from "@/context/MPRContext"
import { AnchorProvider } from "@/context/AnchorContext"
import { Layout } from "@/components/Layout"
import { OSDashboard } from "@/components/dashboard/OSDashboard"
import { MPRDashboard } from "@/components/mpr"
import { AnchorEngine } from "@/components/anchor/AnchorEngine"
import { HomePage } from "@/pages/HomePage"
import { VisionStoryPage } from "@/pages/VisionStoryPage"
import { WorkbenchPage } from "@/pages/WorkbenchPage"
import { SignIn } from "@/pages/SignIn"
import { OpeningFrame } from "@/pages/OpeningFrame"
import { OnboardingFlow } from "@/pages/OnboardingFlow"
import type { OnboardingData } from "@/pages/OnboardingFlow"

const TOKEN_KEY   = "bopos_token"
const PROFILE_KEY = "bopos_profile"

export default function App() {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_KEY)
  )
  const [profile, setProfile] = useState<object | null>(() => {
    try {
      const saved = localStorage.getItem(PROFILE_KEY)
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [showOpeningFrame, setShowOpeningFrame] = useState(false)
  const [showOnboarding,   setShowOnboarding]   = useState(false)

  // ── Gate 1: No token → Sign In ────────────────────────────
  if (!token) {
    return (
      <SignIn
        onSignIn={() => {
          setToken(localStorage.getItem(TOKEN_KEY))
          setShowOpeningFrame(true)
        }}
        onCreateAccount={() => {
          const newToken = "bopos_session_" + Date.now()
          localStorage.setItem(TOKEN_KEY, newToken)
          setToken(newToken)
          setShowOpeningFrame(true)
        }}
      />
    )
  }

  // ── Gate 2: Welcome screen (once per session after auth) ──
  if (showOpeningFrame) {
    return (
      <OpeningFrame
        onEnter={() => {
          setShowOpeningFrame(false)
          if (!profile) setShowOnboarding(true)
        }}
      />
    )
  }

  // ── Gate 3: New-user onboarding (triggered from OpeningFrame) ──
  if (showOnboarding) {
    function handleOnboardingComplete(data: OnboardingData) {
      const nameParts  = data.name.trim().split(" ")
      const profileData = {
        ownerFirstName:  nameParts[0] ?? "",
        ownerLastName:   nameParts.slice(1).join(" "),
        ownerName:       data.name.trim(),
        businessName:    data.businessName,
        location:        data.location,
        industry:        data.industry,
        employeeCount:   data.employeeCount,
        yearsInBusiness: data.yearsInBusiness,
        createdAt:       new Date().toISOString(),
      }
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profileData))
      setProfile(profileData)
      setShowOnboarding(false)
    }
    return <OnboardingFlow onComplete={handleOnboardingComplete} />
  }

  // ── Gate 4: Fully authenticated → Command Center ─────────
  return (
    <AnchorProvider>
    <MPRProvider>
    <ProfileProvider>
      <ActiveSessionProvider>
        <BrowserRouter>
          <Routes>
            <Route index element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/vision-story" element={<VisionStoryPage />} />

            <Route element={<Layout />}>
              <Route path="/os" element={<OSDashboard />} />
              <Route path="/mpr" element={<MPRDashboard />} />
              <Route path="/anchor" element={<AnchorEngine />} />
            </Route>

            {/* Full-screen Workbench — standalone, no Layout sidebar */}
            <Route path="/workbench" element={<WorkbenchPage />} />

            {/* Catch-all → Command Center */}
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </BrowserRouter>
      </ActiveSessionProvider>
    </ProfileProvider>
    </MPRProvider>
    </AnchorProvider>
  )
}

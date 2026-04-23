import { useState, useEffect } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
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
import { MissionStatementPage } from "@/pages/MissionStatementPage"
import { WorkbenchPage } from "@/pages/WorkbenchPage"
import { SignIn } from "@/pages/SignIn"
import { OpeningFrame } from "@/pages/OpeningFrame"
import { OnboardingFlow } from "@/pages/OnboardingFlow"
import type { User } from "@supabase/supabase-js"
import type { OnboardingData } from "@/pages/OnboardingFlow"

const PROFILE_KEY = "bopos_profile"

export default function App() {
  const [user,        setUser]        = useState<User | null>(null)
  const [authReady,   setAuthReady]   = useState(false)
  const [devBypass,   setDevBypass]   = useState(false)
  const [showOpeningFrame, setShowOpeningFrame] = useState(false)
  const [showOnboarding,   setShowOnboarding]   = useState(false)
  const [profile, setProfile] = useState<object | null>(() => {
    try {
      const saved = localStorage.getItem(PROFILE_KEY)
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  // Establish session on mount; react to auth state changes.
  // onAuthStateChange fires on every tab-focus token refresh too —
  // we only want showOpeningFrame on an explicit sign-in (handled by
  // the onSignIn/onCreateAccount callbacks below), not on reload.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthReady(true)
    }).catch(() => {
      setUser(null)
      setAuthReady(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // ── Auth loading ──────────────────────────────────────────────
  if (!authReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#002855]">
        <span className="h-6 w-6 rounded-full border-2 border-white/20 border-t-white animate-spin" />
      </div>
    )
  }

  // ── Gate 1: No session → Sign In ──────────────────────────────
  if (!user && !devBypass) {
    return (
      <SignIn
        onSignIn={() => setShowOpeningFrame(true)}
        onCreateAccount={() => setShowOpeningFrame(true)}
        onDevBypass={() => setDevBypass(true)}
      />
    )
  }

  // ── Gate 2: Welcome screen (once per sign-in) ─────────────────
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

  // ── Gate 3: New-user onboarding ───────────────────────────────
  if (showOnboarding) {
    function handleOnboardingComplete(data: OnboardingData) {
      const nameParts   = data.name.trim().split(" ")
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

  // ── Gate 4: Fully authenticated → Command Center ─────────────
  return (
    <AnchorProvider>
    <MPRProvider>
    <ProfileProvider>
      <ActiveSessionProvider>
        <BrowserRouter>
          <Routes>
            <Route index element={<Navigate to="/os" replace />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/vision-story" element={<VisionStoryPage />} />
            <Route path="/mission-statement" element={<MissionStatementPage />} />

            <Route element={<Layout />}>
              <Route path="/os" element={<OSDashboard />} />
              <Route path="/mpr" element={<MPRDashboard />} />
              <Route path="/anchor" element={<AnchorEngine />} />
            </Route>

            {/* Full-screen Workbench — standalone, no Layout sidebar */}
            <Route path="/workbench" element={<WorkbenchPage />} />

            {/* Catch-all → OS Dashboard */}
            <Route path="*" element={<Navigate to="/os" replace />} />
          </Routes>
        </BrowserRouter>
      </ActiveSessionProvider>
    </ProfileProvider>
    </MPRProvider>
    </AnchorProvider>
  )
}

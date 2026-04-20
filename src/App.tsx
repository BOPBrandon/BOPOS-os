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
import { SignIn } from "@/pages/SignIn"
import { OpeningFrame } from "@/pages/OpeningFrame"
// @ts-expect-error — JSX component, no type declarations
import BOPOSOnboarding from "./components/BOPOSOnboarding"

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
  const [creatingAccount,  setCreatingAccount]  = useState(false)
  const [showOpeningFrame, setShowOpeningFrame] = useState(false)

  // ── Gate 1: Not signed in ─────────────────────────────────
  if (!token && !creatingAccount) {
    return (
      <SignIn
        onSignIn={() => {
          setToken(localStorage.getItem(TOKEN_KEY))
          setShowOpeningFrame(true)
        }}
        onCreateAccount={() => setCreatingAccount(true)}
      />
    )
  }

  // ── Gate 2: No profile → onboarding (sign-up or orphaned token) ──
  if (!profile) {
    function handleOnboardingComplete(data: object) {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(data))
      if (!token) {
        const newToken = "bopos_session_" + Date.now()
        localStorage.setItem(TOKEN_KEY, newToken)
        setToken(newToken)
      }
      setCreatingAccount(false)
      setProfile(data)
      setShowOpeningFrame(true)
    }
    return <BOPOSOnboarding onComplete={handleOnboardingComplete} />
  }

  // ── Gate 2.5: Opening Frame — shown once per session after auth ──
  if (showOpeningFrame) {
    return <OpeningFrame onEnter={() => setShowOpeningFrame(false)} />
  }

  // ── Gate 3: Fully authenticated ──────────────────────────
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

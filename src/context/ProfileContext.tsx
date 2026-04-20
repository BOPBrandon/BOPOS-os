/**
 * ProfileContext
 * Lifts ClientProfile state to the app level so every dashboard
 * and the CoachPanel share the same live data without prop drilling.
 */
import { createContext, useContext, useState } from "react"
import { createDemoProfile, createBlankProfile } from "@/services/databridge"
import type { ClientProfile } from "@/types/bopos"

interface ProfileContextValue {
  profile: ClientProfile
  setProfile: React.Dispatch<React.SetStateAction<ClientProfile>>
}

const ProfileContext = createContext<ProfileContextValue | null>(null)

function loadInitialProfile(): ClientProfile {
  try {
    const saved = localStorage.getItem("bopos_profile")
    if (saved) {
      const parsed = JSON.parse(saved)

      // Full ClientProfile shape — has `modules` key
      if (parsed && typeof parsed.modules !== "undefined") {
        return parsed as ClientProfile
      }

      // New onboarding shape — has ownerFirstName but no modules.
      // Merge the user's data into a blank profile so every dashboard
      // field (modules, visionStory, bankAccounts, etc.) is safe to access.
      if (parsed && parsed.ownerFirstName) {
        const ownerName = [parsed.ownerFirstName, parsed.ownerLastName]
          .filter(Boolean)
          .join(" ")
        const blank = createBlankProfile(
          `client-${Date.now()}`,
          parsed.businessName ?? "",
          ownerName
        )
        return {
          ...blank,
          ownerEmail: parsed.ownerEmail ?? "",
          industry:   parsed.industry ?? "",
        }
      }
    }
  } catch {
    // corrupted storage — fall through to demo
  }
  return createDemoProfile()
}

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<ClientProfile>(loadInitialProfile)

  return (
    <ProfileContext.Provider value={{ profile, setProfile }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error("useProfile must be used inside <ProfileProvider>")
  return ctx
}

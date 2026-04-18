/**
 * ActiveSessionContext
 * ============================================================
 * Tracks the currently active coaching session:
 *  - Which module is being worked on right now
 *  - The pending MODULE_UPDATE payload staged by the AI
 *    (sitting in the "draft" zone, not yet committed)
 *  - Version history for undo (ring buffer, max 10 snapshots)
 *  - isAILoading flag so ModuleCards can show a typing pulse
 *  - justCommittedSlot — clears after 2 s so cards flash "Updated ✓"
 *
 * commitUpdate() writes the staged fields into profile.modules[slot].data
 * and runs pullForward so downstream UI updates in real-time.
 *
 * Must be rendered INSIDE <ProfileProvider>.
 * ============================================================
 */
import { createContext, useContext, useState, useEffect } from "react"
import { useProfile } from "@/context/ProfileContext"
import { pullForward } from "@/services/databridge/pull-forward"
import { MODULE_REGISTRY } from "@/types/bopos"
import type { ModuleSlot, BOPOSModule, ClientProfile } from "@/types/bopos"
import type { ModuleUpdatePayload } from "@/components/coach/ModuleBridge"

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const HISTORY_MAX = 10

// ─────────────────────────────────────────────
// CONTEXT SHAPE
// ─────────────────────────────────────────────

interface ActiveSessionContextValue {
  /** Which module the current coaching session is focused on */
  activeModuleSlot: ModuleSlot | null
  setActiveModuleSlot: (slot: ModuleSlot | null) => void

  /** The AI's staged update — waiting for user to confirm */
  pendingUpdate: ModuleUpdatePayload | null
  setPendingUpdate: (update: ModuleUpdatePayload | null) => void

  /**
   * Write pendingUpdate.fields → profile.modules[slot].data,
   * run pullForward, push the pre-commit snapshot to history,
   * set justCommittedSlot, then clear the pending update.
   */
  commitUpdate: () => void

  /** Discard the pending update without writing anything */
  dismissUpdate: () => void

  // ── Phase 5 additions ──────────────────────

  /** True while the AI is generating a reply — lets cards show a typing pulse */
  isAILoading: boolean
  setIsAILoading: (loading: boolean) => void

  /** True when there are snapshots to restore */
  canUndo: boolean

  /**
   * Restore the most-recent pre-commit profile snapshot.
   * Pops one entry from the ring buffer.
   */
  undoLastCommit: () => void

  /**
   * The slot that was most recently committed.
   * Auto-clears to null after 2 seconds — used by ModuleCards
   * to flash a "Updated ✓" indicator.
   */
  justCommittedSlot: ModuleSlot | null
}

const ActiveSessionContext = createContext<ActiveSessionContextValue | null>(null)

// ─────────────────────────────────────────────
// PROVIDER
// ─────────────────────────────────────────────

export function ActiveSessionProvider({ children }: { children: React.ReactNode }) {
  const { profile, setProfile } = useProfile()

  const [activeModuleSlot,   setActiveModuleSlot]   = useState<ModuleSlot | null>(null)
  const [pendingUpdate,      setPendingUpdate]      = useState<ModuleUpdatePayload | null>(null)
  const [isAILoading,        setIsAILoading]        = useState(false)
  const [profileHistory,     setProfileHistory]     = useState<ClientProfile[]>([])
  const [justCommittedSlot,  setJustCommittedSlot]  = useState<ModuleSlot | null>(null)

  // Auto-clear justCommittedSlot after 2 seconds
  useEffect(() => {
    if (!justCommittedSlot) return
    const timer = setTimeout(() => setJustCommittedSlot(null), 2000)
    return () => clearTimeout(timer)
  }, [justCommittedSlot])

  function commitUpdate() {
    if (!pendingUpdate) return
    const { moduleSlot, status, fields, mode } = pendingUpdate

    // Snapshot current profile BEFORE mutating (for undo)
    setProfileHistory((prev) => {
      const next = [...prev, profile]
      return next.length > HISTORY_MAX ? next.slice(next.length - HISTORY_MAX) : next
    })

    setProfile((prev) => {
      const existing = prev.modules[moduleSlot]
      const meta     = MODULE_REGISTRY[moduleSlot]

      const mergedData =
        mode === "replace"
          ? fields                                        // wipe and replace
          : { ...(existing?.data ?? {}), ...fields }      // patch — preserve untouched fields

      const updatedModule: BOPOSModule = {
        // Defaults from registry — override with anything existing
        id:       moduleSlot,
        slot:     meta?.slot      ?? 0,
        label:    meta?.label     ?? moduleSlot,
        layer:    meta?.layer     ?? 1,
        category: meta?.category  ?? "foundation",
        ...existing,
        data:      mergedData,
        draftData: undefined,                             // clear staging area
        status:    status ?? existing?.status ?? "in_progress",
        ...(status === "completed" && {
          completedAt: new Date().toISOString().slice(0, 10),
        }),
      }

      const withModule = {
        ...prev,
        modules: { ...prev.modules, [moduleSlot]: updatedModule },
      }

      // Cascade into downstream profile fields
      const { updatedProfile } = pullForward(moduleSlot, withModule)
      return updatedProfile
    })

    // Signal cards to flash "Updated ✓"
    setJustCommittedSlot(moduleSlot)
    setPendingUpdate(null)
  }

  function dismissUpdate() {
    setPendingUpdate(null)
  }

  function undoLastCommit() {
    setProfileHistory((prev) => {
      if (prev.length === 0) return prev
      const snapshot = prev[prev.length - 1]
      setProfile(snapshot)
      return prev.slice(0, prev.length - 1)
    })
  }

  const canUndo = profileHistory.length > 0

  return (
    <ActiveSessionContext.Provider
      value={{
        activeModuleSlot,   setActiveModuleSlot,
        pendingUpdate,      setPendingUpdate,
        commitUpdate,       dismissUpdate,
        isAILoading,        setIsAILoading,
        canUndo,            undoLastCommit,
        justCommittedSlot,
      }}
    >
      {children}
    </ActiveSessionContext.Provider>
  )
}

// ─────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────

export function useActiveSession(): ActiveSessionContextValue {
  const ctx = useContext(ActiveSessionContext)
  if (!ctx) throw new Error("useActiveSession must be used inside <ActiveSessionProvider>")
  return ctx
}

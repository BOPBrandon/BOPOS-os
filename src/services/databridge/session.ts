/**
 * ============================================================
 * DataBridge — Session Opening Sequence
 * The "10%" that sets the context for every BOPOS session.
 * ============================================================
 *
 * Sequence:
 *   Phase 1 — B.I.G. Wins      (Big Intentional Goals wins since last session)
 *   Phase 2 — Previous Tool Review  (What did we complete last time?)
 *   Phase 3 — Current Work     (What are we building today? — the 80%)
 *   Phase 4 — Closed           (Session complete)
 *
 * The state machine is intentionally linear: you can only advance
 * forward, never skip. This enforces the rhythm.
 * ============================================================
 */

import type {
  SessionData,
  SessionPhase,
  BIGWin,
  ClientProfile,
  ModuleSlot,
  BOPOSModule,
  Percentage,
} from "@/types/bopos"
import { MODULE_REGISTRY } from "@/types/bopos"

// nanoid is a small dep — but we can inline a simple ID generator
// to stay consistent with "Use What We Have"
function generateId(): string {
  return Math.random().toString(36).slice(2, 11)
}

// ─────────────────────────────────────────────
// PHASE TRANSITIONS
// ─────────────────────────────────────────────

const PHASE_ORDER: SessionPhase[] = [
  "big_wins",
  "previous_tool_review",
  "current_work",
  "closed",
]

export function nextPhase(current: SessionPhase): SessionPhase {
  const idx = PHASE_ORDER.indexOf(current)
  if (idx === -1 || idx === PHASE_ORDER.length - 1) return "closed"
  return PHASE_ORDER[idx + 1]
}

export function phaseLabel(phase: SessionPhase): string {
  return {
    big_wins:             "B.I.G. Wins",
    previous_tool_review: "Previous Tool Review",
    current_work:         "Current Work",
    closed:               "Session Closed",
  }[phase]
}

export function phasePercent(phase: SessionPhase): Percentage {
  // 10 / 10 / 80 — mirrors the 10/80/10 model
  return { big_wins: 5, previous_tool_review: 10, current_work: 90, closed: 100 }[phase]
}

// ─────────────────────────────────────────────
// SESSION FACTORY
// ─────────────────────────────────────────────

/**
 * openSession
 * Initializes a new Session for a client, pre-populated with:
 *   - The most recently completed module (Previous Tool Review)
 *   - The next recommended module (Current Work)
 *   - An empty B.I.G. Wins list ready for entry
 */
export function openSession(profile: ClientProfile): SessionData {
  const { lastCompleted, nextRecommended } = resolveSessionModules(profile)

  return {
    sessionId: generateId(),
    clientId: profile.id,
    phase: "big_wins",
    startedAt: new Date().toISOString().slice(0, 10),

    bigWins: [],

    previousToolReview: {
      moduleId: lastCompleted?.id ?? null,
      reviewNotes: "",
      isComplete: false,
    },

    currentWork: {
      moduleId: nextRecommended?.id ?? null,
      workNotes: "",
      progressPercent: nextRecommended
        ? getModuleProgress(nextRecommended)
        : 0,
    },
  }
}

// ─────────────────────────────────────────────
// SESSION MUTATIONS
// All return a new SessionData — pure, no mutation.
// ─────────────────────────────────────────────

/**
 * advanceSession
 * Moves the session to the next phase.
 * Will not advance past "closed".
 */
export function advanceSession(session: SessionData): SessionData {
  if (session.phase === "closed") return session
  return { ...session, phase: nextPhase(session.phase) }
}

/**
 * closeSession
 * Finalizes the session. Sets closedAt and moves to "closed".
 */
export function closeSession(session: SessionData): SessionData {
  return {
    ...session,
    phase: "closed",
    closedAt: new Date().toISOString().slice(0, 10),
  }
}

/**
 * addBIGWin
 * Records a B.I.G. Win during the opening phase.
 */
export function addBIGWin(
  session: SessionData,
  text: string,
  category: BIGWin["category"]
): SessionData {
  const win: BIGWin = {
    id: generateId(),
    text,
    category,
    recordedAt: new Date().toISOString().slice(0, 10),
  }
  return { ...session, bigWins: [...session.bigWins, win] }
}

/**
 * removeBIGWin
 */
export function removeBIGWin(session: SessionData, winId: string): SessionData {
  return { ...session, bigWins: session.bigWins.filter((w) => w.id !== winId) }
}

/**
 * completePreviousToolReview
 * Marks the Previous Tool Review phase as done with optional notes.
 */
export function completePreviousToolReview(
  session: SessionData,
  notes: string
): SessionData {
  return {
    ...session,
    previousToolReview: {
      ...session.previousToolReview,
      reviewNotes: notes,
      isComplete: true,
    },
  }
}

/**
 * updateCurrentWork
 * Updates notes and progress for the Current Work phase.
 */
export function updateCurrentWork(
  session: SessionData,
  updates: { workNotes?: string; progressPercent?: Percentage; moduleId?: ModuleSlot }
): SessionData {
  return {
    ...session,
    currentWork: { ...session.currentWork, ...updates },
  }
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/**
 * resolveSessionModules
 * Determines which module was last completed and what comes next.
 * "Next" = first module in slot order that is not yet completed.
 */
function resolveSessionModules(profile: ClientProfile): {
  lastCompleted: BOPOSModule | null
  nextRecommended: BOPOSModule | null
} {
  const allModules = Object.values(profile.modules).filter(Boolean) as BOPOSModule[]
  const sorted = [...allModules].sort((a, b) => a.slot - b.slot)

  const completed = sorted.filter((m) => m.status === "completed")
  const lastCompleted = completed.at(-1) ?? null

  const nextRecommended =
    sorted.find((m) => m.status === "in_progress") ??
    sorted.find((m) => m.status === "not_started") ??
    null

  return { lastCompleted, nextRecommended }
}

function getModuleProgress(module: BOPOSModule): Percentage {
  if (module.status === "completed") return 100
  if (module.status === "in_progress") return 50
  return 0
}

/**
 * getSessionSummary
 * Human-readable summary of session state — useful for the UI header.
 */
export function getSessionSummary(session: SessionData, profile: ClientProfile): string {
  const phase = phaseLabel(session.phase)
  const wins = session.bigWins.length

  if (session.phase === "big_wins") {
    return `${profile.ownerName} — Session Open | ${phase} | ${wins} win${wins !== 1 ? "s" : ""} recorded`
  }

  if (session.phase === "previous_tool_review") {
    const module = session.previousToolReview.moduleId
    const label = module ? MODULE_REGISTRY[module]?.label ?? module : "None"
    return `${profile.ownerName} — ${phase} | Reviewing: ${label}`
  }

  if (session.phase === "current_work") {
    const module = session.currentWork.moduleId
    const label = module ? MODULE_REGISTRY[module]?.label ?? module : "Open"
    return `${profile.ownerName} — ${phase} | Working on: ${label} (${session.currentWork.progressPercent}%)`
  }

  return `${profile.ownerName} — Session Closed`
}

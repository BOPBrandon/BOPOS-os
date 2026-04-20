/**
 * CoachPanel — Persistent AI Coaching Panel
 * ============================================================
 * Unified Navy/Cream/Gold styling matching Vision Story experience.
 * Auto-opens on /mpr and /anchor routes (split-screen feel).
 * Parses MPR_DRAFT and ANCHOR_DRAFT tags to auto-create cards/rhythms.
 * ============================================================
 */
import { useState, useRef, useEffect, useMemo } from "react"
import { useLocation } from "react-router-dom"
import {
  Bot, Send, X, Trash2, ChevronRight,
  Loader2, AlertCircle, CheckCircle2, Undo2,
  Sparkles, Plus,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useProfile } from "@/context/ProfileContext"
import { useActiveSession } from "@/context/ActiveSessionContext"
import { useMPR } from "@/context/MPRContext"
import { useAnchor } from "@/context/AnchorContext"
import { MODULE_REGISTRY } from "@/types/bopos"
import { BRAINS, getBrainFromPath, type BrainId } from "./coach-brains"
import { parseAIResponse, summarizeUpdate, buildConfirmationSentence } from "./ModuleBridge"
import type { RhythmItem, FrequencyTier, RhythmCategory } from "@/components/anchor/anchor-types"

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
interface DraftAction {
  type:  "mpr" | "anchor"
  title: string
}

interface Message {
  id:          string
  role:        "user" | "assistant"
  content:     string
  timestamp:   Date
  hadUpdate?:  boolean
  draftAction?: DraftAction
}

// ─────────────────────────────────────────────
// TAG PARSERS
// ─────────────────────────────────────────────
const MPR_DRAFT_RE    = /<MPR_DRAFT>([\s\S]*?)<\/MPR_DRAFT>/g
const ANCHOR_DRAFT_RE = /<ANCHOR_DRAFT>([\s\S]*?)<\/ANCHOR_DRAFT>/g

function parseMPRDraft(raw: string): { laneId: string; title: string } | null {
  const match = [...raw.matchAll(MPR_DRAFT_RE)][0]
  if (!match) return null
  try {
    const p = JSON.parse(match[1].trim()) as { laneId?: string; title?: string }
    if (p.laneId && p.title) return { laneId: p.laneId, title: p.title }
  } catch { /* invalid json */ }
  return null
}

function parseAnchorDraft(raw: string): Partial<RhythmItem> | null {
  const match = [...raw.matchAll(ANCHOR_DRAFT_RE)][0]
  if (!match) return null
  try {
    const p = JSON.parse(match[1].trim()) as {
      label?: string; frequency?: string; category?: string; description?: string
    }
    if (p.label && p.frequency) {
      return {
        id:          crypto.randomUUID(),
        label:       p.label,
        frequency:   p.frequency as FrequencyTier,
        category:    (p.category ?? "general") as RhythmCategory,
        description: p.description ?? "",
        isLocked:    false,
        createdAt:   new Date().toISOString().slice(0, 10),
      }
    }
  } catch { /* invalid json */ }
  return null
}

function stripDraftTags(text: string): string {
  return text
    .replace(MPR_DRAFT_RE, "")
    .replace(ANCHOR_DRAFT_RE, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

// ─────────────────────────────────────────────
// API CALL
// ─────────────────────────────────────────────
async function callClaude(messages: Message[], systemPrompt: string): Promise<string> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey) throw new Error("NO_KEY")

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 1500,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}`)
  }

  const data = await res.json() as { content: Array<{ type: string; text: string }> }
  return data.content[0]?.text ?? ""
}

// ─────────────────────────────────────────────
// CONTEXT BUILDERS
// Serialize live dashboard state into plain text for the system prompt.
// ─────────────────────────────────────────────
function buildMPRContext(
  lanes: ReturnType<typeof useMPR>["state"]["lanes"],
  processes: ReturnType<typeof useMPR>["state"]["processes"],
): string {
  const lines = ["=== LIVE MPR DASHBOARD STATE ==="]
  lanes.forEach((lane) => {
    const laneProcesses = processes.filter((p) => p.laneId === lane.id)
    lines.push(`\nLane: ${lane.label} (id: "${lane.id}") — ${laneProcesses.length} processes`)
    laneProcesses.forEach((p) => {
      const documented = p.writtenDoc.trim() || p.videoUrl.trim() ? "✓ documented" : "○ not documented"
      lines.push(`  • ${p.title} [${documented}]`)
    })
    if (laneProcesses.length === 0) lines.push(`  (no processes yet)`)
  })
  const documented = processes.filter((p) => p.writtenDoc.trim() || p.videoUrl.trim()).length
  lines.push(`\nTotal: ${processes.length} processes · ${documented} documented`)
  lines.push(`=== END MPR STATE ===`)
  return lines.join("\n")
}

function buildAnchorContext(items: RhythmItem[]): string {
  const lines = ["=== LIVE ANCHOR DASHBOARD STATE ==="]
  const byFreq = ["daily","weekly","monthly","quarterly","semi-annually","annually"] as const
  byFreq.forEach((freq) => {
    const tier = items.filter((i) => i.frequency === freq)
    if (tier.length === 0) {
      lines.push(`\n${freq.toUpperCase()} — ⚠ EMPTY (potential gap)`)
    } else {
      lines.push(`\n${freq.toUpperCase()} — ${tier.length} rhythm(s)`)
      tier.forEach((i) => lines.push(`  • ${i.label}${i.isLocked ? " 🔒" : ""}`))
    }
  })
  lines.push(`\nTotal: ${items.length} rhythm items`)
  lines.push(`=== END ANCHOR STATE ===`)
  return lines.join("\n")
}

// ─────────────────────────────────────────────
// MESSAGE BUBBLE
// Navy (user = bop-grey) / Cream (assistant = bop-dark-blue), matching Vision Story
// ─────────────────────────────────────────────
function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user"
  return (
    <div className={cn("flex w-full flex-col gap-1.5", isUser ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
          isUser
            ? "bg-bop-grey text-white rounded-tr-sm"
            : "bg-bop-dark-blue text-white rounded-tl-sm"
        )}
      >
        {message.content}
      </div>

      {/* Module data captured badge */}
      {message.hadUpdate && (
        <div className="flex items-center gap-1 px-1">
          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
          <span className="text-[10px] text-emerald-600 font-medium">Module data captured</span>
        </div>
      )}

      {/* Draft created badge */}
      {message.draftAction && (
        <div className="flex items-center gap-1.5 px-1">
          <div className={cn(
            "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold",
            message.draftAction.type === "mpr"
              ? "bg-amber-50 text-amber-700 border border-amber-200"
              : "bg-violet-50 text-violet-700 border border-violet-200"
          )}>
            <Plus className="h-2.5 w-2.5" />
            {message.draftAction.type === "mpr" ? "Added to MPR" : "Added to Anchor"}: {message.draftAction.title}
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// TYPING INDICATOR
// ─────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-bop-dark-blue rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-white/70 animate-bounce [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-white/70 animate-bounce [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-white/70 animate-bounce" />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// NO API KEY NOTICE
// ─────────────────────────────────────────────
function NoKeyNotice() {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      <AlertCircle className="h-8 w-8 text-amber-500" />
      <p className="text-sm font-semibold text-foreground">API Key Required</p>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Add your Anthropic API key to enable the AI coach.
        Create a <code className="font-mono bg-muted px-1 rounded">.env.local</code> file:
      </p>
      <code className="text-xs bg-muted px-3 py-2 rounded-md font-mono text-left w-full break-all">
        VITE_ANTHROPIC_API_KEY=sk-ant-...
      </code>
      <p className="text-xs text-muted-foreground">Then restart the dev server.</p>
    </div>
  )
}

// ─────────────────────────────────────────────
// SYNC BAR
// ─────────────────────────────────────────────
function SyncBar() {
  const { pendingUpdate, commitUpdate, dismissUpdate, canUndo, undoLastCommit } = useActiveSession()
  const showUndo    = canUndo && !pendingUpdate
  const showPending = !!pendingUpdate

  if (!showPending && !showUndo) return null

  const meta        = pendingUpdate ? MODULE_REGISTRY[pendingUpdate.moduleSlot] : null
  const moduleLabel = meta?.label ?? pendingUpdate?.moduleSlot ?? ""

  return (
    <div className="border-t-2 border-amber-300/60 bg-amber-50/80 px-4 py-3 shrink-0 flex flex-col gap-2">
      {showUndo && (
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">Last commit applied.</span>
          <button
            onClick={undoLastCommit}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] font-medium hover:bg-muted transition-colors"
          >
            <Undo2 className="h-3 w-3" />
            Undo
          </button>
        </div>
      )}

      {showPending && (
        <>
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            <span className="text-xs font-bold text-amber-800 flex-1">Ready to sync</span>
            {canUndo && (
              <button
                onClick={undoLastCommit}
                className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Undo2 className="h-3 w-3" />
                Undo last
              </button>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">{moduleLabel}</span>
            {" · "}{summarizeUpdate(pendingUpdate!)}
            {pendingUpdate!.status === "completed" && (
              <span className="ml-1 text-emerald-600 font-medium">· will mark complete</span>
            )}
          </p>
          <div className="flex flex-col gap-1.5 rounded-lg bg-background border border-border p-2 max-h-20 overflow-y-auto">
            {Object.entries(pendingUpdate!.fields).map(([key, val]) => (
              <div key={key} className="flex items-start gap-2 text-[10px]">
                <span className="text-muted-foreground font-mono shrink-0">{key}:</span>
                <span className="text-foreground truncate">
                  {typeof val === "string" ? val : JSON.stringify(val)}
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={commitUpdate}
              className="flex-1 rounded-xl py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 transition-colors"
            >
              Sync to Dashboard
            </button>
            <button
              onClick={dismissUpdate}
              className="text-xs text-muted-foreground hover:text-foreground px-2 py-2 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// WELCOME SCREEN
// ─────────────────────────────────────────────
const STARTER_PROMPTS: Record<BrainId, string[]> = {
  os: [
    "What should I build next based on my profile?",
    "Walk me through the Vision Story module.",
    "What is Real Revenue and why does it matter?",
    "Help me set up my bank account allocations.",
  ],
  mpr: [
    "What processes am I missing in my Marketing lane?",
    "Draft a Daily Huddle process for my Sales lane.",
    "Which of my processes should I document first?",
    "What processes do most businesses in my industry have?",
  ],
  anchor: [
    "What rhythms am I missing in my Anchor?",
    "Add a Monthly Financial Review to my Anchor.",
    "Walk me through the Non-Negotiable Vision Story Review.",
    "What does a healthy Weekly rhythm look like?",
  ],
}

function WelcomeScreen({
  brain,
  profile,
  onPrompt,
}: {
  brain:    Brain
  profile:  { businessName: string }
  onPrompt: (p: string) => void
}) {
  const prompts = STARTER_PROMPTS[brain.id] ?? []
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-amber-200/60 bg-amber-50/60 px-4 py-4">
        <p className="text-sm font-semibold text-foreground">
          Hi, I&apos;m your {brain.label} 👋
        </p>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
          I can see everything on your <strong>{profile.businessName}</strong> dashboard — every
          process, every rhythm, every module. Ask me to draft a card, spot a gap, or suggest
          what's missing.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-1">
          Quick starts
        </p>
        {prompts.map((p) => (
          <button
            key={p}
            onClick={() => onPrompt(p)}
            className={cn(
              "rounded-xl border border-border bg-background px-3 py-2.5 text-left",
              "text-xs text-foreground hover:border-amber-300/60 hover:bg-amber-50/50",
              "transition-colors"
            )}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Type alias for Brain (so WelcomeScreen can reference it)
// ─────────────────────────────────────────────
type Brain = (typeof BRAINS)[keyof typeof BRAINS]

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
interface CoachPanelProps {
  isOpen:   boolean
  onToggle: () => void
}

export function CoachPanel({ isOpen, onToggle }: CoachPanelProps) {
  const { profile }                              = useProfile()
  const { setPendingUpdate, pendingUpdate, setIsAILoading } = useActiveSession()
  const { state: mprState }                      = useMPR()
  const { items: anchorItems, addItem }          = useAnchor()
  const { addProcess }                           = useMPR()
  const location                                 = useLocation()
  const brainId                                  = getBrainFromPath(location.pathname)
  const brain                                    = BRAINS[brainId]
  const hasApiKey                                = !!import.meta.env.VITE_ANTHROPIC_API_KEY

  const [histories, setHistories] = useState<Record<BrainId, Message[]>>({ os: [], mpr: [], anchor: [] })
  const [input,       setInput]       = useState("")
  const [isLoading,   setIsLoading]   = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [lastBrainId, setLastBrainId] = useState<BrainId>(brainId)

  const messages    = histories[brainId]
  const setMessages = (updater: Message[] | ((prev: Message[]) => Message[])) =>
    setHistories((prev) => ({
      ...prev,
      [brainId]: typeof updater === "function" ? updater(prev[brainId]) : updater,
    }))

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef       = useRef<HTMLTextAreaElement>(null)

  // Build live context string for MPR / Anchor brains
  const liveContext = useMemo(() => {
    if (brainId === "mpr")    return buildMPRContext(mprState.lanes, mprState.processes)
    if (brainId === "anchor") return buildAnchorContext(anchorItems)
    return undefined
  }, [brainId, mprState.lanes, mprState.processes, anchorItems])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300)
  }, [isOpen])

  useEffect(() => {
    if (brainId !== lastBrainId) {
      setLastBrainId(brainId)
      setPendingUpdate(null)
    }
  }, [brainId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSend() {
    const text = input.trim()
    if (!text || isLoading) return

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text, timestamp: new Date() }
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setError(null)
    setIsLoading(true)
    setIsAILoading(true)

    try {
      const systemPrompt = brain.getSystemPrompt(profile, liveContext)
      const history = [...messages, userMsg]
      const rawReply = await callClaude(history, systemPrompt)

      // ── Module injection ──────────────────────────────
      const { displayText, update } = parseAIResponse(rawReply)
      if (update) setPendingUpdate(update)

      let finalText = displayText
      if (update && !displayText.trimEnd().endsWith("?")) {
        finalText = displayText.trimEnd() + "\n\n" + buildConfirmationSentence(update)
      }

      // ── Draft tag parsing ─────────────────────────────
      let draftAction: DraftAction | undefined

      if (brainId === "mpr") {
        const draft = parseMPRDraft(rawReply)
        if (draft) {
          addProcess(draft.laneId, draft.title)
          draftAction = { type: "mpr", title: draft.title }
          finalText = stripDraftTags(finalText)
        }
      } else if (brainId === "anchor") {
        const draft = parseAnchorDraft(rawReply)
        if (draft && draft.label) {
          addItem(draft as RhythmItem)
          draftAction = { type: "anchor", title: draft.label! }
          finalText = stripDraftTags(finalText)
        }
      }
      // ─────────────────────────────────────────────────

      const assistantMsg: Message = {
        id:          crypto.randomUUID(),
        role:        "assistant",
        content:     finalText,
        timestamp:   new Date(),
        hadUpdate:   !!update,
        draftAction,
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error"
      setError(msg === "NO_KEY" ? "API key not configured." : `Error: ${msg}`)
    } finally {
      setIsLoading(false)
      setIsAILoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  function clearConversation() {
    setHistories((prev) => ({ ...prev, [brainId]: [] }))
    setError(null)
    setPendingUpdate(null)
  }

  const isEmpty = messages.length === 0

  return (
    <div className="relative flex-none">
      {/* ── Toggle tab ───────────────────────────────────── */}
      <button
        onClick={onToggle}
        className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full z-20",
          "flex flex-col items-center justify-center gap-1",
          "w-8 rounded-l-lg py-4 shadow-md transition-colors",
          "bg-bop-dark-blue text-white hover:brightness-110"
        )}
        title={isOpen ? "Close coach" : "Open AI Coach"}
      >
        {isOpen ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <>
            <Bot className="h-4 w-4" />
            {pendingUpdate && (
              <span className="h-2 w-2 rounded-full bg-amber-400 absolute top-2 right-1.5" />
            )}
            <span
              className="text-[9px] font-bold uppercase tracking-widest"
              style={{ writingMode: "vertical-rl" }}
            >
              Coach
            </span>
          </>
        )}
      </button>

      {/* ── Panel ────────────────────────────────────────── */}
      <div
        className={cn(
          "h-full flex flex-col border-l border-border",
          "bg-[#FAFAF8]",
          "transition-[width] duration-300 ease-in-out overflow-hidden",
          isOpen ? "w-[400px]" : "w-0"
        )}
      >
        {/* Header — always Navy */}
        <div className="flex items-center gap-3 px-4 py-3 shrink-0 bg-bop-dark-blue">
          <Bot className="h-5 w-5 text-white shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white leading-tight">{brain.label}</p>
            <p className="text-[10px] text-white/60 leading-tight">{brain.sublabel}</p>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={clearConversation}
                className="p-1.5 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                title="Clear conversation"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={onToggle}
              className="p-1.5 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              title="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Context pill */}
        <div className="flex items-center gap-2 px-4 py-2 bg-bop-dark-blue/5 border-b border-amber-200/40 shrink-0">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
          <span className="text-[11px] text-muted-foreground truncate">
            {profile.businessName} · {profile.industry || "All industries"}
          </span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          {!hasApiKey ? (
            <NoKeyNotice />
          ) : isEmpty ? (
            <WelcomeScreen
              brain={brain}
              profile={profile}
              onPrompt={(p) => { setInput(p); inputRef.current?.focus() }}
            />
          ) : (
            <>
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              {isLoading && <TypingIndicator />}
              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {error}
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Sync bar */}
        <SyncBar />

        {/* Input */}
        {hasApiKey && (
          <div className="border-t border-amber-200/40 bg-white px-3 py-3 shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Ask your ${brain.label}...`}
                rows={1}
                className={cn(
                  "flex-1 resize-none rounded-xl border border-border bg-[#FAFAF8]",
                  "px-3 py-2.5 text-sm placeholder:text-muted-foreground",
                  "focus:outline-none focus:ring-2 focus:ring-amber-300/50",
                  "max-h-32 overflow-y-auto leading-relaxed"
                )}
                style={{ fieldSizing: "content" } as React.CSSProperties}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors",
                  "bg-bop-dark-blue text-white",
                  "hover:bg-bop-dark-blue/80 disabled:opacity-40 disabled:cursor-not-allowed"
                )}
              >
                {isLoading
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Send className="h-4 w-4" />
                }
              </button>
            </div>
            <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
              Enter to send · Shift+Enter for new line
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

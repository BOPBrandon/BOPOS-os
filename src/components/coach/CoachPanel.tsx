/**
 * CoachPanel — Sliding AI Coaching Panel with Module Injection
 * ============================================================
 * Persistent chat interface available on all three dashboards.
 *
 * Brain switches by route:
 *   /os     → OS Coach  (Layer 1 — The Operating System)
 *   /mpr    → MPR Coach (Layer 2 — Master Process Roadmap)
 *   /anchor → Anchor Coach (Layer 3 — 52-Week Rhythm Engine)
 *
 * Module Injection:
 *   When the AI emits a <MODULE_UPDATE> block, ModuleBridge strips it
 *   from the visible text and stages the payload in ActiveSessionContext.
 *   A "Sync to Dashboard" bar appears above the input — one click
 *   commits the draft to the live profile and runs pullForward.
 * ============================================================
 */
import { useState, useRef, useEffect } from "react"
import { useLocation } from "react-router-dom"
import {
  Bot, Send, X, Trash2, ChevronRight,
  Loader2, AlertCircle, Sparkles, CheckCircle2, Undo2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useProfile } from "@/context/ProfileContext"
import { useActiveSession } from "@/context/ActiveSessionContext"
import { MODULE_REGISTRY } from "@/types/bopos"
import { BRAINS, getBrainFromPath } from "./coach-brains"
import { parseAIResponse, summarizeUpdate, buildConfirmationSentence } from "./ModuleBridge"

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  hadUpdate?: boolean   // true if this message produced a MODULE_UPDATE
}

// ─────────────────────────────────────────────
// API CALL
// ─────────────────────────────────────────────
async function callClaude(
  messages: Message[],
  systemPrompt: string
): Promise<string> {
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
      messages: messages.map((m) => ({
        role: m.role,
        // Send the raw content (with MODULE_UPDATE stripped from display
        // but the AI sees its own prior output in context as-is).
        content: m.content,
      })),
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
// MESSAGE BUBBLE
// ─────────────────────────────────────────────
function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user"
  return (
    <div className={cn("flex w-full flex-col gap-1", isUser ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
          isUser
            ? "bg-bop-grey text-white rounded-tr-sm"
            : "bg-bop-light-blue text-white rounded-tl-sm"
        )}
      >
        {message.content}
      </div>
      {/* Badge when this message triggered a module update */}
      {message.hadUpdate && (
        <div className="flex items-center gap-1 px-1">
          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
          <span className="text-[10px] text-emerald-600 font-medium">Module data captured</span>
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
      <div className="bg-bop-light-blue rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
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
      <AlertCircle className="h-8 w-8 text-bop-dark-orange" />
      <p className="text-sm font-semibold text-foreground">API Key Required</p>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Add your Anthropic API key to enable the AI coach.
        Create a <code className="font-mono bg-muted px-1 rounded">.env.local</code> file
        in the project root:
      </p>
      <code className="text-xs bg-muted px-3 py-2 rounded-md font-mono text-left w-full break-all">
        VITE_ANTHROPIC_API_KEY=sk-ant-...
      </code>
      <p className="text-xs text-muted-foreground">Then restart the dev server.</p>
    </div>
  )
}

// ─────────────────────────────────────────────
// SYNC BAR — appears when AI has staged an update
// ─────────────────────────────────────────────
function SyncBar() {
  const { pendingUpdate, commitUpdate, dismissUpdate, canUndo, undoLastCommit } = useActiveSession()

  // Show undo row even when there's no pending update (after a commit)
  const showUndo    = canUndo && !pendingUpdate
  const showPending = !!pendingUpdate

  if (!showPending && !showUndo) return null

  const meta        = pendingUpdate ? MODULE_REGISTRY[pendingUpdate.moduleSlot] : null
  const moduleLabel = meta?.label ?? pendingUpdate?.moduleSlot ?? ""

  return (
    <div className="border-t-2 border-bop-light-orange/40 bg-bop-light-orange/5 px-4 py-3 shrink-0 flex flex-col gap-2">

      {/* ── Undo bar — only shown when no pending update ── */}
      {showUndo && (
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">Last commit applied.</span>
          <button
            onClick={undoLastCommit}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] font-medium text-foreground hover:bg-muted transition-colors"
          >
            <Undo2 className="h-3 w-3" />
            Undo
          </button>
        </div>
      )}

      {/* ── Pending update ── */}
      {showPending && (
        <>
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-bop-light-orange shrink-0" />
            <span className="text-xs font-bold text-bop-dark-orange flex-1">
              Ready to sync
            </span>
            {/* Inline undo button — shows when previous commits exist */}
            {canUndo && (
              <button
                onClick={undoLastCommit}
                className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Undo last commit"
              >
                <Undo2 className="h-3 w-3" />
                Undo last
              </button>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">{moduleLabel}</span>
            {" · "}
            {summarizeUpdate(pendingUpdate!)}
            {pendingUpdate!.status === "completed" && (
              <span className="ml-1 text-emerald-600 font-medium">· will mark complete</span>
            )}
          </p>

          {/* Field preview */}
          <div className="flex flex-col gap-1 rounded-lg bg-background border border-border p-2 max-h-24 overflow-y-auto">
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
              className={cn(
                "flex-1 rounded-xl py-2 text-xs font-bold text-white transition-colors",
                "bg-bop-light-orange hover:bg-bop-dark-orange"
              )}
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
// MAIN COMPONENT
// ─────────────────────────────────────────────
interface CoachPanelProps {
  isOpen: boolean
  onToggle: () => void
}

export function CoachPanel({ isOpen, onToggle }: CoachPanelProps) {
  const { profile }                    = useProfile()
  const {
    setPendingUpdate,
    pendingUpdate,
    setIsAILoading,
  } = useActiveSession()
  const location                       = useLocation()
  const brainId                        = getBrainFromPath(location.pathname)
  const brain                          = BRAINS[brainId]
  const hasApiKey                      = !!import.meta.env.VITE_ANTHROPIC_API_KEY

  const [messages,    setMessages]    = useState<Message[]>([])
  const [input,       setInput]       = useState("")
  const [isLoading,   setIsLoading]   = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [lastBrainId, setLastBrainId] = useState<string>(brainId)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef       = useRef<HTMLTextAreaElement>(null)

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300)
  }, [isOpen])

  // Brain-switch notification
  useEffect(() => {
    if (brainId !== lastBrainId) {
      if (messages.length > 0) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: `🔄 Switched to ${brain.label} — ${brain.sublabel}. I still have full context of your profile. What would you like to work on?`,
            timestamp: new Date(),
          },
        ])
      }
      setLastBrainId(brainId)
      setPendingUpdate(null)  // clear any staged update from previous brain
    }
  }, [brainId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSend() {
    const text = input.trim()
    if (!text || isLoading) return

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setError(null)
    setIsLoading(true)
    setIsAILoading(true)

    try {
      const systemPrompt = brain.getSystemPrompt(profile)
      // Build history — use display text for prior assistant messages
      const history = [...messages, userMsg]
      const rawReply = await callClaude(history, systemPrompt)

      // ── MODULE INJECTION ──────────────────────────────
      const { displayText, update } = parseAIResponse(rawReply)

      if (update) {
        setPendingUpdate(update)
      }
      // ─────────────────────────────────────────────────

      // Auto-append confirmation sentence if the AI captured data but
      // forgot to end with a question (fallback — the system prompt also
      // instructs the AI to do this natively).
      let finalText = displayText
      if (update && !displayText.trimEnd().endsWith("?")) {
        finalText = displayText.trimEnd() + "\n\n" + buildConfirmationSentence(update)
      }

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: finalText,
        timestamp: new Date(),
        hadUpdate: !!update,
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
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function clearConversation() {
    setMessages([])
    setError(null)
    setPendingUpdate(null)
  }

  const isEmpty = messages.length === 0

  return (
    <div className="relative flex-none">
      {/* ── Toggle tab — always visible ──────────────────── */}
      <button
        onClick={onToggle}
        className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full z-20",
          "flex flex-col items-center justify-center gap-1",
          "w-8 rounded-l-lg py-4 shadow-md transition-colors",
          brain.headerBg,
          "text-white hover:brightness-110"
        )}
        title={isOpen ? "Close coach" : "Open AI Coach"}
      >
        {isOpen ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <>
            <Bot className="h-4 w-4" />
            {/* Pending update dot */}
            {pendingUpdate && (
              <span className="h-2 w-2 rounded-full bg-bop-light-orange absolute top-2 right-1.5" />
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
          "h-full flex flex-col border-l border-border bg-background",
          "transition-[width] duration-300 ease-in-out overflow-hidden",
          isOpen ? "w-96" : "w-0"
        )}
      >
        {/* Header */}
        <div className={cn("flex items-center gap-3 px-4 py-3 shrink-0", brain.headerBg)}>
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

        {/* Profile context pill */}
        <div className="flex items-center gap-2 px-4 py-2 bg-muted/40 border-b border-border shrink-0">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
          <span className="text-[11px] text-muted-foreground truncate">
            {profile.businessName} · {Object.values(profile.modules).filter(m => m?.status === "completed").length} modules complete
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

        {/* ── Sync to Dashboard bar ─────────────────────── */}
        <SyncBar />

        {/* ── Input ────────────────────────────────────── */}
        {hasApiKey && (
          <div className="border-t border-border px-3 py-3 shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Ask your ${brain.label}...`}
                rows={1}
                className={cn(
                  "flex-1 resize-none rounded-xl border border-border bg-background",
                  "px-3 py-2.5 text-sm placeholder:text-muted-foreground",
                  "focus:outline-none focus:ring-2 focus:ring-bop-light-blue/40",
                  "max-h-32 overflow-y-auto leading-relaxed"
                )}
                style={{ fieldSizing: "content" } as React.CSSProperties}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors",
                  "bg-bop-light-blue text-white",
                  "hover:bg-bop-dark-blue disabled:opacity-40 disabled:cursor-not-allowed"
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

// ─────────────────────────────────────────────
// WELCOME SCREEN
// Shown when there are no messages yet
// ─────────────────────────────────────────────
const STARTER_PROMPTS: Record<string, string[]> = {
  os: [
    "What should I build next based on my profile?",
    "Walk me through the Vision Story module.",
    "What is Real Revenue and why does it matter?",
    "Help me set up my bank account allocations.",
  ],
  mpr: [
    "Let's brain-dump my Marketing processes.",
    "How do I structure my Operations as a phased MPR?",
    "What processes should I document first?",
    "How does the MPR connect to Team Meetings?",
  ],
  anchor: [
    "What rhythms am I missing in my Anchor?",
    "Walk me through the Non-Negotiable Vision Story Review rule.",
    "How do I set up my Weekly tier correctly?",
    "What does a healthy Quarterly rhythm look like?",
  ],
}

function WelcomeScreen({
  brain,
  profile,
  onPrompt,
}: {
  brain: (typeof BRAINS)[keyof typeof BRAINS]
  profile: { businessName: string }
  onPrompt: (p: string) => void
}) {
  const prompts = STARTER_PROMPTS[brain.id] ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl bg-muted/50 px-4 py-4">
        <p className="text-sm font-semibold text-foreground">
          Hi, I&apos;m your {brain.label} 👋
        </p>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
          I have full context on <strong>{profile.businessName}</strong> — every module,
          every financial number, every decision already made. When we work through a
          module together, I&apos;ll capture the data automatically and surface a{" "}
          <span className="font-semibold text-bop-dark-orange">Sync to Dashboard</span>{" "}
          button so you can push it live in one click.
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
              "text-xs text-foreground hover:border-bop-light-blue/50 hover:bg-bop-light-blue/5",
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

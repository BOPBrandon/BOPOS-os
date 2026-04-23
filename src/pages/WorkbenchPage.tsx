/**
 * WorkbenchPage — Gold Standard split-pane layout
 *
 *   ┌──────────────────────────────────────────────────────────┐
 *   │  Navy header · Module 00 · The Workbench          [ × ]  │
 *   ├──────────────────────────┬───────────────────────────────┤
 *   │                          │                               │
 *   │    NAVY "COACH"          │     WHITE "CANVAS"            │
 *   │    AI Architect chat     │     Live tool preview         │
 *   │    (40%)                 │     (60%)                     │
 *   │                          │                               │
 *   └──────────────────────────┴───────────────────────────────┘
 *
 * • Chat: Claude Sonnet 4.5 + BOPOS_Workbench_Brain system prompt.
 * • Canvas: react-live preview with useBOPStore + SyncIndicator
 *   injected as globals, exactly as the Brain spec promises.
 * • Deploy: inserts the tool into public.bop_custom_tools scoped to
 *   auth.uid() (RLS private vault).
 * • Draft chat + code persist to per-user localStorage so progress
 *   survives reloads.
 */
import * as React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import * as Icons from "lucide-react"
import {
  X, Send, Bot, Loader2, AlertCircle, Hammer, Upload, CheckCircle2,
  Sparkles, Trash2, Eye, Code2,
} from "lucide-react"
import { LiveProvider, LivePreview, LiveError } from "react-live"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import WORKBENCH_BRAIN from "@/instructions/BOPOS_Workbench_Brain.md?raw"
import { useBOPStore, SyncIndicator } from "@/components/workbench/BOPStore"

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface Message {
  id:          string
  role:        "user" | "assistant"
  content:     string   // raw — sent back to Claude
  displayText: string   // stripped — shown in the UI
  hadCode?:    boolean
}

type TargetLocation = "os" | "mpr" | "anchor"

interface DraftTool {
  code:     string
  name:     string
  slug:     string
  target:   TargetLocation
  schema:   unknown
}

// ─────────────────────────────────────────────
// TAG PARSERS
// ─────────────────────────────────────────────

const CODE_RE     = /<WORKBENCH_CODE>([\s\S]*?)<\/WORKBENCH_CODE>/g
const SCHEMA_RE   = /<BOP_SCHEMA>([\s\S]*?)<\/BOP_SCHEMA>/g
const META_NAME   = /\/\/\s*name:\s*([^\n]+)/i
const META_DASH   = /\/\/\s*dashboard:\s*(os|mpr|anchor)/i

function parseArchitectReply(raw: string): {
  displayText: string
  draft: DraftTool | null
} {
  const codeMatch = [...raw.matchAll(CODE_RE)].pop()
  if (!codeMatch) {
    return { displayText: raw.trim(), draft: null }
  }

  const code   = codeMatch[1].trim()
  const nameM  = code.match(META_NAME)
  const dashM  = code.match(META_DASH)
  const name   = nameM?.[1].trim() || "Untitled Tool"
  const target = (dashM?.[1] ?? "os") as TargetLocation
  const slug   = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "untitled"

  let schema: unknown = null
  const schemaMatch = [...raw.matchAll(SCHEMA_RE)].pop()
  if (schemaMatch) {
    try { schema = JSON.parse(schemaMatch[1].trim()) } catch { /* ignore */ }
  }

  const displayText = raw
    .replace(CODE_RE, "")
    .replace(SCHEMA_RE, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim() || "Tool updated on the canvas."

  return {
    displayText,
    draft: { code, name, slug, target, schema },
  }
}

// ─────────────────────────────────────────────
// CLAUDE API
// ─────────────────────────────────────────────

async function callArchitect(messages: Message[], systemPrompt: string): Promise<string> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey) throw new Error("NO_KEY")

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type":                             "application/json",
      "x-api-key":                                 apiKey,
      "anthropic-version":                         "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model:      "claude-sonnet-4-5",
      max_tokens: 4096,
      system:     systemPrompt,
      messages:   messages.map((m) => ({ role: m.role, content: m.content })),
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
// SANDBOX SCOPE
// Everything the Workbench Brain promises is in-scope.
// No `import` statements needed in generated code.
// ─────────────────────────────────────────────

function buildSandboxScope() {
  return {
    // React
    React,
    useState:    React.useState,
    useEffect:   React.useEffect,
    useCallback: React.useCallback,
    useRef:      React.useRef,
    useMemo:     React.useMemo,
    useReducer:  React.useReducer,

    // BOP utilities
    useBOPStore,
    SyncIndicator,

    // All lucide icons, as named globals
    ...Icons,
  }
}

// ─────────────────────────────────────────────
// DEFAULT PREVIEW (before any tool is generated)
// ─────────────────────────────────────────────

const EMPTY_PREVIEW = `
function App() {
  return (
    <div className="flex h-full w-full bg-white" />
  )
}
render(<App />)
`.trim()

// ─────────────────────────────────────────────
// GREETING
// ─────────────────────────────────────────────

const GREETING: Message = {
  id:          "architect-greeting",
  role:        "assistant",
  displayText: "Architect ready. Describe the tool you want to build.",
  content:     "Architect ready. Describe the tool you want to build.",
}

// ─────────────────────────────────────────────
// CHAT BUBBLE
// ─────────────────────────────────────────────

function ChatBubble({ message }: { message: Message }) {
  const isUser = message.role === "user"
  return (
    <div className={cn("flex w-full flex-col gap-1", isUser ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
          isUser
            ? "bg-bop-grey text-white rounded-tr-sm"
            : "bg-bop-dark-blue text-white rounded-tl-sm"
        )}
      >
        {message.displayText}
      </div>
      {message.hadCode && (
        <div className="flex items-center gap-1 px-1">
          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
          <span className="text-[10px] text-emerald-600 font-medium">Rendered on canvas</span>
        </div>
      )}
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-bop-dark-blue rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
        {["-0.3s", "-0.15s", "0s"].map((d, i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-white/70 animate-bounce"
            style={{ animationDelay: d }}
          />
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// CANVAS — live preview wrapper
// ─────────────────────────────────────────────

function Canvas({ code }: { code: string }) {
  const scope = useMemo(() => buildSandboxScope(), [])

  // react-live noInline expects an explicit render() call. Tools from
  // the Architect define `function App()` — we append the render call
  // ourselves so the Brain contract stays simple.
  const liveCode = code.includes("render(")
    ? code
    : `${code}\nrender(<App />)`

  return (
    <div className="flex h-full w-full flex-col bg-white">
      <LiveProvider code={liveCode} scope={scope} noInline>
        <div className="flex-1 overflow-auto bg-white">
          <LivePreview />
        </div>
        <LiveError className="shrink-0 border-t border-red-200 bg-red-50 px-4 py-2 text-[11px] font-mono text-red-700 whitespace-pre-wrap max-h-40 overflow-auto" />
      </LiveProvider>
    </div>
  )
}

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────

const STORAGE_KEY = "bopos_workbench_session"

interface PersistedSession {
  userId:   string
  messages: Message[]
  draft:    DraftTool | null
}

function loadSession(userId: string | null): PersistedSession | null {
  if (!userId) return null
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}:${userId}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PersistedSession
    return parsed.userId === userId ? parsed : null
  } catch { return null }
}

function saveSession(s: PersistedSession) {
  try {
    localStorage.setItem(`${STORAGE_KEY}:${s.userId}`, JSON.stringify(s))
  } catch { /* quota — ignore */ }
}

export function WorkbenchPage() {
  const navigate = useNavigate()

  const [userId,    setUserId]    = useState<string | null>(null)
  const [messages,  setMessages]  = useState<Message[]>([GREETING])
  const [draft,     setDraft]     = useState<DraftTool | null>(null)
  const [input,     setInput]     = useState("")
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [deploying, setDeploying] = useState(false)
  const [deployed,  setDeployed]  = useState<string | null>(null)
  const [view,      setView]      = useState<"preview" | "code">("preview")

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef       = useRef<HTMLTextAreaElement>(null)

  const hasApiKey = !!import.meta.env.VITE_ANTHROPIC_API_KEY

  // ── Load user + prior session on mount ──────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id ?? null
      setUserId(uid)
      const prior = loadSession(uid)
      if (prior) {
        setMessages(prior.messages)
        setDraft(prior.draft)
      }
    })
  }, [])

  // ── Persist session on change ───────────────────────────────
  useEffect(() => {
    if (!userId) return
    saveSession({ userId, messages, draft })
  }, [userId, messages, draft])

  // ── Auto-scroll ─────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  // ── Focus input when ready ──────────────────────────────────
  useEffect(() => {
    if (hasApiKey) setTimeout(() => inputRef.current?.focus(), 120)
  }, [hasApiKey])

  const systemPrompt = useMemo(() => WORKBENCH_BRAIN, [])

  const sendMessage = useCallback(async (text: string) => {
    const userMsg: Message = {
      id:          crypto.randomUUID(),
      role:        "user",
      content:     text,
      displayText: text,
    }
    const history = [...messages, userMsg]
    setMessages(history)
    setInput("")
    setError(null)
    setDeployed(null)
    setLoading(true)

    try {
      const raw = await callArchitect(history, systemPrompt)
      const { displayText, draft: nextDraft } = parseArchitectReply(raw)

      const assistantMsg: Message = {
        id:          crypto.randomUUID(),
        role:        "assistant",
        content:     raw,
        displayText,
        hadCode:     !!nextDraft,
      }
      setMessages((prev) => [...prev, assistantMsg])
      if (nextDraft) setDraft(nextDraft)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error"
      setError(msg === "NO_KEY" ? "Anthropic API key missing — add VITE_ANTHROPIC_API_KEY to .env.local and restart." : `Architect error: ${msg}`)
    } finally {
      setLoading(false)
    }
  }, [messages, systemPrompt])

  function handleSend() {
    const text = input.trim()
    if (!text || loading) return
    sendMessage(text)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  async function handleDeploy() {
    if (!draft || deploying) return
    setDeploying(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError("You must be signed in to deploy tools.")
      setDeploying(false)
      return
    }

    const { error: insertErr } = await supabase.from("bop_custom_tools").insert({
      user_id:         user.id,          // private vault — RLS enforced
      tool_name:       draft.name,
      code_content:    draft.code,
      target_location: draft.target,
    })

    setDeploying(false)
    if (insertErr) { setError(`Deploy failed: ${insertErr.message}`); return }

    setDeployed(`${draft.name} → ${draft.target.toUpperCase()}`)
    window.dispatchEvent(new Event("bop-deploy"))
  }

  function handleClearSession() {
    if (!confirm("Clear chat and canvas? Deployed tools are unaffected.")) return
    setMessages([GREETING])
    setDraft(null)
    setDeployed(null)
    setError(null)
    if (userId) localStorage.removeItem(`${STORAGE_KEY}:${userId}`)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background overflow-hidden">

      {/* ── HEADER ────────────────────────────────────────── */}
      <header className="flex shrink-0 items-center justify-between bg-bop-dark-blue px-6 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10">
            <Hammer className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Module 00 · Builder</p>
            <p className="text-sm font-semibold text-white leading-tight">The Workbench</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!hasApiKey && (
            <Badge variant="destructive" className="text-[10px]">No API Key</Badge>
          )}
          {draft && (
            <>
              <div className="hidden items-center gap-1 rounded-full bg-white/10 p-0.5 sm:flex">
                <button
                  onClick={() => setView("preview")}
                  className={cn(
                    "flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                    view === "preview" ? "bg-white text-bop-dark-blue" : "text-white/60 hover:text-white"
                  )}
                >
                  <Eye className="h-3 w-3" /> Preview
                </button>
                <button
                  onClick={() => setView("code")}
                  className={cn(
                    "flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                    view === "code" ? "bg-white text-bop-dark-blue" : "text-white/60 hover:text-white"
                  )}
                >
                  <Code2 className="h-3 w-3" /> Code
                </button>
              </div>
              <Button
                size="sm"
                onClick={handleDeploy}
                disabled={deploying}
                className="gap-1.5 bg-bop-light-orange hover:bg-bop-dark-orange text-white"
              >
                {deploying
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Deploying…</>
                  : <><Upload className="h-3.5 w-3.5" /> Deploy to {draft.target.toUpperCase()}</>
                }
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleClearSession}
            className="gap-1 text-white/60 hover:bg-white/10 hover:text-white"
            title="Clear session"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate("/home")}
            className="gap-1 text-white hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
            <span className="text-xs">Close</span>
          </Button>
        </div>
      </header>

      {/* ── MAIN ──────────────────────────────────────────── */}
      <div className="relative flex flex-1 overflow-hidden">

        {/* ── LEFT: COACH (BOP Navy) ───────────────────── */}
        <div className="flex w-[40%] shrink-0 flex-col border-r border-white/10 overflow-hidden" style={{ background: "#002855" }}>
          <div className="flex shrink-0 items-center gap-2 border-b border-white/10 px-5 py-3" style={{ background: "#001933" }}>
            <Bot className="h-4 w-4 text-bop-light-orange" />
            <span className="text-sm font-semibold text-white">Architect</span>
            <span className="ml-auto text-[10px] text-white/40">BOP AI Builder</span>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
            {!hasApiKey ? (
              <div className="flex flex-col items-center gap-3 px-6 py-10 text-center text-white">
                <AlertCircle className="h-8 w-8 text-bop-light-orange" />
                <p className="text-sm font-semibold">API Key Required</p>
                <p className="text-xs text-white/60 leading-relaxed">
                  Add your Anthropic API key to enable the AI Architect.
                  Create a <code className="font-mono bg-white/10 px-1 rounded">.env.local</code> file with:
                </p>
                <code className="text-xs bg-white/10 px-3 py-2 rounded-md font-mono w-full break-all text-left text-white/90">
                  VITE_ANTHROPIC_API_KEY=sk-ant-...
                </code>
                <p className="text-[11px] text-white/40">Then restart the dev server.</p>
              </div>
            ) : (
              <>
                {messages.map((m) => <ChatBubble key={m.id} message={m} />)}
                {loading && <TypingIndicator />}
                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-500/20 px-3 py-2 text-xs text-red-200">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {error}
                  </div>
                )}
                {deployed && (
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-500/20 px-3 py-2 text-xs text-emerald-200">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    Deployed to your private vault: {deployed}
                  </div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          {hasApiKey && (
            <div className="border-t border-white/10 px-3 py-3 shrink-0" style={{ background: "#001933" }}>
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe the tool you want to build…"
                  rows={1}
                  className={cn(
                    "flex-1 resize-none rounded-xl border border-white/10 bg-white/5",
                    "px-3 py-2.5 text-sm text-white placeholder:text-white/30",
                    "focus:outline-none focus:ring-2 focus:ring-bop-light-orange/40",
                    "max-h-32 overflow-y-auto leading-relaxed"
                  )}
                  style={{ fieldSizing: "content" } as React.CSSProperties}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors",
                    "bg-bop-light-orange text-white",
                    "hover:bg-bop-dark-orange disabled:opacity-40 disabled:cursor-not-allowed"
                  )}
                >
                  {loading
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Send className="h-4 w-4" />
                  }
                </button>
              </div>
              <p className="mt-1.5 text-center text-[10px] text-white/40">
                Enter to send · Shift+Enter for a new line
              </p>
            </div>
          )}
        </div>

        {/* ── RIGHT: CANVAS (white) ─────────────────────── */}
        <div className="flex flex-1 flex-col overflow-hidden bg-gray-50">
          <div className="flex shrink-0 items-center gap-2 border-b border-border bg-white px-5 py-3">
            <Sparkles className="h-4 w-4 text-bop-dark-blue" />
            <span className="text-sm font-semibold">Canvas</span>
            {draft && (
              <>
                <span className="text-muted-foreground/30">·</span>
                <span className="text-xs text-muted-foreground truncate">{draft.name}</span>
                <Badge variant="secondary" className="ml-1 text-[10px] uppercase tracking-wide">
                  {draft.target}
                </Badge>
              </>
            )}
            <span className="ml-auto text-[10px] text-muted-foreground">
              Live preview
            </span>
          </div>

          <div className="flex-1 overflow-hidden">
            {view === "code" && draft ? (
              <pre className="h-full w-full overflow-auto bg-slate-950 p-6 text-[11px] leading-relaxed font-mono text-slate-200 whitespace-pre">
                {draft.code}
              </pre>
            ) : (
              <Canvas code={draft?.code ?? EMPTY_PREVIEW} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default WorkbenchPage

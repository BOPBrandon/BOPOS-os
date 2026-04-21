/**
 * WorkbenchPage — The BOPOS Code Studio
 * 3-pane layout: Version History | The Architect (AI chat) | Live Canvas
 */
import { useState, useRef, useEffect, useCallback } from "react"
import { Link } from "react-router-dom"
import {
  Hammer, Clock, Send, Loader2, AlertCircle,
  Code2, Eye, Rocket, Save, CheckCircle2, X,
  Terminal, ChevronLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useProfile } from "@/context/ProfileContext"

// ─────────────────────────────────────────────
// STORAGE KEYS
// ─────────────────────────────────────────────
const VERSIONS_KEY  = "bopos_workbench_versions"
const DEPLOYED_KEY  = "bopos_workbench_deployed"

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
interface WorkbenchVersion {
  id:            string
  versionNumber: number
  label:         string
  code:          string
  createdAt:     string
}

interface ChatMessage {
  id:             string
  role:           "user" | "assistant"
  content:        string
  displayContent: string
  timestamp:      string
  hasCode:        boolean
}

interface DeployState {
  open:      boolean
  step:      "form" | "loading" | "success"
  name:      string
  dashboard: "os" | "mpr" | "anchor"
}

// ─────────────────────────────────────────────
// BRAIN — inlined system prompt
// ─────────────────────────────────────────────
const WORKBENCH_BRAIN = `You are the BOPOS Workbench Architect — a specialized code generation AI embedded in the Business On Purpose Operating System. Your purpose is to build production-quality React components that integrate seamlessly with the BOP platform.

## Your Role
You design and build custom tools, dashboards, calculators, trackers, and interactive components for business owners. Every tool must be functional, beautiful, and immediately deployable.

## Technical Protocol

### Code Output
- Use React + Tailwind CSS exclusively (available globally via CDN)
- Every tool must be standalone and self-contained — no import/export syntax, no external dependencies
- Define your component as: function App() { ... }
- The preview engine calls React.createElement(App) automatically — do NOT include that call in your code
- All state via useState and useReducer only
- Wrap ALL code in <WORKBENCH_CODE> and </WORKBENCH_CODE> tags

### Metadata Block (required at top of every tool)
// TOOL METADATA
// name: [Tool Name]
// dashboard: [os | mpr | anchor]
// description: [One sentence describing what this tool does]

### UI Standard
- Primary: BOP Navy #002855 — use bg-[#002855], text-[#002855]
- Accent: BOP Orange — use orange-600 or text-orange-600
- Buttons: rounded-md (never pill-shaped)
- Cards: bg-white border border-gray-200 shadow-sm
- Page background: bg-gray-50

### Integration
dashboard field meaning:
- os — People, Process, Product, Profit (executive view)
- mpr — Process docs, workflow tools, SOPs
- anchor — Rhythm tracking, scheduling, cadence

## Response Format
1. One sentence describing what you're building
2. Full component wrapped in <WORKBENCH_CODE> tags
3. 2-3 suggested next iterations after the code block

For refinements: acknowledge the change (1 sentence), then output the FULL updated component.

## Tone
Confident, decisive, builder-mindset. Brief description then straight to code.`

function getSystemPrompt(firstName: string, businessName: string): string {
  return `${WORKBENCH_BRAIN}

## Current Session
- Owner: ${firstName}
- Business: ${businessName}`
}

// ─────────────────────────────────────────────
// CODE UTILITIES
// ─────────────────────────────────────────────
function extractCode(text: string): string | null {
  const match = /<WORKBENCH_CODE>([\s\S]*?)<\/WORKBENCH_CODE>/.exec(text)
  return match ? match[1].trim() : null
}

function stripCodeTags(text: string): string {
  return text.replace(/<WORKBENCH_CODE>[\s\S]*?<\/WORKBENCH_CODE>/g, "").replace(/\n{3,}/g, "\n\n").trim()
}

// ─────────────────────────────────────────────
// PREVIEW HTML BUILDER
// ─────────────────────────────────────────────
function buildPreviewHTML(code: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<script src="https://unpkg.com/react@18/umd/react.development.js"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<script src="https://cdn.tailwindcss.com"></script>
<style>
  body { margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; }
  * { box-sizing: border-box; }
</style>
</head>
<body>
<div id="root"></div>
<script type="text/babel">
${code}
</script>
<script type="text/babel">
const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);
root.render(React.createElement(App));
</script>
</body>
</html>`
}

// ─────────────────────────────────────────────
// STORAGE HELPERS
// ─────────────────────────────────────────────
function loadVersions(): WorkbenchVersion[] {
  try {
    const s = localStorage.getItem(VERSIONS_KEY)
    return s ? JSON.parse(s) : []
  } catch { return [] }
}

function persistVersions(versions: WorkbenchVersion[]) {
  localStorage.setItem(VERSIONS_KEY, JSON.stringify(versions))
}

// ─────────────────────────────────────────────
// API CALL
// ─────────────────────────────────────────────
async function callWorkbenchClaude(messages: ChatMessage[], systemPrompt: string): Promise<string> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey) throw new Error("NO_KEY")

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type":                          "application/json",
      "x-api-key":                             apiKey,
      "anthropic-version":                     "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model:      "claude-sonnet-4-6",
      max_tokens: 4000,
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
// VERSION HISTORY PANEL
// ─────────────────────────────────────────────
function VersionPanel({
  versions,
  activeVersionId,
  onSelect,
}: {
  versions:        WorkbenchVersion[]
  activeVersionId: string | null
  onSelect:        (v: WorkbenchVersion) => void
}) {
  const sorted = [...versions].sort((a, b) => b.versionNumber - a.versionNumber)

  return (
    <div className="w-52 flex flex-col h-full bg-[#001022] border-r border-white/10 shrink-0">
      {/* Back link */}
      <div className="px-3 pt-3 pb-2 shrink-0">
        <Link
          to="/home"
          className="flex items-center gap-1.5 text-[10px] text-white/30 hover:text-white/60 transition-colors"
        >
          <ChevronLeft className="h-3 w-3" />
          Back to OS
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-y border-white/10 shrink-0">
        <Clock className="h-3 w-3 text-white/30 shrink-0" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-white/30">
          Version History
        </span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto py-2">
        {sorted.length === 0 ? (
          <p className="px-4 pt-4 text-[11px] text-white/20 leading-relaxed text-center">
            No versions yet.{"\n"}Build your first tool to save v1.
          </p>
        ) : (
          sorted.map((v) => (
            <button
              key={v.id}
              onClick={() => onSelect(v)}
              className={cn(
                "w-full text-left px-3 py-2.5 transition-colors border-l-2",
                activeVersionId === v.id
                  ? "bg-[#002855]/60 border-orange-500"
                  : "border-transparent hover:bg-white/5"
              )}
            >
              <span className={cn(
                "text-xs font-bold font-mono",
                activeVersionId === v.id ? "text-orange-400" : "text-white/50"
              )}>
                v{v.versionNumber}
              </span>
              <p className={cn(
                "text-[11px] mt-0.5 leading-tight line-clamp-2",
                activeVersionId === v.id ? "text-white/80" : "text-white/35"
              )}>
                {v.label}
              </p>
              <p className="text-[10px] text-white/20 mt-1">
                {new Date(v.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// TYPING INDICATOR
// ─────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3 bg-[#001a3a] rounded-2xl rounded-tl-sm w-fit">
      <span className="h-1.5 w-1.5 rounded-full bg-white/50 animate-bounce [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 rounded-full bg-white/50 animate-bounce [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 rounded-full bg-white/50 animate-bounce" />
    </div>
  )
}

// ─────────────────────────────────────────────
// DEPLOY WIZARD
// ─────────────────────────────────────────────
function DeployWizard({
  state,
  onUpdate,
  onClose,
  onDeploy,
}: {
  state:    DeployState
  onUpdate: (partial: Partial<DeployState>) => void
  onClose:  () => void
  onDeploy: () => void
}) {
  if (!state.open) return null

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-[420px] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-[#002855]">
          <div className="flex items-center gap-2">
            <Rocket className="h-4 w-4 text-white" />
            <span className="text-sm font-bold text-white">Deploy to OS</span>
          </div>
          {state.step === "form" && (
            <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="px-6 py-6">
          {state.step === "form" && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Tool Name
                </label>
                <input
                  autoFocus
                  type="text"
                  value={state.name}
                  onChange={(e) => onUpdate({ name: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Enter" && state.name.trim()) onDeploy() }}
                  placeholder="e.g. Profit Margin Calculator"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#002855]/20 focus:border-[#002855]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Deploy To
                </label>
                <div className="flex flex-col gap-2">
                  {(["os", "mpr", "anchor"] as const).map((dash) => (
                    <button
                      key={dash}
                      onClick={() => onUpdate({ dashboard: dash })}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors",
                        state.dashboard === dash
                          ? "border-[#002855] bg-[#002855]/5"
                          : "border-gray-200 hover:border-gray-300"
                      )}
                    >
                      <div className={cn(
                        "h-2 w-2 rounded-full shrink-0",
                        state.dashboard === dash ? "bg-[#002855]" : "bg-gray-300"
                      )} />
                      <div>
                        <p className="text-sm font-semibold text-gray-800">
                          {dash === "os" ? "The OS" : dash === "mpr" ? "The MPR" : "The Anchor"}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {dash === "os"
                            ? "People, Process, Product, Profit"
                            : dash === "mpr"
                            ? "Master Process Roadmap"
                            : "52-Week Rhythm Engine"}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={onDeploy}
                disabled={!state.name.trim()}
                className="w-full rounded-md py-3 text-sm font-bold text-white bg-[#002855] hover:bg-[#002855]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Deploy Tool
              </button>
            </div>
          )}

          {state.step === "loading" && (
            <div className="flex flex-col items-center gap-4 py-10">
              <Loader2 className="h-8 w-8 text-[#002855] animate-spin" />
              <p className="text-sm font-semibold text-gray-700">Deploying your tool...</p>
            </div>
          )}

          {state.step === "success" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              <p className="text-sm font-bold text-gray-800">{state.name} deployed!</p>
              <p className="text-xs text-gray-400 text-center leading-relaxed">
                Your tool has been saved and is ready to use in the OS.
              </p>
              <button
                onClick={onClose}
                className="mt-2 rounded-md bg-[#002855] px-8 py-2.5 text-sm font-bold text-white hover:bg-[#002855]/90 transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// STARTER PROMPTS
// ─────────────────────────────────────────────
const STARTER_PROMPTS = [
  "Generate a Profit Margin Calculator",
  "Draft a Weekly KPI Scorecard",
  "Build a 12-Week Goal Tracker",
  "Create a Profit First Allocation Tool",
]

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────
export function WorkbenchPage() {
  const { profile } = useProfile()
  const firstName    = profile.ownerFirstName || profile.ownerName?.split(" ")[0] || "Builder"
  const businessName = profile.businessName   || "your business"

  const [versions,        setVersions]        = useState<WorkbenchVersion[]>(loadVersions)
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null)
  const [currentCode,     setCurrentCode]     = useState("")
  const [canvasTab,       setCanvasTab]        = useState<"preview" | "code">("preview")
  const [messages,        setMessages]         = useState<ChatMessage[]>([])
  const [input,           setInput]            = useState("")
  const [isLoading,       setIsLoading]        = useState(false)
  const [error,           setError]            = useState<string | null>(null)
  const [previewUrl,      setPreviewUrl]        = useState<string | null>(null)
  const [deploy,          setDeploy]           = useState<DeployState>({
    open: false, step: "form", name: "", dashboard: "os",
  })

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef       = useRef<HTMLTextAreaElement>(null)
  const prevBlobRef    = useRef<string | null>(null)

  const hasApiKey = !!import.meta.env.VITE_ANTHROPIC_API_KEY

  // Rebuild blob URL whenever code changes
  useEffect(() => {
    if (prevBlobRef.current) URL.revokeObjectURL(prevBlobRef.current)
    if (!currentCode) { setPreviewUrl(null); return }
    const blob = new Blob([buildPreviewHTML(currentCode)], { type: "text/html" })
    const url  = URL.createObjectURL(blob)
    prevBlobRef.current = url
    setPreviewUrl(url)
  }, [currentCode])

  // Cleanup on unmount
  useEffect(() => () => {
    if (prevBlobRef.current) URL.revokeObjectURL(prevBlobRef.current)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  const saveNewVersion = useCallback((code: string, label: string) => {
    const id = crypto.randomUUID()
    setVersions((prev) => {
      const next: WorkbenchVersion = {
        id,
        versionNumber: prev.length + 1,
        label:         label.slice(0, 60),
        code,
        createdAt:     new Date().toISOString(),
      }
      const updated = [...prev, next]
      persistVersions(updated)
      return updated
    })
    setActiveVersionId(id)
  }, [])

  async function handleSend() {
    const text = input.trim()
    if (!text || isLoading) return

    const userMsg: ChatMessage = {
      id:             crypto.randomUUID(),
      role:           "user",
      content:        text,
      displayContent: text,
      timestamp:      new Date().toISOString(),
      hasCode:        false,
    }
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setError(null)
    setIsLoading(true)

    try {
      const systemPrompt = getSystemPrompt(firstName, businessName)
      const rawReply     = await callWorkbenchClaude([...messages, userMsg], systemPrompt)
      const code         = extractCode(rawReply)
      const display      = code ? stripCodeTags(rawReply) : rawReply

      const assistantMsg: ChatMessage = {
        id:             crypto.randomUUID(),
        role:           "assistant",
        content:        rawReply,
        displayContent: display,
        timestamp:      new Date().toISOString(),
        hasCode:        !!code,
      }
      setMessages((prev) => [...prev, assistantMsg])

      if (code) {
        setCurrentCode(code)
        const label = display.split("\n")[0].replace(/^#+\s*/, "").trim() || "Iteration"
        saveNewVersion(code, label)
        setCanvasTab("preview")
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error"
      setError(msg === "NO_KEY" ? "API key not configured." : `Error: ${msg}`)
    } finally {
      setIsLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  function handleVersionSelect(v: WorkbenchVersion) {
    setActiveVersionId(v.id)
    setCurrentCode(v.code)
    setCanvasTab("preview")
  }

  function handleManualSave() {
    if (!currentCode) return
    saveNewVersion(currentCode, "Manual save")
  }

  function handleDeploySubmit() {
    setDeploy((d) => ({ ...d, step: "loading" }))
    const existing = JSON.parse(localStorage.getItem(DEPLOYED_KEY) ?? "[]")
    existing.push({
      id:         crypto.randomUUID(),
      name:       deploy.name,
      dashboard:  deploy.dashboard,
      code:       currentCode,
      deployedAt: new Date().toISOString(),
    })
    localStorage.setItem(DEPLOYED_KEY, JSON.stringify(existing))
    setTimeout(() => setDeploy((d) => ({ ...d, step: "success" })), 1500)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#001022]">

      {/* ── Pane 1: Version History ─────────────────── */}
      <VersionPanel
        versions={versions}
        activeVersionId={activeVersionId}
        onSelect={handleVersionSelect}
      />

      {/* ── Pane 2: The Architect ───────────────────── */}
      <div className="w-[360px] flex flex-col h-full bg-[#011428] border-r border-white/10 shrink-0">

        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 bg-[#001022] border-b border-white/10 shrink-0">
          <Terminal className="h-3.5 w-3.5 text-green-400 shrink-0" />
          <span className="text-[11px] font-mono text-green-400 tracking-wide">
            System: BOPOS Workbench Brain
          </span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          {messages.length === 0 && (
            <div className="flex flex-col gap-4 pt-2">
              <div className="rounded-xl bg-[#002855]/50 border border-blue-900/40 px-4 py-4">
                <p className="text-xs font-semibold text-white/70">Architect online.</p>
                <p className="mt-1 text-[11px] text-white/40 leading-relaxed">
                  Describe a tool and I'll generate a live React component. Every iteration auto-saves as a version.
                </p>
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/20 px-1">
                Quick starts
              </p>
              {STARTER_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => { setInput(p); inputRef.current?.focus() }}
                  className="text-left rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-[11px] text-white/50 hover:bg-white/10 hover:text-white/70 transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {messages.map((msg) => {
            const isUser = msg.role === "user"
            return (
              <div key={msg.id} className={cn("flex flex-col gap-1.5", isUser ? "items-end" : "items-start")}>
                <div className={cn(
                  "max-w-[90%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed whitespace-pre-wrap",
                  isUser
                    ? "bg-[#002855] text-white rounded-tr-sm"
                    : "bg-[#001a3a] text-white/75 rounded-tl-sm"
                )}>
                  {msg.displayContent}
                </div>
                {msg.hasCode && (
                  <div className="flex items-center gap-1 px-1">
                    <div className="flex items-center gap-1.5 rounded-full bg-emerald-950/80 border border-emerald-800/50 px-2.5 py-1">
                      <Code2 className="h-2.5 w-2.5 text-emerald-400" />
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-emerald-400">
                        Code extracted · Version saved
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {isLoading && (
            <div className="flex justify-start">
              <TypingDots />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-950/50 border border-red-800/40 px-3 py-2 text-[11px] text-red-400">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        {hasApiKey ? (
          <div className="border-t border-white/10 bg-[#001022] px-3 py-3 shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe the process or tool you'd like to build..."
                rows={1}
                className={cn(
                  "flex-1 resize-none rounded-xl border border-white/10 bg-[#011428]",
                  "px-3 py-2.5 text-xs text-white/80 placeholder:text-white/25",
                  "focus:outline-none focus:ring-1 focus:ring-blue-800/60",
                  "max-h-28 overflow-y-auto leading-relaxed"
                )}
                style={{ fieldSizing: "content" } as React.CSSProperties}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#002855] text-white hover:bg-[#002855]/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Send className="h-4 w-4" />
                }
              </button>
            </div>
            <p className="mt-1.5 text-center text-[9px] text-white/20">
              Enter to send · Shift+Enter for new line
            </p>
          </div>
        ) : (
          <div className="border-t border-white/10 px-4 py-4 shrink-0">
            <div className="flex items-center gap-2 rounded-lg bg-amber-950/40 border border-amber-800/30 px-3 py-2.5">
              <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <p className="text-[11px] text-amber-400/80">
                Add VITE_ANTHROPIC_API_KEY to .env.local
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Pane 3: Canvas ──────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 relative">

        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setCanvasTab("preview")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                canvasTab === "preview"
                  ? "bg-white text-gray-800 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <Eye className="h-3 w-3" />
              Preview
            </button>
            <button
              onClick={() => setCanvasTab("code")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                canvasTab === "code"
                  ? "bg-white text-gray-800 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <Code2 className="h-3 w-3" />
              Code
            </button>
          </div>

          <div className="flex items-center gap-2">
            {currentCode && (
              <button
                onClick={handleManualSave}
                className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-gray-300 hover:text-gray-800 transition-colors"
              >
                <Save className="h-3 w-3" />
                Save Version
              </button>
            )}
            {currentCode && (
              <button
                onClick={() => setDeploy({ open: true, step: "form", name: "", dashboard: "os" })}
                className="flex items-center gap-1.5 rounded-md bg-[#002855] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#002855]/90 transition-colors"
              >
                <Rocket className="h-3 w-3" />
                Deploy to OS
              </button>
            )}
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-hidden relative">
          {!currentCode ? (
            <div className="flex h-full items-center justify-center bg-[#F0F2F5]">
              <div className="flex flex-col items-center gap-6 text-center max-w-md px-10">
                <Hammer className="h-10 w-10 text-[#002855]/15" />
                <div className="flex flex-col gap-2">
                  <p
                    className="text-[2rem] font-semibold leading-tight text-[#002855]"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    Welcome to the BOP Workbench.
                  </p>
                  <p className="text-xl text-[#002855]/55 font-light" style={{ fontFamily: "'Playfair Display', serif" }}>
                    What are we building today, {firstName}?
                  </p>
                </div>
                <p className="text-sm text-gray-400 font-medium">
                  Describe your tool in the Architect chat — a live preview will appear here.
                </p>
              </div>
            </div>
          ) : canvasTab === "preview" ? (
            <iframe
              src={previewUrl ?? undefined}
              className="w-full h-full border-0 bg-white"
              title="Tool Preview"
              sandbox="allow-scripts"
            />
          ) : (
            <div className="h-full overflow-auto bg-[#011428]">
              <pre className="px-6 py-6 text-xs text-green-300/70 font-mono leading-relaxed whitespace-pre-wrap">
                {currentCode}
              </pre>
            </div>
          )}
        </div>

        {/* Deploy Wizard */}
        <DeployWizard
          state={deploy}
          onUpdate={(partial) => setDeploy((d) => ({ ...d, ...partial }))}
          onClose={() => setDeploy((d) => ({ ...d, open: false, step: "form" }))}
          onDeploy={handleDeploySubmit}
        />
      </div>
    </div>
  )
}

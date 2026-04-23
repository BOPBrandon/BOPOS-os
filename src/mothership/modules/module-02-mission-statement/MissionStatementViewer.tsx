/**
 * MissionStatementViewer — Module 02 (Gold Standard layout)
 *
 * Left  (40%) — Live Mission card. Shows the evolving 12-word statement,
 *               keywords pulled from Vision Story, and word-count meter.
 * Right (60%) — AI coaching chat, driven by the Module 02 script.
 *
 * Flow:
 *   1. AI greets + shows the Vision Story keywords (from ownerWhy, clientType,
 *      productsAndServices) as context.
 *   2. AI coaches through 3 draft versions, tests each against 4 criteria,
 *      and locks the final one-sentence statement.
 *   3. Each confirmed field triggers a PATCH_UPDATE → left card updates live.
 *   4. When missionStatement is captured + wordCount ≤ 12, "Complete" unlocks.
 */

import { useState, useRef, useEffect, useCallback } from "react"
import {
  X, CheckCircle2, Copy, Check, Send, Bot,
  Quote, Loader2, AlertCircle, Sparkles, Hash, Tag,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useProfile } from "@/context/ProfileContext"
import { getModule } from "@/mothership/registry"
import { parseAIResponse } from "@/components/coach/ModuleBridge"
import type { ModuleCompletionResult } from "@/components/dashboard/ModuleViewer"
import type { RhythmItem } from "@/components/anchor/anchor-types"
import type { ClientProfile, MissionStatement } from "@/types/bopos"

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface Message {
  id:          string
  role:        "user" | "assistant"
  content:     string
  displayText: string
  hadUpdate?:  boolean
}

export interface MissionStatementViewerProps {
  onComplete: (result: ModuleCompletionResult) => void
  onClose:    () => void
}

// ─────────────────────────────────────────────
// INJECTION FORMAT
// ─────────────────────────────────────────────

const INJECTION_FORMAT = `
================================================================
MODULE INJECTION — REQUIRED
================================================================
As you confirm each answer from the owner, you MUST emit a
structured update block so the dashboard updates in real-time.

For a SINGLE confirmed field, use PATCH_UPDATE:
  <PATCH_UPDATE>
  { "moduleSlot": "module-02-mission-statement", "field": "missionStatement", "value": "..." }
  </PATCH_UPDATE>

For MULTIPLE confirmed fields at once, use MODULE_UPDATE:
  <MODULE_UPDATE>
  {
    "moduleSlot": "module-02-mission-statement",
    "mode": "patch",
    "fields": { "missionStatement": "...", "wordCount": 10, "keywords": ["...", "..."] }
  }
  </MODULE_UPDATE>

FIELD RULES:
- missionStatement: the final locked sentence (12 words or fewer).
- wordCount:        integer, must be <= 12. Count every word.
- keywords:         string array of 3-5 source keywords from Vision Story.
- Only emit when the owner has EXPLICITLY CONFIRMED a value.
- Do NOT guess, infer, or pre-fill from assumptions.
- Tags are invisible to the owner — write coaching text ABOVE them normally.

AFTER a final lock, emit MODULE_UPDATE with status="completed":
  <MODULE_UPDATE>
  { "moduleSlot": "module-02-mission-statement", "mode": "patch",
    "status": "completed",
    "fields": { "missionStatement": "...", "wordCount": 10, "keywords": [...] } }
  </MODULE_UPDATE>
================================================================
`.trim()

// ─────────────────────────────────────────────
// SYSTEM PROMPT
// ─────────────────────────────────────────────

function buildSystemPrompt(
  profile: ClientProfile,
  fields: Record<string, string>,
): string {
  const module = getModule(2)
  const script = module?.script ?? ""
  const vs     = profile.visionStory

  const keywordHints = [
    vs.ownerWhy              && `Owner's Why: "${vs.ownerWhy}"`,
    vs.clientType            && `Client Type: ${vs.clientType}`,
    vs.productsAndServices   && `Products & Services: ${vs.productsAndServices}`,
    vs.visionStatement       && `Vision Statement: "${vs.visionStatement}"`,
  ].filter(Boolean).join("\n  ")

  const captured = Object.entries(fields)
    .filter(([, v]) => v && v.toString().trim())
    .map(([k, v]) => `  ${k}: ${v}`)
    .join("\n")

  return `You are a BOPOS coach running Module 02: Mission Statement with ${profile.ownerName} at ${profile.businessName}.

The Vision Story is COMPLETE. Use it as the raw material:
  ${keywordHints || "(Vision Story fields missing — pause and ask the owner to describe the business first.)"}

${captured ? `ALREADY CAPTURED THIS SESSION:\n${captured}\n\nContinue from where we left off — do NOT re-ask fields already captured.` : "No mission fields captured yet — start from the beginning."}

THE MISSION STATEMENT COACHING SCRIPT:
================================================================
${script}
================================================================

YOUR COACHING RULES:
1. Ask ONE question at a time. HARD STOP after each — wait for the answer.
2. Step 1: extract 3–5 keywords from the Vision Story with the owner's help.
   When locked, emit a PATCH_UPDATE for \`keywords\` as a JSON array.
3. Step 2: draft THREE versions of "We exist to [verb] [who] [to what end]."
   Offer them back to the owner with their word counts.
4. Step 3: test each draft against: true · memorable · specific · violatable.
5. Step 4: lock ONE statement. Count every word.
   Emit a MODULE_UPDATE with fields.missionStatement, fields.wordCount,
   and status="completed".
6. 12 words or fewer is a HARD CONSTRAINT. If the draft exceeds 12 words,
   coach the owner to cut before locking.
7. Be direct, warm, builder-mindset. No academic language.

${INJECTION_FORMAT}`.trim()
}

// ─────────────────────────────────────────────
// CLAUDE API
// ─────────────────────────────────────────────

async function callClaude(messages: Message[], systemPrompt: string): Promise<string> {
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
      max_tokens: 1024,
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
// FIELD INIT + BUILD
// ─────────────────────────────────────────────

function initFields(m: MissionStatement): Record<string, string> {
  return {
    missionStatement: m.missionStatement || "",
    wordCount:        m.wordCount ? String(m.wordCount) : "",
    keywords:         m.keywords?.length ? JSON.stringify(m.keywords) : "",
  }
}

function parseKeywords(raw: string): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.filter((x) => typeof x === "string")
  } catch { /* fall through */ }
  return raw.split(",").map((s) => s.trim()).filter(Boolean)
}

function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length
}

function buildData(fields: Record<string, string>): Record<string, unknown> {
  const statement  = fields.missionStatement || ""
  const wc         = Number(fields.wordCount) || countWords(statement)
  return {
    missionStatement: statement,
    wordCount:        wc,
    keywords:         parseKeywords(fields.keywords),
  }
}

// ─────────────────────────────────────────────
// ANCHOR ADDITIONS (Module 02)
// ─────────────────────────────────────────────

function buildAnchorAdditions(): RhythmItem[] {
  return [{
    id:          "mission-team-meeting-opening",
    label:       "Read Mission Statement at Team Meeting",
    description: "Open every team meeting by reading the Mission Statement aloud — the declaration of why this business exists.",
    frequency:   "weekly",
    category:    "non-negotiable",
    isLocked:    true,
    createdAt:   new Date().toISOString().slice(0, 10),
  }]
}

// ─────────────────────────────────────────────
// LIVE MISSION CARD (left pane)
// ─────────────────────────────────────────────

function MissionLiveCard({
  fields,
  visionStatement,
  ownerWhy,
}: {
  fields: Record<string, string>
  visionStatement: string
  ownerWhy: string
}) {
  const statement = fields.missionStatement || ""
  const wc        = Number(fields.wordCount) || countWords(statement)
  const keywords  = parseKeywords(fields.keywords)
  const overLimit = wc > 12

  return (
    <div className="flex flex-col h-full overflow-auto px-4 py-4 bg-muted/10 gap-3">

      {/* Word count meter */}
      <div className="flex items-center gap-2 shrink-0">
        <Hash className="h-3.5 w-3.5 text-muted-foreground" />
        <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              "h-1 rounded-full transition-all duration-300",
              overLimit ? "bg-destructive" : "bg-primary"
            )}
            style={{ width: `${Math.min((wc / 12) * 100, 100)}%` }}
          />
        </div>
        <span className={cn(
          "text-[10px] shrink-0 tabular-nums font-medium",
          overLimit ? "text-destructive" : "text-muted-foreground"
        )}>
          {wc}/12 words
        </span>
      </div>

      {/* Mission Statement card */}
      <div className="rounded-xl border-2 border-bop-dark-orange/30 bg-bop-dark-orange/5 p-5 shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <Quote className="h-4 w-4 text-bop-dark-orange" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-bop-dark-orange">
            Mission Statement
          </span>
        </div>
        {statement ? (
          <p className="text-lg font-bold italic leading-snug text-foreground">
            &ldquo;{statement}&rdquo;
          </p>
        ) : (
          <p className="text-sm text-muted-foreground/60 italic">
            Being crafted through the coaching session…
          </p>
        )}
      </div>

      {/* Keywords */}
      <div className="rounded-lg border border-border bg-card px-4 py-3 shrink-0">
        <div className="flex items-center gap-1.5 mb-2">
          <Tag className="h-3 w-3 text-bop-dark-blue" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-bop-dark-blue">
            Source Keywords
          </span>
        </div>
        {keywords.length ? (
          <div className="flex flex-wrap gap-1.5">
            {keywords.map((k) => (
              <span
                key={k}
                className="rounded-full bg-bop-dark-blue/10 px-2.5 py-0.5 text-[11px] font-medium text-bop-dark-blue"
              >
                {k}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground/50 italic">
            Keywords will be extracted from your Vision Story.
          </p>
        )}
      </div>

      {/* Vision Story reference */}
      <div className="rounded-lg border border-border bg-card px-4 py-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Sparkles className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            From Your Vision Story
          </span>
        </div>
        {visionStatement ? (
          <p className="text-xs italic leading-relaxed text-foreground mb-2">
            &ldquo;{visionStatement}&rdquo;
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground/50 italic mb-2">
            Complete Module 01 first to seed this module.
          </p>
        )}
        {ownerWhy && (
          <div className="mt-2 border-t border-border/60 pt-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-bop-dark-orange mb-1">
              The Why
            </p>
            <p className="text-xs font-medium italic leading-relaxed text-foreground">
              &ldquo;{ownerWhy}&rdquo;
            </p>
          </div>
        )}
      </div>
    </div>
  )
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
      {message.hadUpdate && (
        <div className="flex items-center gap-1 px-1">
          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
          <span className="text-[10px] text-emerald-600 font-medium">Captured to Mission</span>
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
// COMPLETION OVERLAY
// ─────────────────────────────────────────────

function CompletionOverlay({
  missionStatement,
  anchorAdditions,
  onSave,
}: {
  missionStatement: string
  anchorAdditions: RhythmItem[]
  onSave: () => void
}) {
  const [copied, setCopied] = useState(false)
  function handleCopy() {
    navigator.clipboard.writeText(missionStatement).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  return (
    <div className="absolute inset-0 z-10 flex flex-col bg-background/95 backdrop-blur-sm">
      <div className="flex items-center gap-4 border-b border-border bg-emerald-50 px-8 py-6 shrink-0">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-7 w-7 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-emerald-900">
            Module 02 Complete — Mission Statement locked.
          </h2>
          <p className="text-sm text-emerald-700">
            Anchor rhythm added · Ready to share with the team
          </p>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col gap-4 overflow-auto border-r border-border p-8">
          <div className="flex items-center justify-between shrink-0">
            <h3 className="text-sm font-semibold">Your Mission Statement</h3>
            <Button size="sm" variant="outline" onClick={handleCopy} className="gap-1.5">
              {copied
                ? <><Check className="h-3.5 w-3.5 text-emerald-600" /> Copied</>
                : <><Copy className="h-3.5 w-3.5" /> Copy</>
              }
            </Button>
          </div>
          <div className="rounded-xl border-2 border-bop-dark-orange/40 bg-bop-dark-orange/5 p-8">
            <Quote className="h-5 w-5 text-bop-dark-orange mb-3" />
            <p className="text-2xl font-bold italic leading-snug text-foreground">
              &ldquo;{missionStatement}&rdquo;
            </p>
          </div>
        </div>

        <div className="flex w-80 shrink-0 flex-col gap-4 overflow-auto p-6">
          <h3 className="text-sm font-semibold shrink-0">Anchor Rhythms Added</h3>
          {anchorAdditions.map((item) => (
            <div key={item.id} className="rounded-lg border p-4 flex flex-col gap-2 bg-amber-50 border-amber-200">
              <span className="text-xs font-semibold">{item.label}</span>
              <Badge variant="secondary" className="w-fit text-[10px] uppercase tracking-wide">
                Non-Negotiable · Weekly
              </Badge>
              <p className="text-[11px] text-muted-foreground leading-snug">{item.description}</p>
            </div>
          ))}
          <div className="mt-auto pt-4 shrink-0">
            <Button className="w-full" onClick={onSave}>Close</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────

export function MissionStatementViewer({ onComplete, onClose }: MissionStatementViewerProps) {
  const { profile } = useProfile()

  const [fields,        setFields]        = useState<Record<string, string>>(() => initFields(profile.mission ?? { missionStatement: "", wordCount: 0, keywords: [] }))
  const [messages,      setMessages]      = useState<Message[]>([])
  const [input,         setInput]         = useState("")
  const [isLoading,     setIsLoading]     = useState(false)
  const [error,         setError]         = useState<string | null>(null)
  const [phase,         setPhase]         = useState<"chatting" | "completing">("chatting")
  const [bootstrapped,  setBootstrapped]  = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef       = useRef<HTMLTextAreaElement>(null)

  const hasApiKey = !!import.meta.env.VITE_ANTHROPIC_API_KEY
  const statement = fields.missionStatement || ""
  const wc        = Number(fields.wordCount) || countWords(statement)
  const canComplete = !!statement.trim() && wc > 0 && wc <= 12
  const anchorAdditions = buildAnchorAdditions()

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  // Focus input
  useEffect(() => {
    if (hasApiKey) setTimeout(() => inputRef.current?.focus(), 120)
  }, [hasApiKey])

  // Apply AI PATCH_UPDATE / MODULE_UPDATE immediately
  const applyUpdate = useCallback((update: ReturnType<typeof parseAIResponse>["update"]) => {
    if (!update) return
    const strFields: Record<string, string> = {}
    for (const [key, value] of Object.entries(update.fields)) {
      if (value !== null && value !== undefined) {
        strFields[key] = Array.isArray(value) ? JSON.stringify(value) : String(value)
      }
    }
    setFields((prev) => ({ ...prev, ...strFields }))
  }, [])

  // Bootstrap the first AI message once
  useEffect(() => {
    if (bootstrapped || !hasApiKey || isLoading) return
    setBootstrapped(true)
    setIsLoading(true)

    const kickoff: Message = {
      id:          crypto.randomUUID(),
      role:        "user",
      content:     `[SYSTEM: Start Module 02 — Mission Statement. Open by referencing the Vision Story keywords, then begin Step 1 (extract keywords with the owner). Wait for my answer.]`,
      displayText: "[Starting session…]",
    }

    const systemPrompt = buildSystemPrompt(profile, fields)
    callClaude([kickoff], systemPrompt)
      .then((raw) => {
        const { displayText, update } = parseAIResponse(raw)
        if (update) applyUpdate(update)
        setMessages([{
          id:          crypto.randomUUID(),
          role:        "assistant",
          content:     raw,
          displayText: displayText || raw,
          hadUpdate:   !!update,
        }])
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : "Unknown error"
        setError(msg === "NO_KEY" ? "API key not configured." : `Error: ${msg}`)
      })
      .finally(() => setIsLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bootstrapped, hasApiKey])

  async function sendMessage(userText: string) {
    const userMsg: Message = {
      id:          crypto.randomUUID(),
      role:        "user",
      content:     userText,
      displayText: userText,
    }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput("")
    setError(null)
    setIsLoading(true)

    try {
      const systemPrompt = buildSystemPrompt(profile, fields)
      const raw = await callClaude(updated, systemPrompt)
      const { displayText, update } = parseAIResponse(raw)
      if (update) applyUpdate(update)
      setMessages((prev) => [...prev, {
        id:          crypto.randomUUID(),
        role:        "assistant",
        content:     raw,
        displayText: displayText || raw,
        hadUpdate:   !!update,
      }])
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error"
      setError(msg === "NO_KEY" ? "API key not configured." : `Error: ${msg}`)
    } finally {
      setIsLoading(false)
    }
  }

  function handleSend() {
    const text = input.trim()
    if (!text || isLoading) return
    sendMessage(text)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleComplete() {
    setPhase("completing")
  }

  function handleOverlayClose() {
    onComplete({
      moduleId:        2,
      moduleSlot:      "module-02-mission-statement",
      data:            buildData(fields),
      coachingNotes:   `Mission Statement locked: "${statement}" (${wc} words).`,
      anchorAdditions,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background overflow-hidden">

      {/* ── HEADER ─────────────────────────────────────────── */}
      <header className="flex shrink-0 items-center justify-between bg-bop-dark-blue px-6 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Module 02 · Purpose</p>
            <p className="text-sm font-semibold text-white leading-tight">Mission Statement</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {statement && (
            <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1">
              <Hash className="h-3 w-3 text-white/60" />
              <span className={cn(
                "text-[11px] tabular-nums",
                wc > 12 ? "text-red-200 font-semibold" : "text-white/60"
              )}>
                {wc}/12 words
              </span>
            </div>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="text-white hover:bg-white/10 hover:text-white gap-1"
          >
            <X className="h-4 w-4" />
            <span className="text-xs">Close</span>
          </Button>
        </div>
      </header>

      {/* ── MAIN ────────────────────────────────────────────── */}
      <div className="relative flex flex-1 overflow-hidden">

        {/* ── LEFT: Live Mission Card ─────────────────────── */}
        <div className="flex w-[40%] shrink-0 flex-col border-r border-border overflow-hidden">
          <div className="flex shrink-0 items-center gap-2 border-b border-border bg-muted/30 px-5 py-3">
            <Quote className="h-4 w-4 text-bop-dark-orange" />
            <span className="text-sm font-semibold">Mission</span>
            <span className="ml-auto text-[10px] text-muted-foreground">Live preview</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <MissionLiveCard
              fields={fields}
              visionStatement={profile.visionStory.visionStatement}
              ownerWhy={profile.visionStory.ownerWhy}
            />
          </div>
        </div>

        {/* ── RIGHT: Chat Interface ───────────────────────── */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex shrink-0 items-center gap-2 border-b border-border bg-muted/30 px-5 py-3">
            <Bot className="h-4 w-4 text-bop-dark-blue" />
            <span className="text-sm font-semibold">Mission Statement Coach</span>
            {!hasApiKey && (
              <Badge variant="destructive" className="ml-auto text-[10px]">No API Key</Badge>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
            {!hasApiKey ? (
              <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
                <AlertCircle className="h-8 w-8 text-bop-dark-orange" />
                <p className="text-sm font-semibold">API Key Required</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Add your Anthropic API key to enable the AI coach.
                  Create a <code className="font-mono bg-muted px-1 rounded">.env.local</code> with:
                </p>
                <code className="text-xs bg-muted px-3 py-2 rounded-md font-mono w-full break-all text-left">
                  VITE_ANTHROPIC_API_KEY=sk-ant-...
                </code>
              </div>
            ) : (
              <>
                {messages.map((m) => <ChatBubble key={m.id} message={m} />)}
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

          {hasApiKey && (
            <div className="border-t border-border px-3 py-3 shrink-0">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your answer…"
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

        {phase === "completing" && (
          <CompletionOverlay
            missionStatement={statement}
            anchorAdditions={anchorAdditions}
            onSave={handleOverlayClose}
          />
        )}
      </div>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      {phase === "chatting" && (
        <footer className="shrink-0 flex items-center justify-between border-t border-border bg-card px-6 py-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {canComplete ? (
              <span className="text-emerald-600 font-medium">Mission Statement locked — {wc} words</span>
            ) : statement ? (
              <span className={cn(wc > 12 && "text-destructive font-medium")}>
                {wc > 12 ? `Too long — trim ${wc - 12} word${wc - 12 !== 1 ? "s" : ""}` : "Waiting for final lock…"}
              </span>
            ) : (
              <span>Drafting your 12-words-or-fewer statement…</span>
            )}
          </div>

          <Button
            onClick={handleComplete}
            disabled={!canComplete}
            className="gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            Complete Mission Statement
          </Button>
        </footer>
      )}
    </div>
  )
}

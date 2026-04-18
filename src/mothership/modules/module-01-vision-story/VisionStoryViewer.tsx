/**
 * VisionStoryViewer — AI-Led Coaching Session
 * Module 01: Vision Story
 *
 * Layout:
 *   Left  (40%) — Live Vision Story card (updates in real-time as AI captures data)
 *   Right (60%) — AI chat coaching interface
 *
 * Flow:
 *   1. AI greets + renders date picker for vision horizon (term)
 *   2. User picks a date (max 3 years out) → term + targetYear captured → AI starts Category 1
 *   3. AI asks one question at a time through all 7 categories
 *   4. Each confirmed answer triggers a PATCH_UPDATE → left card updates live
 *   5. After Vision Statement is captured: "Complete Module" becomes available
 */

import { useState, useRef, useEffect, useCallback } from "react"
import {
  X, CheckCircle2, Copy, Check, Send, Bot, Anchor,
  Home, DollarSign, Package, Users, Target, Building2,
  UserCheck, Quote, CalendarDays, Loader2, AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useProfile } from "@/context/ProfileContext"
import { getModule } from "@/mothership/registry"
import { parseAIResponse } from "@/components/coach/ModuleBridge"
import { TIER_CONFIG } from "@/components/anchor/anchor-types"
import { formatUSD } from "@/services/databridge/validator"
import type { ModuleCompletionResult } from "@/components/dashboard/ModuleViewer"
import type { RhythmItem } from "@/components/anchor/anchor-types"
import type { VisionStoryFinancials, ClientProfile } from "@/types/bopos"

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface Message {
  id: string
  role: "user" | "assistant"
  content: string     // raw — sent back to AI in context (includes update tags)
  displayText: string // stripped — shown to the user
  hadUpdate?: boolean
}

export interface VisionStoryViewerProps {
  onComplete: (result: ModuleCompletionResult) => void
  onClose: () => void
}

// ─────────────────────────────────────────────
// CATEGORY TILE CONFIG — drives the live card
// ─────────────────────────────────────────────

const CATEGORY_TILES = [
  { key: "familyAndFreedom",   label: "Family & Freedom",    icon: Home,      accent: "text-violet-600"         },
  { key: "productsAndServices",label: "Products & Services", icon: Package,   accent: "text-blue-600"           },
  { key: "personnelNarrative", label: "Personnel",           icon: Users,     accent: "text-sky-600"            },
  { key: "clientType",         label: "Client Type",         icon: Target,    accent: "text-amber-600"          },
  { key: "culture",            label: "Culture",             icon: Building2, accent: "text-rose-600"           },
  { key: "ownerRole",          label: "Owner's Role",        icon: UserCheck, accent: "text-bop-dark-orange"    },
] as const

// ─────────────────────────────────────────────
// MODULE INJECTION FORMAT — injected into the system prompt
// ─────────────────────────────────────────────

const INJECTION_FORMAT = `
================================================================
MODULE INJECTION — REQUIRED
================================================================
As you confirm each answer from the owner, you MUST emit a
structured update block so the dashboard updates in real-time.

For a SINGLE confirmed field, use PATCH_UPDATE:
  <PATCH_UPDATE>
  { "moduleSlot": "module-01-vision-story", "field": "fieldName", "value": "confirmed value" }
  </PATCH_UPDATE>

For MULTIPLE confirmed fields at once, use MODULE_UPDATE:
  <MODULE_UPDATE>
  {
    "moduleSlot": "module-01-vision-story",
    "mode": "patch",
    "fields": { "fieldName1": value1, "fieldName2": value2 }
  }
  </MODULE_UPDATE>

FIELD RULES:
- Money fields (revenue, pay) MUST be integers in CENTS.
  $480,000 = 48000000   $1.2M = 120000000   $85,000 = 8500000
- Percent fields (currentProfitMargin, targetProfitMargin): 0–100 number, no % symbol.
- Integer fields (currentTeamSize, targetTeamSize): plain integer.
- Narrative fields: plain strings. Capture the owner's exact words.
- Only emit when the owner has EXPLICITLY CONFIRMED a value in this session.
  Do NOT guess, infer, or pre-fill from assumptions.
- Tags are invisible to the owner — write coaching text ABOVE them normally.

AFTER every response that includes an update block, end your visible text with:
  "I've captured your [field name]. How does that look?"
================================================================
`.trim()

// ─────────────────────────────────────────────
// SYSTEM PROMPT BUILDER
// ─────────────────────────────────────────────

function buildSystemPrompt(profile: ClientProfile, fields: Record<string, string>): string {
  const module = getModule(1)
  const script = module?.script ?? ""

  const existingData = Object.entries(fields)
    .filter(([, v]) => v.trim())
    .map(([k, v]) => `  ${k}: ${v}`)
    .join("\n")

  return `You are a BOPOS coach running Module 01: Vision Story with ${profile.ownerName} at ${profile.businessName}.

Today's date: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
Business: ${profile.businessName}
Owner: ${profile.ownerName}
Industry: ${profile.industry || "Not specified"}

${existingData ? `ALREADY CAPTURED IN THIS SESSION:\n${existingData}\n\nContinue from where we left off — do NOT re-ask fields already captured above.` : "No data captured yet — start from the beginning."}

THE VISION STORY COACHING SCRIPT:
================================================================
${script}
================================================================

YOUR COACHING RULES:
1. Ask ONE question at a time. HARD STOP after each — wait for the answer.
2. The vision horizon (term + targetYear) has already been captured via date picker.
   Jump directly to Category 1: Family & Freedom.
3. If an answer is vague, ask ONE sharp follow-up to get a specific answer.
4. After the owner confirms a value, immediately emit a PATCH_UPDATE or MODULE_UPDATE block.
5. Capture the Owner's "Why" verbatim — do not paraphrase.
6. After all 7 categories, help the owner craft the one-sentence Vision Statement.
7. Be direct, warm, and story-driven. No academic language. Move with momentum.

${INJECTION_FORMAT}`.trim()
}

// ─────────────────────────────────────────────
// CLAUDE API CALL
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
      max_tokens: 1024,
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
// TERM + DATE HELPERS
// ─────────────────────────────────────────────

function computeTerm(dateStr: string): { term: string; targetYear: number; label: string } {
  const today = new Date()
  const picked = new Date(dateStr)
  const diffMs = picked.getTime() - today.getTime()
  const diffYears = diffMs / (1000 * 60 * 60 * 24 * 365.25)
  const rounded = Math.round(diffYears)
  const term = `${rounded}-year`
  const label = picked.toLocaleDateString("en-US", { month: "long", year: "numeric" })
  return { term, targetYear: picked.getFullYear(), label }
}

function maxDateStr(): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() + 3)
  return d.toISOString().slice(0, 10)
}

function minDateStr(): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().slice(0, 10)
}

// ─────────────────────────────────────────────
// FIELD INITIALIZATION
// Fields stored in DB format: money = cents, percent = 0-100
// ─────────────────────────────────────────────

function initFields(vs: VisionStoryFinancials): Record<string, string> {
  return {
    term:                 vs.term                 || "",
    targetYear:           vs.targetYear           ? String(vs.targetYear)            : "",
    familyAndFreedom:     vs.familyAndFreedom     || "",
    currentAnnualRevenue: vs.currentAnnualRevenue ? String(vs.currentAnnualRevenue)  : "",
    targetAnnualRevenue:  vs.targetAnnualRevenue  ? String(vs.targetAnnualRevenue)   : "",
    currentProfitMargin:  vs.currentProfitMargin  ? String(vs.currentProfitMargin)   : "",
    targetProfitMargin:   vs.targetProfitMargin   ? String(vs.targetProfitMargin)    : "",
    currentOwnerPay:      vs.currentOwnerPay      ? String(vs.currentOwnerPay)       : "",
    targetOwnerPay:       vs.targetOwnerPay       ? String(vs.targetOwnerPay)        : "",
    productsAndServices:  vs.productsAndServices  || "",
    currentTeamSize:      vs.currentTeamSize      ? String(vs.currentTeamSize)       : "",
    targetTeamSize:       vs.targetTeamSize       ? String(vs.targetTeamSize)        : "",
    personnelNarrative:   vs.personnelNarrative   || "",
    clientType:           vs.clientType           || "",
    culture:              vs.culture              || "",
    ownerRole:            vs.ownerRole            || "",
    ownerWhy:             vs.ownerWhy             || "",
    visionStatement:      vs.visionStatement      || "",
  }
}

// ─────────────────────────────────────────────
// BUILD DATA (fields → typed data for onComplete)
// ─────────────────────────────────────────────

function buildData(fields: Record<string, string>): Record<string, unknown> {
  return {
    term:                 fields.term                 || "3-year",
    targetYear:           Number(fields.targetYear)   || 0,
    familyAndFreedom:     fields.familyAndFreedom,
    currentAnnualRevenue: Number(fields.currentAnnualRevenue)  || 0,
    targetAnnualRevenue:  Number(fields.targetAnnualRevenue)   || 0,
    currentProfitMargin:  Number(fields.currentProfitMargin)   || 0,
    targetProfitMargin:   Number(fields.targetProfitMargin)    || 0,
    currentOwnerPay:      Number(fields.currentOwnerPay)       || 0,
    targetOwnerPay:       Number(fields.targetOwnerPay)        || 0,
    productsAndServices:  fields.productsAndServices,
    currentTeamSize:      Number(fields.currentTeamSize)       || 0,
    targetTeamSize:       Number(fields.targetTeamSize)        || 0,
    personnelNarrative:   fields.personnelNarrative,
    clientType:           fields.clientType,
    culture:              fields.culture,
    ownerRole:            fields.ownerRole,
    ownerWhy:             fields.ownerWhy,
    visionStatement:      fields.visionStatement,
  }
}

// ─────────────────────────────────────────────
// ANCHOR ADDITIONS (always the same for Module 01)
// ─────────────────────────────────────────────

function buildAnchorAdditions(): RhythmItem[] {
  return [{
    id:          "vs-review-semi-annual",
    label:       "Vision Story Review",
    description: "Re-read Vision Statement aloud, confirm the Why still holds, and update the three financial figures (revenue, margin, owner pay).",
    frequency:   "semi-annually",
    category:    "non-negotiable",
    isLocked:    true,
    createdAt:   new Date().toISOString().slice(0, 10),
    activeMonths: [2, 4, 6, 8, 10, 12],
  }]
}

// ─────────────────────────────────────────────
// COACHING NOTES GENERATOR
// ─────────────────────────────────────────────

function generateCoachingNotes(fields: Record<string, string>, sessionNotes: string): string {
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })

  const labelMap: Record<string, string> = {
    term: "Term", targetYear: "Target Year", familyAndFreedom: "Family & Freedom",
    currentAnnualRevenue: "Current Annual Revenue", targetAnnualRevenue: "Target Annual Revenue",
    currentProfitMargin: "Current Profit Margin", targetProfitMargin: "Target Profit Margin",
    currentOwnerPay: "Current Owner Pay", targetOwnerPay: "Target Owner Pay",
    productsAndServices: "Products & Services", currentTeamSize: "Current Team Size",
    targetTeamSize: "Target Team Size", personnelNarrative: "Personnel Narrative",
    clientType: "Client Type", culture: "Culture", ownerRole: "Owner's Role",
    ownerWhy: "The Why", visionStatement: "Vision Statement",
  }

  const fieldLines = Object.entries(fields)
    .filter(([, v]) => v.trim())
    .map(([k, v]) => {
      const label = (labelMap[k] ?? k).padEnd(28)
      const display = v.length > 80 ? v.slice(0, 80) + "…" : v
      return `  ${label}  ${display}`
    })
    .join("\n") || "  (No fields captured)"

  return [
    `════════════════════════════════════════════════════`,
    `  SESSION CLOSE — MODULE 01: VISION STORY`,
    `  Completed: ${today}`,
    `════════════════════════════════════════════════════`,
    ``,
    `TEMPLATE FIELDS CAPTURED`,
    `────────────────────────────────────────────────────`,
    fieldLines,
    ``,
    `ANCHOR RHYTHMS ADDED`,
    `────────────────────────────────────────────────────`,
    `  + "Vision Story Review"  →  semi-annually (Feb, Apr, Jun, Aug, Oct, Dec)`,
    `  Non-Negotiable · Locked`,
    ``,
    ...(sessionNotes.trim()
      ? [`COACH NOTES`, `────────────────────────────────────────────────────`, sessionNotes.trim(), ``]
      : []),
    `────────────────────────────────────────────────────`,
    `Next modules unlocked: Mission Statement, Core Values`,
    `════════════════════════════════════════════════════`,
  ].join("\n")
}

// ─────────────────────────────────────────────
// VISION STORY LIVE CARD (left panel)
// Shows real-time preview of all 7 categories
// ─────────────────────────────────────────────

function VisionStoryLiveCard({ fields }: { fields: Record<string, string> }) {
  const filledCount = Object.values(fields).filter((v) => v?.trim()).length
  const totalCount = 18

  const hasFinancials = fields.currentAnnualRevenue || fields.targetAnnualRevenue

  return (
    <div className="flex flex-col h-full overflow-auto px-4 py-4 bg-muted/10 gap-3">

      {/* Progress bar */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-1 rounded-full bg-primary transition-all duration-500"
            style={{ width: `${(filledCount / totalCount) * 100}%` }}
          />
        </div>
        <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
          {filledCount}/{totalCount}
        </span>
      </div>

      {/* Vision Statement */}
      <div className="rounded-xl border border-border bg-card p-4 shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <Quote className="h-3.5 w-3.5 text-bop-dark-orange" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-bop-dark-orange">
            Vision Statement
          </span>
        </div>
        {fields.visionStatement ? (
          <p className="text-xs font-semibold italic leading-relaxed text-foreground">
            &ldquo;{fields.visionStatement}&rdquo;
          </p>
        ) : (
          <p className="text-xs text-muted-foreground/60 italic">
            Being crafted through the coaching session...
          </p>
        )}
        {fields.targetYear && (
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            {fields.term || "Vision"} · Target year: {fields.targetYear}
          </p>
        )}
      </div>

      {/* Financial summary — only shown once numbers start arriving */}
      {hasFinancials && (
        <div className="rounded-xl bg-bop-dark-blue overflow-hidden shrink-0">
          <div className="grid grid-cols-2 divide-x divide-white/10">
            {[
              { label: "Revenue",   cur: fields.currentAnnualRevenue, tgt: fields.targetAnnualRevenue, money: true },
              { label: "Margin",    cur: fields.currentProfitMargin,  tgt: fields.targetProfitMargin,  pct: true   },
              { label: "Owner Pay", cur: fields.currentOwnerPay,      tgt: fields.targetOwnerPay,      money: true },
              { label: "Team",      cur: fields.currentTeamSize,      tgt: fields.targetTeamSize,      ppl: true   },
            ].map(({ label, cur, tgt, money, pct, ppl }) => (
              <div key={label} className="flex flex-col gap-0.5 px-3 py-2.5">
                <span className="text-[9px] font-bold uppercase tracking-widest text-white/40">{label}</span>
                {cur || tgt ? (
                  <div className="flex flex-wrap items-baseline gap-1">
                    {cur && (
                      <span className="text-[10px] text-white/40 line-through">
                        {money ? formatUSD(Number(cur)) : pct ? `${cur}%` : ppl ? `${cur}` : cur}
                      </span>
                    )}
                    {tgt && (
                      <span className="text-xs font-bold text-white">
                        → {money ? formatUSD(Number(tgt)) : pct ? `${tgt}%` : ppl ? `${tgt} people` : tgt}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-[10px] text-white/20 italic">—</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6 narrative category tiles */}
      <div className="grid grid-cols-1 gap-2">
        {CATEGORY_TILES.map(({ key, label, icon: Icon, accent }) => {
          const value = fields[key] || ""
          return (
            <div key={key} className="rounded-lg border border-border bg-card px-3 py-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className={cn("h-3 w-3 shrink-0", accent)} />
                <span className={cn("text-[9px] font-bold uppercase tracking-widest", accent)}>
                  {label}
                </span>
              </div>
              {value ? (
                <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3">
                  {value}
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground/40 italic">Not yet captured</p>
              )}
            </div>
          )
        })}

        {/* The Why — special treatment */}
        {fields.ownerWhy && (
          <div className="rounded-lg border border-bop-light-orange/30 bg-bop-light-orange/5 px-3 py-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[9px] font-bold uppercase tracking-widest text-bop-dark-orange">
                The Why
              </span>
            </div>
            <p className="text-[11px] font-medium italic text-foreground leading-relaxed line-clamp-3">
              &ldquo;{fields.ownerWhy}&rdquo;
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// TERM PICKER WIDGET (appears in chat after greeting)
// ─────────────────────────────────────────────

function TermPickerWidget({ onConfirm }: { onConfirm: (dateStr: string) => void }) {
  const [selected, setSelected] = useState("")

  return (
    <div className="ml-2 mt-1 w-72 rounded-2xl rounded-tl-sm border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <CalendarDays className="h-4 w-4 text-bop-dark-blue shrink-0" />
        <span className="text-xs font-semibold text-foreground">Vision Horizon</span>
      </div>

      <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
        Pick any date up to 3 years out. This becomes your target year.
      </p>

      <input
        type="date"
        min={minDateStr()}
        max={maxDateStr()}
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className={cn(
          "w-full rounded-lg border border-border bg-background",
          "px-3 py-2 text-sm text-foreground",
          "focus:outline-none focus:ring-2 focus:ring-bop-light-blue/40",
          "cursor-pointer"
        )}
      />

      {selected && (
        <p className="mt-2 text-[10px] text-muted-foreground">
          {(() => {
            const { term, label } = computeTerm(selected)
            return `${label} · ${term} vision`
          })()}
        </p>
      )}

      <Button
        size="sm"
        disabled={!selected}
        onClick={() => onConfirm(selected)}
        className="mt-3 w-full bg-bop-dark-blue hover:bg-bop-dark-blue/90"
      >
        Set My Vision Horizon
      </Button>
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
          <span className="text-[10px] text-emerald-600 font-medium">Captured to Vision Story</span>
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
        {["-0.3s", "-0.15s", "0s"].map((delay, i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-white/70 animate-bounce"
            style={{ animationDelay: delay }}
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
  coachingNotes,
  anchorAdditions,
  onSave,
}: {
  coachingNotes: string
  anchorAdditions: RhythmItem[]
  onSave: () => void
}) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(coachingNotes).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const tier = TIER_CONFIG.find((t) => t.id === "semi-annually")

  return (
    <div className="absolute inset-0 z-10 flex flex-col bg-background/95 backdrop-blur-sm">
      <div className="flex items-center gap-4 border-b border-border bg-emerald-50 px-8 py-6 shrink-0">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-7 w-7 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-emerald-900">
            Module 01 Complete — Vision Story is locked.
          </h2>
          <p className="text-sm text-emerald-700">
            Coaching notes generated · Anchor rhythm added
          </p>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col gap-3 overflow-auto border-r border-border p-6">
          <div className="flex items-center justify-between shrink-0">
            <h3 className="text-sm font-semibold">Coaching Notes</h3>
            <Button size="sm" variant="outline" onClick={handleCopy} className="gap-1.5">
              {copied
                ? <><Check className="h-3.5 w-3.5 text-emerald-600" /> Copied</>
                : <><Copy className="h-3.5 w-3.5" /> Copy Notes</>
              }
            </Button>
          </div>
          <pre className="flex-1 overflow-auto rounded-lg border border-border bg-muted/40 p-4 text-xs font-mono leading-relaxed text-foreground whitespace-pre-wrap">
            {coachingNotes}
          </pre>
        </div>

        <div className="flex w-80 shrink-0 flex-col gap-4 overflow-auto p-6">
          <h3 className="text-sm font-semibold flex items-center gap-2 shrink-0">
            <Anchor className="h-4 w-4 text-muted-foreground" />
            Anchor Rhythm Added
          </h3>
          {anchorAdditions.map((item) => (
            <div
              key={item.id}
              className={cn(
                "rounded-lg border p-4 flex flex-col gap-2",
                tier?.bg ?? "bg-amber-50",
                tier?.border ?? "border-amber-200"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold">{item.label}</span>
                <span className={cn("text-[10px] font-medium shrink-0", tier?.color)}>
                  {tier?.icon} {tier?.label}
                </span>
              </div>
              <Badge variant="secondary" className="w-fit text-[10px] uppercase tracking-wide">
                Non-Negotiable · Locked
              </Badge>
              <p className="text-[11px] text-muted-foreground leading-snug">{item.description}</p>
            </div>
          ))}

          <div className="mt-auto pt-4 shrink-0">
            <Button className="w-full" onClick={onSave}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────

const GREETING: Message = {
  id: "greeting",
  role: "assistant",
  displayText: `Alright, welcome to Vision Story — let's roll! 🎯

First, we need to decide on a term. How far out are we painting this picture? I keep visions to 3 years max so they stay real and achievable.

Pick your vision horizon below:`,
  content: `Alright, welcome to Vision Story — let's roll! First, we need to decide on a term. How far out are we painting this picture? I keep visions to 3 years max so they stay real and achievable. Pick your vision horizon below:`,
}

export function VisionStoryViewer({ onComplete, onClose }: VisionStoryViewerProps) {
  const { profile } = useProfile()

  const [fields,       setFields]      = useState<Record<string, string>>(() => initFields(profile.visionStory))
  const [messages,     setMessages]    = useState<Message[]>([GREETING])
  const [input,        setInput]       = useState("")
  const [isLoading,    setIsLoading]   = useState(false)
  const [error,        setError]       = useState<string | null>(null)
  const [termPicked,   setTermPicked]  = useState(() => !!profile.visionStory.term)
  const [sessionNotes, setSessionNotes] = useState("")
  const [phase,        setPhase]       = useState<"chatting" | "completing">("chatting")
  const [coachingNotes, setCoachingNotes] = useState("")

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef       = useRef<HTMLTextAreaElement>(null)

  const hasApiKey = !!import.meta.env.VITE_ANTHROPIC_API_KEY
  const canComplete = !!fields.visionStatement?.trim()
  const anchorAdditions = buildAnchorAdditions()

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  // Focus input when term is picked
  useEffect(() => {
    if (termPicked) setTimeout(() => inputRef.current?.focus(), 100)
  }, [termPicked])

  // Apply AI PATCH_UPDATE / MODULE_UPDATE to local fields state immediately
  const applyUpdate = useCallback((update: ReturnType<typeof parseAIResponse>["update"]) => {
    if (!update) return
    const strFields: Record<string, string> = {}
    for (const [key, value] of Object.entries(update.fields)) {
      if (value !== null && value !== undefined) {
        strFields[key] = String(value)
      }
    }
    setFields((prev) => ({ ...prev, ...strFields }))
  }, [])

  // Send a message to the AI coach
  async function sendMessage(userText: string, extraHistory: Message[] = []) {
    const userMsg: Message = {
      id:          crypto.randomUUID(),
      role:        "user",
      content:     userText,
      displayText: userText,
    }

    const updatedHistory = [...messages, ...extraHistory, userMsg]
    setMessages(updatedHistory)
    setInput("")
    setError(null)
    setIsLoading(true)

    try {
      const systemPrompt = buildSystemPrompt(profile, fields)
      const rawReply = await callClaude(updatedHistory, systemPrompt)

      const { displayText, update } = parseAIResponse(rawReply)

      if (update) applyUpdate(update)

      const assistantMsg: Message = {
        id:          crypto.randomUUID(),
        role:        "assistant",
        content:     rawReply,
        displayText: displayText || rawReply,
        hadUpdate:   !!update,
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error"
      setError(msg === "NO_KEY" ? "API key not configured." : `Error: ${msg}`)
    } finally {
      setIsLoading(false)
    }
  }

  // User hits Enter or Send button
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

  // Term picker confirmed — capture term + targetYear, then start Category 1
  function handleTermPick(dateStr: string) {
    const { term, targetYear, label } = computeTerm(dateStr)
    setFields((prev) => ({ ...prev, term, targetYear: String(targetYear) }))
    setTermPicked(true)

    const userText = `I'm targeting ${label} — that's my ${term} vision.`
    // Inject a system note so the AI knows term is captured and should jump to Category 1
    const termNote: Message = {
      id:          crypto.randomUUID(),
      role:        "user",
      content:     `${userText}\n\n[SYSTEM: Term captured — term="${term}", targetYear=${targetYear}. Proceed directly to Category 1: Family & Freedom. Do not ask about the term again.]`,
      displayText: userText,
    }
    setMessages((prev) => [...prev, termNote])
    setIsLoading(true)

    // Fire API call to get the AI's Category 1 question
    const systemPrompt = buildSystemPrompt(
      profile,
      { ...fields, term, targetYear: String(targetYear) }
    )
    callClaude([...messages, termNote], systemPrompt)
      .then((rawReply) => {
        const { displayText, update } = parseAIResponse(rawReply)
        if (update) applyUpdate(update)
        setMessages((prev) => [
          ...prev,
          {
            id:          crypto.randomUUID(),
            role:        "assistant",
            content:     rawReply,
            displayText: displayText || rawReply,
            hadUpdate:   !!update,
          },
        ])
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : "Unknown error"
        setError(msg === "NO_KEY" ? "API key not configured." : `Error: ${msg}`)
      })
      .finally(() => setIsLoading(false))
  }

  // Complete the module
  function handleComplete() {
    const notes = generateCoachingNotes(fields, sessionNotes)
    setCoachingNotes(notes)
    setPhase("completing")
  }

  function handleOverlayClose() {
    onComplete({
      moduleId:        1,
      moduleSlot:      "module-01-vision-story",
      data:            buildData(fields),
      coachingNotes,
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
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Module 01</p>
            <p className="text-sm font-semibold text-white leading-tight">Vision Story</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {termPicked && (
            <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1">
              <CalendarDays className="h-3 w-3 text-white/60" />
              <span className="text-[11px] text-white/60">
                {fields.term || "?"} · Target {fields.targetYear || "?"}
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

        {/* ── LEFT: Live Vision Story Card ─────────────────── */}
        <div className="flex w-[40%] shrink-0 flex-col border-r border-border overflow-hidden">
          <div className="flex shrink-0 items-center gap-2 border-b border-border bg-muted/30 px-5 py-3">
            <Quote className="h-4 w-4 text-bop-dark-orange" />
            <span className="text-sm font-semibold">Vision Story</span>
            <span className="ml-auto text-[10px] text-muted-foreground">
              Live preview
            </span>
          </div>
          <div className="flex-1 overflow-hidden">
            <VisionStoryLiveCard fields={fields} />
          </div>
        </div>

        {/* ── RIGHT: Chat Interface ─────────────────────────── */}
        <div className="flex flex-1 flex-col overflow-hidden">

          {/* Right sub-header */}
          <div className="flex shrink-0 items-center gap-2 border-b border-border bg-muted/30 px-5 py-3">
            <Bot className="h-4 w-4 text-bop-dark-blue" />
            <span className="text-sm font-semibold">Vision Story Coach</span>
            {!hasApiKey && (
              <Badge variant="destructive" className="ml-auto text-[10px]">No API Key</Badge>
            )}
          </div>

          {/* Message list */}
          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
            {!hasApiKey ? (
              <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
                <AlertCircle className="h-8 w-8 text-bop-dark-orange" />
                <p className="text-sm font-semibold">API Key Required</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Add your Anthropic API key to enable the AI coach.
                  Create a <code className="font-mono bg-muted px-1 rounded">.env.local</code> file:
                </p>
                <code className="text-xs bg-muted px-3 py-2 rounded-md font-mono w-full break-all text-left">
                  VITE_ANTHROPIC_API_KEY=sk-ant-...
                </code>
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <ChatBubble key={msg.id} message={msg} />
                ))}

                {/* Term picker — shown after greeting if term not yet picked */}
                {!termPicked && messages.length === 1 && (
                  <TermPickerWidget onConfirm={handleTermPick} />
                )}

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

          {/* Input — only shown after term is picked */}
          {hasApiKey && termPicked && (
            <div className="border-t border-border px-3 py-3 shrink-0">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your answer..."
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

        {/* ── COMPLETION OVERLAY ────────────────────────────── */}
        {phase === "completing" && (
          <CompletionOverlay
            coachingNotes={coachingNotes}
            anchorAdditions={anchorAdditions}
            onSave={handleOverlayClose}
          />
        )}
      </div>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      {phase === "chatting" && (
        <footer className="shrink-0 flex items-center justify-between border-t border-border bg-card px-6 py-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="tabular-nums">
              {Object.values(fields).filter((v) => v?.trim()).length}/18 fields captured
            </span>
            {canComplete && (
              <>
                <span>·</span>
                <span className="text-emerald-600 font-medium">Vision Statement ready</span>
              </>
            )}
          </div>

          <Button
            onClick={handleComplete}
            disabled={!canComplete}
            className="gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            Complete Vision Story
          </Button>
        </footer>
      )}
    </div>
  )
}

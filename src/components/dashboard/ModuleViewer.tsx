/**
 * ============================================================
 * ModuleViewer
 * Full-screen coaching environment for a single BOPOS module.
 * ============================================================
 * Layout:
 *   Left  (55%) — Coaching Workspace: formatted script + session notes
 *   Right (45%) — Template Standard: smart field inputs + anchor preview
 *
 * Session Close flow (Complete Module):
 *   1. Collect all template field values
 *   2. Auto-generate Coaching Notes document
 *   3. Parse anchorImpact → build RhythmItem[] for the Anchor Engine
 *   4. Show completion overlay (copyable notes + anchor additions)
 *   5. Emit onComplete({ moduleId, moduleSlot, data, coachingNotes, anchorAdditions })
 * ============================================================
 */

import { useState, useRef, useCallback } from "react"
import {
  X, CheckCircle2, Copy, Check, BookOpen, ClipboardList,
  Anchor, ChevronRight, AlertCircle, Minus, Plus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { getModule, getDependents } from "@/mothership/registry"
import { MODULE_REGISTRY as SLOT_REGISTRY } from "@/types/bopos"
import { TIER_CONFIG } from "@/components/anchor/anchor-types"
import type { ModuleSlot } from "@/types/bopos"
import type { RhythmItem, FrequencyTier } from "@/components/anchor/anchor-types"

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface ModuleCompletionResult {
  moduleId:        number
  moduleSlot:      ModuleSlot
  data:            Record<string, unknown>
  coachingNotes:   string
  anchorAdditions: RhythmItem[]
}

interface ModuleViewerProps {
  /** Numeric module ID (1–24) from registry.ts */
  moduleId:   number
  onComplete: (result: ModuleCompletionResult) => void
  onClose:    () => void
}

// ─────────────────────────────────────────────
// FIELD TYPE INFERENCE
// Reads the last segment of a dot-path key.
// ─────────────────────────────────────────────

type FieldType =
  | "money"
  | "percent"
  | "year"
  | "integer"
  | "boolean"
  | "textarea-long"
  | "textarea-short"
  | "tag-list"
  | "core-values"
  | "text"

function inferFieldType(fieldPath: string): FieldType {
  const key = (fieldPath.split(".").pop() ?? "").toLowerCase()

  if (key.includes("values") && fieldPath.startsWith("coreValues")) return "core-values"
  if (key.includes("keywords") || key.includes("birthdays")) return "tag-list"
  if (key.includes("revenue") || key.includes("pay") || key.includes("cogs") ||
      key.includes("amount") || key.includes("income")) return "money"
  if (key.includes("percent") || key.includes("margin")) return "percent"
  if (key.includes("year")) return "year"
  if (key.includes("size") || key.includes("count") || key.includes("wordcount")) return "integer"
  if (key.includes("recommended") || key.includes("confirmed")) return "boolean"
  if (key.includes("narrative") || key.includes("why") || key.includes("freedom") ||
      key.includes("culture") || key.includes("services") || key.includes("type") ||
      key.includes("role") || key.includes("statement") || key.includes("description") ||
      key.includes("summary") || key.includes("notes")) return "textarea-long"
  if (key.includes("name") || key.includes("label") || key.includes("platform") ||
      key.includes("facilitator") || key.includes("owner") || key.includes("location")) return "text"

  return "textarea-short"
}

function formatLabel(fieldPath: string): string {
  const key = fieldPath.split(".").pop() ?? fieldPath
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim()
}

function formatGroupLabel(group: string): string {
  const map: Record<string, string> = {
    visionStory:  "Vision Story",
    mission:      "Mission Statement",
    coreValues:   "Core Values",
    bankAccounts: "Bank Accounts",
    anchor:       "Anchor Rhythms",
    modules:      "Module Data",
    realRevenue:  "Real Revenue",
    anchorRhythms: "Anchor Rhythms",
  }
  return map[group] ?? group.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())
}

// ─────────────────────────────────────────────
// ANCHOR IMPACT PARSER
// Extracts (label, tier) pairs from the anchorImpact text.
// Pattern: Adds "Label" to the X tier
// ─────────────────────────────────────────────

interface AnchorAddition {
  label:       string
  frequency:   FrequencyTier
  description: string
}

function parseAnchorImpact(anchorImpact: string): AnchorAddition[] {
  if (!anchorImpact || anchorImpact.startsWith("The Anchor IS") || anchorImpact.startsWith("N/A")) {
    return []
  }

  const additions: AnchorAddition[] = []
  const regex = /[Aa]dds? "([^"]+)" to the ([\w\-]+) tier/g
  let match: RegExpExecArray | null

  while ((match = regex.exec(anchorImpact)) !== null) {
    const label   = match[1]
    const tierRaw = match[2].toLowerCase()
    const frequency = mapTierText(tierRaw)
    if (frequency) {
      additions.push({
        label,
        frequency,
        description: anchorImpact.split(".")[0] + ".",
      })
    }
  }

  return additions
}

function mapTierText(text: string): FrequencyTier | null {
  if (text.includes("daily"))    return "daily"
  if (text.includes("weekly"))   return "weekly"
  if (text.includes("monthly"))  return "monthly"
  if (text.includes("quarterly")) return "quarterly"
  if (text.includes("semi"))     return "semi-annually"
  if (text.includes("annual"))   return "annually"
  return null
}

function buildRhythmItem(addition: AnchorAddition, moduleTitle: string): RhythmItem {
  const isVisionReview = addition.label.toLowerCase().includes("vision story")
  return {
    id:          `mv-${Date.now()}-${addition.label.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 30)}`,
    label:       addition.label,
    description: addition.description || `Added by completing "${moduleTitle}".`,
    frequency:   addition.frequency,
    category:    isVisionReview ? "non-negotiable" : "general",
    isLocked:    isVisionReview,
    createdAt:   new Date().toISOString().slice(0, 10),
    ...(addition.frequency === "semi-annually"
      ? { activeMonths: [2, 4, 6, 8, 10, 12] }
      : {}),
  }
}

// ─────────────────────────────────────────────
// COACHING NOTES GENERATOR
// Produces the Session Close document.
// ─────────────────────────────────────────────

function generateCoachingNotes(
  moduleId:     number,
  moduleTitle:  string,
  fields:       Record<string, string>,
  sessionNotes: string,
  anchorAdditions: AnchorAddition[],
  nextModules:  string[]
): string {
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  })

  const idStr = String(moduleId).padStart(2, "0")

  const filledFields = Object.entries(fields).filter(([, v]) => v.trim())
  const fieldLines = filledFields.length > 0
    ? filledFields.map(([k, v]) => {
        const label = formatLabel(k).padEnd(28)
        const display = v.length > 80 ? v.slice(0, 80) + "…" : v
        return `  ${label}  ${display}`
      }).join("\n")
    : "  (No fields captured)"

  const anchorLines = anchorAdditions.length > 0
    ? anchorAdditions.map((a) => `  + "${a.label}"  →  ${a.frequency}`).join("\n")
    : "  No new Anchor rhythms from this module."

  const nextLine = nextModules.length > 0
    ? `Next modules unlocked: ${nextModules.join(", ")}`
    : "All downstream modules are already available."

  return [
    `════════════════════════════════════════════════════`,
    `  SESSION CLOSE — MODULE ${idStr}: ${moduleTitle.toUpperCase()}`,
    `  Completed: ${today}`,
    `════════════════════════════════════════════════════`,
    ``,
    `TEMPLATE FIELDS CAPTURED`,
    `────────────────────────────────────────────────────`,
    fieldLines,
    ``,
    `ANCHOR RHYTHMS ADDED`,
    `────────────────────────────────────────────────────`,
    anchorLines,
    ``,
    ...(sessionNotes.trim()
      ? [
          `COACH NOTES`,
          `────────────────────────────────────────────────────`,
          sessionNotes.trim(),
          ``,
        ]
      : []),
    `────────────────────────────────────────────────────`,
    nextLine,
    `════════════════════════════════════════════════════`,
  ].join("\n")
}

// ─────────────────────────────────────────────
// CORE VALUES BUILDER
// Special repeating input for coreValues.values
// ─────────────────────────────────────────────

interface CoreValueEntry {
  name:       string
  definition: string
  hireFor:    boolean
  fireFor:    boolean
}

function CoreValuesBuilder({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const parsed: CoreValueEntry[] = (() => {
    try { return JSON.parse(value) } catch { return [] }
  })()

  const update = (entries: CoreValueEntry[]) => onChange(JSON.stringify(entries))

  const addEntry = () =>
    update([...parsed, { name: "", definition: "", hireFor: false, fireFor: false }])

  const removeEntry = (i: number) =>
    update(parsed.filter((_, idx) => idx !== i))

  const updateEntry = (i: number, field: keyof CoreValueEntry, val: string | boolean) => {
    const updated = parsed.map((e, idx) => idx === i ? { ...e, [field]: val } : e)
    update(updated)
  }

  return (
    <div className="flex flex-col gap-3">
      {parsed.map((entry, i) => (
        <div key={i} className="rounded-lg border border-border bg-muted/30 p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Value {i + 1}</span>
            <button
              onClick={() => removeEntry(i)}
              className="text-muted-foreground hover:text-destructive transition-colors"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
          </div>
          <input
            type="text"
            placeholder='Name (e.g. "Own It Completely")'
            value={entry.name}
            onChange={(e) => updateEntry(i, "name", e.target.value)}
            className="w-full rounded border border-border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <input
            type="text"
            placeholder='Definition: "We [X] — which means we [Y]."'
            value={entry.definition}
            onChange={(e) => updateEntry(i, "definition", e.target.value)}
            className="w-full rounded border border-border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <div className="flex gap-4">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={entry.hireFor}
                onChange={(e) => updateEntry(i, "hireFor", e.target.checked)}
                className="rounded"
              />
              Hire for this
            </label>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={entry.fireFor}
                onChange={(e) => updateEntry(i, "fireFor", e.target.checked)}
                className="rounded"
              />
              Fire for this
            </label>
          </div>
        </div>
      ))}
      <button
        onClick={addEntry}
        className="flex items-center gap-1.5 rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors"
      >
        <Plus className="h-3.5 w-3.5" /> Add Core Value
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────
// SMART FIELD INPUT
// Renders the right input type per field.
// ─────────────────────────────────────────────

function FieldInput({
  fieldPath,
  value,
  onChange,
}: {
  fieldPath: string
  value:     string
  onChange:  (v: string) => void
}) {
  const type = inferFieldType(fieldPath)

  if (type === "core-values") {
    return <CoreValuesBuilder value={value} onChange={onChange} />
  }

  if (type === "tag-list") {
    return (
      <input
        type="text"
        placeholder="Comma-separated values"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
      />
    )
  }

  if (type === "money") {
    return (
      <div className="relative">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
        <input
          type="number"
          min={0}
          step={1000}
          placeholder="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded border border-border bg-background pl-6 pr-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>
    )
  }

  if (type === "percent") {
    return (
      <div className="relative">
        <input
          type="number"
          min={0}
          max={100}
          step={1}
          placeholder="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded border border-border bg-background px-2.5 pr-8 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
      </div>
    )
  }

  if (type === "year") {
    return (
      <input
        type="number"
        min={2024}
        max={2040}
        step={1}
        placeholder={String(new Date().getFullYear() + 3)}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
      />
    )
  }

  if (type === "integer") {
    return (
      <input
        type="number"
        min={0}
        step={1}
        placeholder="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
      />
    )
  }

  if (type === "boolean") {
    return (
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={value === "true"}
          onChange={(e) => onChange(e.target.checked ? "true" : "false")}
          className="rounded"
        />
        <span className="text-xs text-muted-foreground">Yes</span>
      </label>
    )
  }

  if (type === "textarea-long") {
    return (
      <Textarea
        placeholder="Capture verbatim or summarise..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="text-xs resize-none"
      />
    )
  }

  if (type === "textarea-short") {
    return (
      <Textarea
        placeholder="Enter value..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className="text-xs resize-none"
      />
    )
  }

  // text
  return (
    <input
      type="text"
      placeholder="Enter value..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded border border-border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
    />
  )
}

// ─────────────────────────────────────────────
// COMPLETION OVERLAY
// Shown after "Complete Module" is clicked.
// ─────────────────────────────────────────────

function CompletionOverlay({
  coachingNotes,
  anchorAdditions,
  onSave,
}: {
  coachingNotes:    string
  anchorAdditions:  AnchorAddition[]
  onSave:           () => void
}) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(coachingNotes).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="absolute inset-0 z-10 flex flex-col bg-background/95 backdrop-blur-sm">
      {/* Success header */}
      <div className="flex items-center gap-4 border-b border-border bg-emerald-50 px-8 py-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-7 w-7 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-emerald-900">Module Complete</h2>
          <p className="text-sm text-emerald-700">
            Coaching notes generated · Anchor updated · PullForward cascaded
          </p>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left — Coaching Notes */}
        <div className="flex flex-1 flex-col gap-3 overflow-auto border-r border-border p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
              Coaching Notes
            </h3>
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

        {/* Right — Anchor Additions */}
        <div className="flex w-80 shrink-0 flex-col gap-3 overflow-auto p-6">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Anchor className="h-4 w-4 text-muted-foreground" />
            Anchor Rhythms Added
          </h3>

          {anchorAdditions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-4 text-center">
              <p className="text-xs text-muted-foreground">No new Anchor rhythms from this module.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {anchorAdditions.map((a, i) => {
                const tier = TIER_CONFIG.find((t) => t.id === a.frequency)
                return (
                  <div
                    key={i}
                    className={cn(
                      "rounded-lg border p-3 flex flex-col gap-1.5",
                      tier?.bg ?? "bg-muted/30",
                      tier?.border ?? "border-border"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold leading-snug">{a.label}</span>
                      <span className={cn("text-[10px] font-medium shrink-0", tier?.color)}>
                        {tier?.icon} {tier?.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">{a.description}</p>
                  </div>
                )
              })}
            </div>
          )}

          <div className="mt-auto pt-4">
            <Button className="w-full" onClick={onSave}>
              Save & Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// MODULE VIEWER — MAIN COMPONENT
// ─────────────────────────────────────────────

export function ModuleViewer({ moduleId, onComplete, onClose }: ModuleViewerProps) {
  // ── Resolve module from registry ──────────────────────────
  const module = getModule(moduleId)

  // Get the ModuleSlot string from the types registry
  const slotEntry = Object.entries(SLOT_REGISTRY).find(([, meta]) => meta.slot === moduleId)
  const moduleSlot = slotEntry?.[0] as ModuleSlot | undefined

  // ── State ──────────────────────────────────────────────────
  const [fields, setFields]           = useState<Record<string, string>>({})
  const [sessionNotes, setSessionNotes] = useState("")
  const [phase, setPhase]             = useState<"working" | "completing" | "completed">("working")
  const [coachingNotes, setCoachingNotes] = useState("")
  const [anchorItems, setAnchorItems] = useState<AnchorAddition[]>([])
  const [scriptCopied, setScriptCopied] = useState(false)
  const scriptRef = useRef<HTMLDivElement>(null)

  // ── Bail if module not found ───────────────────────────────
  if (!module || !moduleSlot) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80">
        <div className="rounded-xl border border-border bg-card p-8 text-center shadow-2xl">
          <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
          <p className="font-semibold">Module {moduleId} not found</p>
          <Button className="mt-4" variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    )
  }

  // ── Field helpers ──────────────────────────────────────────
  const setField = useCallback((path: string, value: string) => {
    setFields((prev) => ({ ...prev, [path]: value }))
  }, [])

  const filledCount = Object.values(fields).filter((v) => v.trim()).length
  const totalFields = module.templateFields.length

  // ── Group template fields ──────────────────────────────────
  const fieldGroups = module.templateFields.reduce<Record<string, string[]>>((acc, f) => {
    const group = f.split(".")[0]
    if (!acc[group]) acc[group] = []
    acc[group].push(f)
    return acc
  }, {})

  // ── Anchor impact ──────────────────────────────────────────
  const anchorAdditions = parseAnchorImpact(module.anchorImpact)

  // ── Copy script ───────────────────────────────────────────
  function handleCopyScript() {
    navigator.clipboard.writeText(module.script).then(() => {
      setScriptCopied(true)
      setTimeout(() => setScriptCopied(false), 2000)
    })
  }

  // ── Complete Module ────────────────────────────────────────
  function handleComplete() {
    const nextModules = getDependents(moduleId).map((d) => d.title)
    const notes = generateCoachingNotes(
      moduleId,
      module.title,
      fields,
      sessionNotes,
      anchorAdditions,
      nextModules
    )
    const rhythmItems = anchorAdditions.map((a) => buildRhythmItem(a, module.title))

    setCoachingNotes(notes)
    setAnchorItems(anchorAdditions)
    setPhase("completing")

    // Build structured data from field values
    const data: Record<string, unknown> = {}
    for (const [path, value] of Object.entries(fields)) {
      if (!value.trim()) continue
      const keys  = path.split(".")
      let cursor: Record<string, unknown> = data
      for (let i = 0; i < keys.length - 1; i++) {
        if (!cursor[keys[i]]) cursor[keys[i]] = {}
        cursor = cursor[keys[i]] as Record<string, unknown>
      }
      // Parse numeric strings
      const numVal = Number(value)
      cursor[keys[keys.length - 1]] = !isNaN(numVal) && value.trim() !== "" ? numVal : value
    }

    onComplete({ moduleId, moduleSlot, data, coachingNotes: notes, anchorAdditions: rhythmItems })
  }

  // ── Tier badge for anchor preview ─────────────────────────
  function AnchorPreview() {
    if (module.anchorImpact.startsWith("The Anchor IS") || module.anchorImpact.startsWith("N/A")) {
      return (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-3 text-center">
          <p className="text-xs text-muted-foreground italic">This module builds the Anchor itself — no new rhythm added.</p>
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-2">
        {anchorAdditions.map((a, i) => {
          const tier = TIER_CONFIG.find((t) => t.id === a.frequency)
          return (
            <div key={i} className={cn("rounded-md border px-3 py-2 flex items-center gap-2", tier?.bg, tier?.border)}>
              <span className="text-base">{tier?.icon}</span>
              <div>
                <p className={cn("text-xs font-semibold", tier?.color)}>{a.label}</p>
                <p className="text-[11px] text-muted-foreground">{tier?.label} · {a.description.slice(0, 60)}…</p>
              </div>
            </div>
          )
        })}
        {anchorAdditions.length === 0 && (
          <p className="text-xs text-muted-foreground italic px-1">No additional Anchor rhythms from this module.</p>
        )}
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background overflow-hidden">

      {/* ── Header ──────────────────────────────────────────── */}
      <header className="flex shrink-0 items-center justify-between border-b border-border bg-card px-6 py-3.5">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="font-mono text-xs shrink-0">
            Module {String(moduleId).padStart(2, "0")}
          </Badge>
          <h1 className="text-base font-bold leading-tight">{module.title}</h1>
          <span className="hidden sm:block text-xs text-muted-foreground max-w-xs truncate">
            {module.description}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={filledCount === totalFields ? "success" : "ghost"} className="gap-1">
            {filledCount}/{totalFields} fields
          </Badge>
          <Button size="sm" variant="ghost" onClick={onClose} className="gap-1">
            <X className="h-4 w-4" /> Close
          </Button>
        </div>
      </header>

      {/* ── Main — two panels ────────────────────────────────── */}
      <div className="relative flex flex-1 overflow-hidden">

        {/* ── LEFT: Coaching Workspace ─────────────────────── */}
        <div className="flex w-[55%] shrink-0 flex-col border-r border-border overflow-hidden">

          {/* Left header */}
          <div className="flex shrink-0 items-center justify-between border-b border-border bg-[#0f1117] px-5 py-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-sky-400" />
              <span className="text-sm font-semibold text-sky-100">Coaching Workspace</span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopyScript}
              className="h-7 gap-1.5 text-xs text-slate-400 hover:text-slate-100 hover:bg-slate-700"
            >
              {scriptCopied
                ? <><Check className="h-3 w-3 text-emerald-400" /> Copied</>
                : <><Copy className="h-3 w-3" /> Copy Script</>
              }
            </Button>
          </div>

          {/* Script */}
          <div
            ref={scriptRef}
            className="flex-1 overflow-auto bg-[#0f1117] p-5 pb-0"
          >
            <pre className="whitespace-pre-wrap font-mono text-[12.5px] leading-[1.75] text-slate-300">
              {module.script}
            </pre>
          </div>

          {/* Session Notes */}
          <div className="shrink-0 border-t border-slate-700 bg-[#0f1117] p-4">
            <label className="mb-1.5 block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Session Notes
            </label>
            <Textarea
              placeholder="Type anything that doesn't fit a template field — observations, owner reactions, decisions made..."
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              rows={4}
              className="resize-none bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500 text-xs focus:ring-sky-500"
            />
          </div>
        </div>

        {/* ── RIGHT: Template Standard ─────────────────────── */}
        <div className="flex flex-1 flex-col overflow-hidden">

          {/* Right header */}
          <div className="flex shrink-0 items-center justify-between border-b border-border bg-muted/30 px-5 py-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Template Standard</span>
            </div>
            <span className="text-xs text-muted-foreground">Fill each field during the session</span>
          </div>

          {/* Fields */}
          <div className="flex-1 overflow-auto px-5 py-4 flex flex-col gap-6">

            {Object.entries(fieldGroups).map(([group, paths]) => (
              <div key={group}>
                {/* Group header */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-primary">
                    {formatGroupLabel(group)}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <div className="flex flex-col gap-3">
                  {paths.map((fieldPath) => {
                    const lastKey = fieldPath.split(".").pop() ?? ""
                    // Skip auto-calculated / derived fields
                    if (["wordCount", "realRevenue", "monthlyRealRevenue"].includes(lastKey)) {
                      return (
                        <div key={fieldPath} className="flex items-center justify-between">
                          <label className="text-xs font-medium text-muted-foreground">
                            {formatLabel(fieldPath)}
                          </label>
                          <span className="text-[11px] text-muted-foreground italic">
                            Auto-calculated
                          </span>
                        </div>
                      )
                    }

                    return (
                      <div key={fieldPath}>
                        <label className="mb-1 block text-xs font-medium text-foreground">
                          {formatLabel(fieldPath)}
                          {inferFieldType(fieldPath) === "money" && (
                            <span className="ml-1.5 text-[11px] text-muted-foreground font-normal">in dollars</span>
                          )}
                          {inferFieldType(fieldPath) === "percent" && (
                            <span className="ml-1.5 text-[11px] text-muted-foreground font-normal">0 – 100</span>
                          )}
                        </label>
                        <FieldInput
                          fieldPath={fieldPath}
                          value={fields[fieldPath] ?? ""}
                          onChange={(v) => setField(fieldPath, v)}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            {/* Anchor Impact Preview */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[11px] font-bold uppercase tracking-widest text-amber-600">
                  Anchor Impact
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>
              <AnchorPreview />
              {module.anchorImpact &&
                !module.anchorImpact.startsWith("The Anchor IS") &&
                !module.anchorImpact.startsWith("N/A") && (
                  <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">
                    {module.anchorImpact}
                  </p>
                )}
            </div>

            {/* Next modules */}
            {getDependents(moduleId).length > 0 && (
              <div className="rounded-lg border border-dashed border-border p-3">
                <p className="text-[11px] text-muted-foreground mb-1.5 font-medium">
                  Completing this module unlocks:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {getDependents(moduleId).map((d) => (
                    <Badge key={d.id} variant="ghost" className="text-[11px] gap-1">
                      <ChevronRight className="h-3 w-3" />
                      {d.title}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom padding */}
            <div className="h-24" />
          </div>
        </div>

        {/* ── COMPLETION OVERLAY ───────────────────────────── */}
        {phase === "completing" && (
          <CompletionOverlay
            coachingNotes={coachingNotes}
            anchorAdditions={anchorItems}
            onSave={onClose}
          />
        )}
      </div>

      {/* ── Sticky Footer ────────────────────────────────────── */}
      {phase === "working" && (
        <footer className="shrink-0 flex items-center justify-between border-t border-border bg-card px-6 py-3">
          <div className="flex items-center gap-3">
            {module.prerequisite && (
              <span className="text-xs text-muted-foreground">
                Built on: Module {String(module.prerequisite).padStart(2, "0")} — {getModule(module.prerequisite)?.title}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-32 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-1.5 rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${totalFields > 0 ? (filledCount / totalFields) * 100 : 0}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {filledCount}/{totalFields} fields
              </span>
            </div>

            <Button
              onClick={handleComplete}
              disabled={filledCount === 0}
              className="gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              Complete Module
            </Button>
          </div>
        </footer>
      )}
    </div>
  )
}

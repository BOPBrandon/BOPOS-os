/**
 * ModuleBridge — AI → Dashboard Update Parser
 * ============================================================
 * Parses structured blocks from AI chat responses and converts
 * them into typed update payloads the dashboard can apply.
 *
 * TWO TAG FORMATS:
 *
 * 1. MODULE_UPDATE — multi-field, supports mode: "patch" | "replace"
 *    <MODULE_UPDATE>
 *    {
 *      "moduleSlot": "module-01-vision-story",
 *      "mode": "patch",
 *      "status": "in_progress",
 *      "fields": { "visionStatement": "...", "targetYear": 2028 }
 *    }
 *    </MODULE_UPDATE>
 *
 * 2. PATCH_UPDATE — single-field shorthand, always patch mode
 *    <PATCH_UPDATE>
 *    { "moduleSlot": "module-01-vision-story", "field": "visionStatement", "value": "..." }
 *    </PATCH_UPDATE>
 *
 * If both appear in one response for the same slot, they are MERGED
 * (PATCH_UPDATE fields win on conflict — they are more specific).
 *
 * Parsing rules:
 *  - If multiple MODULE_UPDATE blocks appear, the last one wins.
 *  - All PATCH_UPDATE blocks are merged together.
 *  - Tags are always stripped from display text.
 *  - Invalid JSON is silently ignored.
 * ============================================================
 */
import type { ModuleSlot, ModuleStatus } from "@/types/bopos"

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface ModuleUpdatePayload {
  /** The module slot being updated */
  moduleSlot: ModuleSlot

  /**
   * "patch" (default) — merge fields into existing data, preserving untouched fields.
   * "replace"         — overwrite the entire data object with just these fields.
   */
  mode?: "patch" | "replace"

  /** If "completed", marks the module done. Defaults to "in_progress". */
  status?: ModuleStatus

  /** Key/value pairs to write. Cent values must be integers. */
  fields: Record<string, unknown>
}

export interface ParsedResponse {
  /** AI text with all update tags stripped */
  displayText: string
  /** The merged update to stage, or null if no valid tags found */
  update: ModuleUpdatePayload | null
}

// ─────────────────────────────────────────────
// REGEX PATTERNS
// ─────────────────────────────────────────────

const MODULE_UPDATE_RE  = /<MODULE_UPDATE>([\s\S]*?)<\/MODULE_UPDATE>/g
const PATCH_UPDATE_RE   = /<PATCH_UPDATE>([\s\S]*?)<\/PATCH_UPDATE>/g

// ─────────────────────────────────────────────
// PARSER
// ─────────────────────────────────────────────

export function parseAIResponse(raw: string): ParsedResponse {
  let baseUpdate: ModuleUpdatePayload | null = null

  // ── Step 1: Parse all MODULE_UPDATE blocks (last one wins) ──
  const moduleMatches = [...raw.matchAll(MODULE_UPDATE_RE)]
  if (moduleMatches.length > 0) {
    const lastBlock = moduleMatches[moduleMatches.length - 1][1].trim()
    try {
      const parsed = JSON.parse(lastBlock) as Partial<ModuleUpdatePayload>
      if (
        typeof parsed.moduleSlot === "string" &&
        parsed.moduleSlot.startsWith("module-") &&
        parsed.fields !== null &&
        typeof parsed.fields === "object"
      ) {
        baseUpdate = {
          moduleSlot: parsed.moduleSlot as ModuleSlot,
          mode:       parsed.mode ?? "patch",
          status:     parsed.status,
          fields:     parsed.fields,
        }
      }
    } catch { /* invalid JSON — ignore */ }
  }

  // ── Step 2: Parse all PATCH_UPDATE blocks (merge all) ──────
  const patchMatches = [...raw.matchAll(PATCH_UPDATE_RE)]
  const patchFields: Record<string, unknown> = {}
  let patchSlot: ModuleSlot | null = null

  for (const match of patchMatches) {
    try {
      const parsed = JSON.parse(match[1].trim()) as {
        moduleSlot?: string
        field?: string
        value?: unknown
      }
      if (
        typeof parsed.moduleSlot === "string" &&
        parsed.moduleSlot.startsWith("module-") &&
        typeof parsed.field === "string"
      ) {
        patchSlot = parsed.moduleSlot as ModuleSlot
        patchFields[parsed.field] = parsed.value
      }
    } catch { /* invalid JSON — ignore */ }
  }

  // ── Step 3: Merge patch fields into base update ─────────────
  let update: ModuleUpdatePayload | null = baseUpdate

  if (patchSlot && Object.keys(patchFields).length > 0) {
    if (update && update.moduleSlot === patchSlot) {
      // Same slot — PATCH_UPDATE fields win on conflict (more specific)
      update = {
        ...update,
        mode: "patch",
        fields: { ...update.fields, ...patchFields },
      }
    } else if (!update) {
      // No MODULE_UPDATE found — use the patch as the primary update
      update = {
        moduleSlot: patchSlot,
        mode: "patch",
        fields: patchFields,
      }
    }
    // If different slots, ignore the patch (can't merge across slots in one step)
  }

  // ── Step 4: Strip all tags from display text ────────────────
  const displayText = raw
    .replace(MODULE_UPDATE_RE, "")
    .replace(PATCH_UPDATE_RE, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()

  return { displayText, update }
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/**
 * Returns human-readable field name(s) from a payload.
 * Used to build the AI confirmation sentence.
 */
export function getChangedFieldNames(update: ModuleUpdatePayload): string {
  const keys = Object.keys(update.fields)
  if (keys.length === 0) return "the field"
  if (keys.length === 1) return formatFieldName(keys[0])
  if (keys.length === 2) return `${formatFieldName(keys[0])} and ${formatFieldName(keys[1])}`
  return `${keys.slice(0, -1).map(formatFieldName).join(", ")}, and ${formatFieldName(keys[keys.length - 1])}`
}

/** "visionStatement" → "Vision Statement" */
function formatFieldName(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim()
}

/** Returns a short summary string for the sync bar */
export function summarizeUpdate(update: ModuleUpdatePayload): string {
  const n = Object.keys(update.fields).length
  const mode = update.mode === "replace" ? "replace" : "patch"
  return `${n} field${n !== 1 ? "s" : ""} · ${mode} mode`
}

/** Builds the confirmation sentence the AI should say (used as fallback) */
export function buildConfirmationSentence(update: ModuleUpdatePayload): string {
  const fieldNames = getChangedFieldNames(update)
  return `I've updated the **${fieldNames}** based on our conversation. How does that look to you?`
}

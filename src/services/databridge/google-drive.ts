/**
 * ============================================================
 * DataBridge — Google Drive BYOC (Bring Your Own Content)
 * ============================================================
 * Simulates the Google Drive integration layer.
 * In production, replace the SIMULATED_* constants and the
 * fetch calls with the real Google Drive API v3 endpoints.
 *
 * The simulation mirrors the real API shape exactly so that
 * swapping to production requires only changing the transport
 * layer — all types, transforms, and error handling stay.
 *
 * Real endpoints to swap in:
 *   List files:  GET https://www.googleapis.com/drive/v3/files
 *   Get file:    GET https://www.googleapis.com/drive/v3/files/{fileId}
 *   Export:      GET https://www.googleapis.com/drive/v3/files/{fileId}/export
 * ============================================================
 */

import type {
  DriveConfig,
  DriveFile,
  ClientProfile,
  ModuleSlot,
  BOPOSModule,
} from "@/types/bopos"
import { MODULE_REGISTRY } from "@/types/bopos"

// ─────────────────────────────────────────────
// SIMULATION LAYER
// Replace this block with real fetch() calls for production.
// ─────────────────────────────────────────────

const SIMULATED_FILES: Record<string, DriveFile> = {
  "drive-file-vision-story": {
    id: "drive-file-vision-story",
    name: "BOPOS_Module_01_Vision_Story.json",
    mimeType: "application/json",
    modifiedTime: "2026-03-10",
    content: {
      currentAnnualRevenue: 48000000,   // $480,000 in cents
      targetAnnualRevenue:  120000000,  // $1,200,000
      targetYear:           2028,
      currentProfitMargin:  12,
      targetProfitMargin:   25,
      currentTeamSize:      3,
      targetTeamSize:       8,
      visionStatement:      "Build a business that runs without me.",
      ownerWhy:             "Freedom, legacy, and time with family.",
    },
  },
  "drive-file-bank-accounts": {
    id: "drive-file-bank-accounts",
    name: "BOPOS_Module_04_Bank_Accounts.json",
    mimeType: "application/json",
    modifiedTime: "2026-03-20",
    content: {
      // Real Revenue (Part 1)
      totalRevenue:       48000000, // $480,000/yr in cents
      totalCOGS:          12000000, // $120,000 COGS
      // Business structure
      businessStructure:           "S-Corp",
      sCorporElectionRecommended:  false,
      // Income account
      incomeLabel:                 "Income",
      // Current allocations
      currentProfitPercent:        5,
      currentOwnersPayPercent:    45,
      currentTaxPercent:          15,
      currentOpexPercent:         30,
      currentCapexPercent:         5,
      // Target allocations
      targetProfitPercent:        10,
      targetOwnersPayPercent:     50,
      targetTaxPercent:           15,
      targetOpexPercent:          20,
      targetCapexPercent:          5,
    },
  },
}

/** Simulated folder listing (mirrors Drive API files.list response) */
const SIMULATED_FOLDER: Record<string, string[]> = {
  "default-folder": [
    "drive-file-vision-story",
    "drive-file-bank-accounts",
  ],
}

/** Simulated latency in ms */
const SIMULATED_DELAY_MS = 300

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ─────────────────────────────────────────────
// DRIVE CLIENT
// ─────────────────────────────────────────────

export interface DriveClientError {
  code: "NOT_FOUND" | "UNAUTHORIZED" | "PARSE_ERROR" | "NETWORK_ERROR"
  message: string
  fileId?: string
}

export type DriveResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: DriveClientError }

/**
 * listDriveFiles
 * Returns all file IDs in the client's root folder.
 * Simulated: reads from SIMULATED_FOLDER.
 */
export async function listDriveFiles(
  config: DriveConfig
): Promise<DriveResult<string[]>> {
  await sleep(SIMULATED_DELAY_MS)

  const files = SIMULATED_FOLDER[config.rootFolderId] ?? SIMULATED_FOLDER["default-folder"]

  if (!files) {
    return {
      ok: false,
      error: { code: "NOT_FOUND", message: `Folder ${config.rootFolderId} not found.` },
    }
  }

  return { ok: true, data: files }
}

/**
 * fetchDriveFile
 * Fetches and parses a single Drive file by ID.
 * Simulated: reads from SIMULATED_FILES.
 */
export async function fetchDriveFile(
  fileId: string,
  _config: DriveConfig
): Promise<DriveResult<DriveFile>> {
  await sleep(SIMULATED_DELAY_MS)

  const file = SIMULATED_FILES[fileId]
  if (!file) {
    return {
      ok: false,
      error: { code: "NOT_FOUND", message: `File ${fileId} not found.`, fileId },
    }
  }

  return { ok: true, data: file }
}

// ─────────────────────────────────────────────
// FILE → MODULE MAPPING
// Converts a DriveFile's content to a BOPOSModule.data shape.
// ─────────────────────────────────────────────

/**
 * inferModuleSlot
 * Attempts to determine which module a Drive file belongs to
 * by matching the filename against known module labels.
 */
export function inferModuleSlot(file: DriveFile): ModuleSlot | null {
  const name = file.name.toLowerCase()

  const entry = Object.entries(MODULE_REGISTRY).find(([, meta]) => {
    const slug = meta.label.toLowerCase().replace(/[^a-z0-9]/g, "_")
    return name.includes(slug) || name.includes(`module_0${meta.slot}_`) || name.includes(`module_${String(meta.slot).padStart(2, "0")}_`)
  })

  return entry ? (entry[0] as ModuleSlot) : null
}

/**
 * driveFileToModule
 * Converts a fetched DriveFile into a BOPOSModule ready to merge
 * into a ClientProfile.
 */
export function driveFileToModule(
  file: DriveFile,
  slot: ModuleSlot
): BOPOSModule {
  const meta = MODULE_REGISTRY[slot]
  return {
    id:           slot,
    slot:         meta.slot,
    label:        meta.label,
    layer:        meta.layer,
    category:     meta.category,
    status:       "completed",
    completedAt:  file.modifiedTime,
    data:         typeof file.content === "object" ? (file.content as Record<string, unknown>) : {},
    driveFileId:  file.id,
    lastSyncedAt: new Date().toISOString().slice(0, 10),
  }
}

// ─────────────────────────────────────────────
// IMPORT ORCHESTRATOR
// ─────────────────────────────────────────────

export interface DriveImportResult {
  updatedProfile: ClientProfile
  imported: ModuleSlot[]
  skipped: string[]
  errors: DriveClientError[]
}

/**
 * importFromDrive
 * Full BYOC import: lists folder, fetches each file, maps to modules,
 * and merges into the ClientProfile.
 *
 * Usage:
 *   const result = await importFromDrive(config, profile)
 *   // Then run pullForwardAll(result.updatedProfile) to cascade data
 */
export async function importFromDrive(
  config: DriveConfig,
  profile: ClientProfile
): Promise<DriveImportResult> {
  const imported: ModuleSlot[] = []
  const skipped: string[] = []
  const errors: DriveClientError[] = []

  // 1. List files in root folder
  const listResult = await listDriveFiles(config)
  if (!listResult.ok) {
    return { updatedProfile: profile, imported, skipped, errors: [listResult.error] }
  }

  // Merge explicit module file map with discovered files
  const allFileIds = [
    ...new Set([
      ...listResult.data,
      ...Object.values(config.moduleFileMap).filter(Boolean) as string[],
    ]),
  ]

  let updatedModules = { ...profile.modules }

  // 2. Fetch each file and map to a module
  for (const fileId of allFileIds) {
    const fetchResult = await fetchDriveFile(fileId, config)

    if (!fetchResult.ok) {
      errors.push(fetchResult.error)
      continue
    }

    const file = fetchResult.data

    // Determine module slot: explicit map takes priority over inference
    const explicitSlot = Object.entries(config.moduleFileMap).find(
      ([, id]) => id === fileId
    )?.[0] as ModuleSlot | undefined

    const slot = explicitSlot ?? inferModuleSlot(file)

    if (!slot) {
      skipped.push(fileId)
      continue
    }

    updatedModules[slot] = driveFileToModule(file, slot)
    imported.push(slot)
  }

  const updatedProfile: ClientProfile = {
    ...profile,
    modules: updatedModules,
    driveFolderId: config.rootFolderId,
    updatedAt: new Date().toISOString().slice(0, 10),
  }

  return { updatedProfile, imported, skipped, errors }
}

/**
 * MPR Configuration — Master Process Roadmap
 * ============================================
 * Single source of truth for all MPR departments and their processes.
 *
 * TO ADD / RENAME A DEPARTMENT: edit the MPR_DEPARTMENTS array below.
 *
 * TO SWITCH OPERATIONS TO PHASED MODE (e.g. construction):
 *   1. Remove `processes` from the operations entry.
 *   2. Uncomment (or write) a `sections` array instead.
 *   The UI detects which mode is active and renders accordingly.
 */
import type { LucideIcon } from "lucide-react"
import { Megaphone, TrendingUp, Settings2, ClipboardList } from "lucide-react"

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
export type ProcessFrequency =
  | "Daily"
  | "Weekly"
  | "Bi-Weekly"
  | "Monthly"
  | "Quarterly"
  | "Annually"
  | "As Needed"

export interface MprProcess {
  id: string
  name: string
  frequency: ProcessFrequency
  owner: string
  documented: boolean
}

export interface MprSection {
  id: string
  label: string
  processes: MprProcess[]
}

export interface MprDepartment {
  id: string
  label: string
  description: string
  icon: LucideIcon
  // Use complete Tailwind class strings so the compiler includes them.
  iconBg: string       // bg-* for the icon container
  iconText: string     // text-* for the icon
  accentBorder: string // border-l-4 + border-l-* for the left strip
  badge: string        // bg-* + text-* for the process count pill
  // Exactly one of the following:
  processes?: MprProcess[]  // flat / single-column mode
  sections?: MprSection[]   // phased mode
}

// ─────────────────────────────────────────────
// HELPER — total process count regardless of mode
// ─────────────────────────────────────────────
export function processCount(dept: MprDepartment): number {
  if (dept.processes) return dept.processes.length
  if (dept.sections)  return dept.sections.reduce((n, s) => n + s.processes.length, 0)
  return 0
}

// ─────────────────────────────────────────────
// DEPARTMENT CONFIGURATION
// ─────────────────────────────────────────────
export const MPR_DEPARTMENTS: MprDepartment[] = [

  // ── 1. Marketing ─────────────────────────────────────────────
  {
    id: "marketing",
    label: "Marketing",
    description: "Everything that attracts and engages potential clients",
    icon: Megaphone,
    iconBg: "bg-orange-50",
    iconText: "text-bop-light-orange",
    accentBorder: "border-l-4 border-l-bop-light-orange",
    badge: "bg-orange-50 text-bop-dark-orange",
    processes: [
      { id: "m1", name: "Social Media Content",  frequency: "Weekly",    owner: "—", documented: false },
      { id: "m2", name: "Email Newsletter",       frequency: "Monthly",   owner: "—", documented: false },
      { id: "m3", name: "Lead Magnet Review",     frequency: "Quarterly", owner: "—", documented: false },
      { id: "m4", name: "Analytics Review",       frequency: "Monthly",   owner: "—", documented: false },
    ],
  },

  // ── 2. Sales ─────────────────────────────────────────────────
  {
    id: "sales",
    label: "Sales",
    description: "Everything from first conversation to signed agreement",
    icon: TrendingUp,
    iconBg: "bg-blue-50",
    iconText: "text-bop-light-blue",
    accentBorder: "border-l-4 border-l-bop-light-blue",
    badge: "bg-blue-50 text-bop-dark-blue",
    processes: [
      { id: "s1", name: "Lead Follow-Up",        frequency: "Daily",     owner: "—", documented: false },
      { id: "s2", name: "Proposal Preparation",  frequency: "As Needed", owner: "—", documented: false },
      { id: "s3", name: "CRM Update",            frequency: "Daily",     owner: "—", documented: false },
      { id: "s4", name: "Pipeline Review",        frequency: "Weekly",    owner: "—", documented: false },
    ],
  },

  // ── 3. Operations ─────────────────────────────────────────────
  // SINGLE MODE (default): one flat list of processes.
  //
  // To switch to PHASED MODE (e.g. construction phases):
  //   - Remove `processes` below.
  //   - Uncomment `sections` below.
  {
    id: "operations",
    label: "Operations",
    description: "Everything that delivers your product or service",
    icon: Settings2,
    iconBg: "bg-emerald-50",
    iconText: "text-emerald-600",
    accentBorder: "border-l-4 border-l-emerald-500",
    badge: "bg-emerald-50 text-emerald-700",

    // ── SINGLE COLUMN (default) ────────────────────────────────
    processes: [
      { id: "o1", name: "Project Kickoff",        frequency: "As Needed", owner: "—", documented: false },
      { id: "o2", name: "Quality Control Check",  frequency: "Weekly",    owner: "—", documented: false },
      { id: "o3", name: "Client Delivery Review", frequency: "Monthly",   owner: "—", documented: false },
      { id: "o4", name: "Vendor Communication",   frequency: "Weekly",    owner: "—", documented: false },
    ],

    // ── PHASED / SECTIONED (construction example) ──────────────
    // sections: [
    //   {
    //     id: "pre-construction",
    //     label: "Pre-Construction",
    //     processes: [
    //       { id: "op1", name: "Site Survey",           frequency: "As Needed", owner: "—", documented: false },
    //       { id: "op2", name: "Permit Application",    frequency: "As Needed", owner: "—", documented: false },
    //       { id: "op3", name: "Subcontractor Bidding", frequency: "As Needed", owner: "—", documented: false },
    //     ],
    //   },
    //   {
    //     id: "construction",
    //     label: "Construction",
    //     processes: [
    //       { id: "oc1", name: "Daily Site Check",  frequency: "Daily",     owner: "—", documented: false },
    //       { id: "oc2", name: "Safety Inspection", frequency: "Weekly",    owner: "—", documented: false },
    //       { id: "oc3", name: "Material Ordering", frequency: "As Needed", owner: "—", documented: false },
    //     ],
    //   },
    //   {
    //     id: "post-construction",
    //     label: "Post-Construction",
    //     processes: [
    //       { id: "opc1", name: "Punch List Walkthrough", frequency: "As Needed", owner: "—", documented: false },
    //       { id: "opc2", name: "Client Handover",        frequency: "As Needed", owner: "—", documented: false },
    //       { id: "opc3", name: "Warranty Documentation", frequency: "As Needed", owner: "—", documented: false },
    //     ],
    //   },
    // ],
  },

  // ── 4. Administration ─────────────────────────────────────────
  {
    id: "admin",
    label: "Administration",
    description: "Finance, HR, compliance, and behind-the-scenes ops",
    icon: ClipboardList,
    iconBg: "bg-violet-50",
    iconText: "text-violet-600",
    accentBorder: "border-l-4 border-l-violet-500",
    badge: "bg-violet-50 text-violet-700",
    processes: [
      { id: "a1", name: "Bookkeeping Reconciliation", frequency: "Monthly",   owner: "—", documented: false },
      { id: "a2", name: "Payroll Processing",         frequency: "Bi-Weekly", owner: "—", documented: false },
      { id: "a3", name: "Tax Filing",                 frequency: "Quarterly", owner: "—", documented: false },
      { id: "a4", name: "Insurance Review",           frequency: "Annually",  owner: "—", documented: false },
    ],
  },
]

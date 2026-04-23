/**
 * ============================================================
 * BOPOS — Business On Purpose Operating System
 * Global Configuration & Mothership Governance Rules
 * ============================================================
 *
 * This file is the single source of truth for all BOPOS
 * architectural constants, governance rules, and build filters.
 * Every component, module, and feature in this workspace must
 * be evaluated against these principles before being built.
 *
 * ------------------------------------------------------------
 * MOTHERSHIP GOVERNANCE RULES
 * ------------------------------------------------------------
 *
 * The Mothership stores the 24 Module Scripts and Templates
 * located in /src/mothership/modules/. These rules govern how
 * all modules are authored, extended, and consumed:
 *
 *  1. Every module is self-contained and independently operable.
 *  2. Modules expose a typed interface — no implicit data shapes.
 *  3. Modules never reach outside their own directory for state.
 *  4. The Mothership is read-only at runtime; mutations go through
 *     the Three-Layer architecture (OS → MPR → Anchor).
 *  5. All 24 modules must be registered in MOTHERSHIP_MODULES below.
 *
 * ------------------------------------------------------------
 * THE FOUR BUILD FILTERS
 * ------------------------------------------------------------
 * Before writing any new feature or component, validate it
 * against all four filters. If it fails any one, do not build it.
 *
 *  ✦ ONE-CLICK       — Can the user accomplish this in a single
 *                       interaction? Minimize friction at every step.
 *
 *  ✦ SCALABLE        — Will this hold up at 10x the current load,
 *                       users, or data? Design for growth from day one.
 *
 *  ✦ USE WHAT WE HAVE — Before adding a new dependency or building
 *                       a new abstraction, exhaust existing tools,
 *                       components, and patterns in this codebase.
 *
 *  ✦ CONTINUAL PROGRESS — Every change should move the system
 *                          measurably forward. No neutral commits.
 *
 * ------------------------------------------------------------
 * THREE-LAYER ARCHITECTURE
 * ------------------------------------------------------------
 *
 *  Layer 1 — THE OS (4 P's Dashboard)       /src/components/dashboard
 *    People · Process · Product · Profit
 *    The executive view. High-level health of the business.
 *
 *  Layer 2 — THE MPR (4 Core Systems)       /src/components/mpr
 *    Master Process Roadmap
 *    The operational engine. Tracks the four core business systems.
 *
 *  Layer 3 — THE ANCHOR (52-Week Rhythm)    /src/components/anchor
 *    The weekly execution cadence.
 *    Connects long-range planning to daily action.
 *
 * ============================================================
 */

// ------------------------------------------------------------
// App Identity
// ------------------------------------------------------------
export const APP_NAME = "BOPOS" as const;
export const APP_FULL_NAME = "Business On Purpose Operating System" as const;
export const APP_VERSION = "0.1.0" as const;

// ------------------------------------------------------------
// Navigation — The Three Primary Dashboards
// ------------------------------------------------------------
export const PRIMARY_DASHBOARDS = [
  {
    id: "os",
    label: "The Operating System",
    shortLabel: "OS",
    description: "4 P's — People, Process, Product, Profit",
    path: "/os",
    layer: 1,
  },
  {
    id: "mpr",
    label: "Master Process Roadmap",
    shortLabel: "MPR",
    description: "4 Core Systems driving execution",
    path: "/mpr",
    layer: 2,
  },
  {
    id: "anchor",
    label: "The Anchor",
    shortLabel: "Anchor",
    description: "52-Week Rhythm Engine",
    path: "/anchor",
    layer: 3,
  },
] as const;

// ------------------------------------------------------------
// The Four P's (OS Layer)
// ------------------------------------------------------------
export const FOUR_PS = ["People", "Process", "Product", "Profit"] as const;
export type FourP = (typeof FOUR_PS)[number];

// ------------------------------------------------------------
// The Four Build Filters
// ------------------------------------------------------------
export const BUILD_FILTERS = [
  {
    id: "one-click",
    label: "One-Click",
    description: "The user accomplishes this in a single interaction.",
  },
  {
    id: "scalable",
    label: "Scalable",
    description: "Holds up at 10x load, users, or data.",
  },
  {
    id: "use-what-we-have",
    label: "Use What We Have",
    description: "Exhaust existing tools before adding new ones.",
  },
  {
    id: "continual-progress",
    label: "Continual Progress",
    description: "Every change moves the system measurably forward.",
  },
] as const;

// ------------------------------------------------------------
// Mothership — 24 Module Registry
// Add all module IDs here as they are created in /src/mothership/modules/
// ------------------------------------------------------------
export const MOTHERSHIP_MODULES: string[] = [
  // Slots 1–24 to be populated as modules are built.
  // Example: "module-01-vision", "module-02-goals", etc.
];

export type ModuleId = (typeof MOTHERSHIP_MODULES)[number];

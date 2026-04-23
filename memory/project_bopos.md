---
name: BOPOS Project Context
description: Platform architecture, env config, Supabase project, module build state, Workbench Brain index, Gold Standard UI pattern
type: project
---

## Platform Architecture

**3 Dashboards:** OS (`/os`), MPR (`/mpr`), Anchor (`/anchor`) — all behind Supabase auth.
**3 Brains:** system instruction files in `/src/instructions/` (Workbench Brain) + module scripts via `/src/mothership/registry.ts`.
**The Tree:** 24 modules across 4 Ps (Purpose, People, Process, Profit).
**The Workbench:** `/workbench` — AI tool builder, Gold Standard split-pane, deployed tools go to `bop_custom_tools`.

## Supabase Project

- **Project ID:** `yhcyjjaeqezopcpyxccl`
- **URL:** `https://yhcyjjaeqezopcpyxccl.supabase.co`
- **Tables:** `bop_custom_tools`, `bop_tool_data` — both RLS scoped to `auth.uid()`
- **Mock mode:** active when keys are missing/invalid; app never crashes, login shows Developer Bypass button

## ENV Config (verified 2026-04-23)

- `.env`: `VITE_ANTHROPIC_API_KEY` (key A) + `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` ← all valid, properly `VITE_`-prefixed
- `.env.local`: `VITE_ANTHROPIC_API_KEY` (key B) ← takes priority over `.env` key
- **Status:** Both Supabase and Anthropic keys are live and correctly wired to the Workbench

## Workbench Brain — Indexed (DO NOT BUILD — await explicit command)

**Brain file:** `src/instructions/BOPOS_Workbench_Brain.md`

**Protocol the Brain enforces for ALL generated tools:**
- No `import` or `export` statements — sandboxed scope only
- Root component must be `function App() { ... }` (no export)
- Required metadata comment block: `// name:`, `// dashboard:`, `// description:`
- MUST use `useBOPStore('tool-id', initialState)` for any persistent data — never raw `useState` for data
- MUST render `<SyncIndicator status={syncStatus} />` in every tool
- Available globals: all React hooks, `useBOPStore`, `SyncIndicator`, all Lucide icons listed in Brain
- Wrap code in `<WORKBENCH_CODE>...</WORKBENCH_CODE>` tags + optional `<BOP_SCHEMA>` block

**BOP Color Standards (from Brain):**
- Navy: `#002855` (`bg-[#002855]`)
- Accent: `orange-600`
- Cards: `bg-white border border-gray-200 shadow-sm`
- Page bg: `bg-gray-50`
- Buttons: `rounded-md` (never pill-shaped)

**What the Workbench can build (categories, for future commands):**
- Financial calculators: profit margin, pricing, payroll, Profit First allocations
- KPI dashboards and scorecards with editable cells
- Process checklists and SOPs with completion tracking
- Client intake and CRM tracking
- 12-week goal trackers
- Team performance dashboards
- Marketing metrics and lead tracking
- Scheduling, rhythm planners, cadence boards

**Deploy targets:** `os` (4 Ps executive view) · `mpr` (process/workflow) · `anchor` (rhythm/scheduling)

## Gold Standard Split-Pane UI

**The Rule:** Every full-screen tool/module uses this exact layout:
- Left (38–40%): BOP Navy `#002855` — Coach/Architect panel
- Right (60–62%): Pure white — Canvas/content panel
- Navy header: `#002855` with module label + close button
- Sub-headers on each panel in slightly darker navy `#001933`
- Footer: action button (save/complete/deploy)

**Correct Navy colors:** `#002855` (panel bg), `#001933` (sub-header/input bg) — NOT slate-950/slate-900

**Implemented in:** WorkbenchPage, VisionStoryViewer, MissionStatementViewer

## Module Build State

- Module 01 — Vision Story: `VisionStoryViewer` — full coaching session ✓
- Module 02 — Mission Statement: `MissionStatementViewer` ✓
- Modules 3–27 — not yet built; launch via `ModuleViewer` (generic)

## Sidebar Structure (clean as of 2026-04-23)

- **Dashboards:** OS, MPR, Anchor
- **Build:** The Workbench
- No draft tools in sidebar. Weekly Scorecard removed.

## Known Issues Fixed

1. Supabase URL had `/rest/v1/` appended → fixed
2. `ANTHROPIC_API_KEY` lacked `VITE_` prefix → fixed
3. `ClientProfile` type missing import in OSDashboard → fixed
4. `App.tsx` had no `.catch()` on `getSession()` → fixed
5. `MissionStatementViewer` crashed if `profile.mission` undefined → fixed
6. Supabase invalid key error blocked app → fixed with mock mode + Developer Bypass button

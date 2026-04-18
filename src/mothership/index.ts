/**
 * ============================================================
 * BOPOS Mothership
 * ============================================================
 * Storage and registry for all 24 Module Scripts and Templates.
 *
 * Rules (see also /src/bopos-config.ts):
 *  - Each module lives in its own directory under /modules/
 *  - Modules are self-contained and independently operable
 *  - Modules expose a typed interface — no implicit data shapes
 *  - Modules never reach outside their own directory for state
 *
 * To add a new module:
 *  1. Create /src/mothership/modules/module-XX-<name>/index.ts
 *  2. Export a MothershipModule object from that file
 *  3. Import and register it in the modules array below
 *  4. Add the module ID to MOTHERSHIP_MODULES in /src/bopos-config.ts
 * ============================================================
 */

export interface MothershipModule {
  id: string
  slot: number          // 1–24
  label: string
  description: string
  layer: 1 | 2 | 3     // Which BOPOS layer this module belongs to
  status: "active" | "draft" | "planned"
}

// Module registry — populate as modules are built
export const modules: MothershipModule[] = [
  // Slots 1–24 will be registered here
]

// ─────────────────────────────────────────────
// Re-export the full BOPModule registry
// ─────────────────────────────────────────────
export type { BOPModule } from "./registry"
export {
  MODULE_REGISTRY,
  getModule,
  getDependents,
  getPrerequisiteChain,
  getAuthoredModules,
  getModulesByDepth,
} from "./registry"

export function getModuleBySlot(slot: number): MothershipModule | undefined {
  return modules.find((m) => m.slot === slot)
}

export function getModulesByLayer(layer: 1 | 2 | 3): MothershipModule[] {
  return modules.filter((m) => m.layer === layer)
}

/**
 * Process Section
 * Core Process Map, Quality Control, Customer Journey,
 * and the weekly/daily rhythm modules.
 */
import { ModuleCard } from "../shared/ModuleCard"
import type { ClientProfile } from "@/types/bopos"

interface ProcessSectionProps {
  profile: ClientProfile
  onLaunch?: (moduleId: number) => void
}

export function ProcessSection({ profile, onLaunch }: ProcessSectionProps) {
  const mpr          = profile.modules["module-07-master-process-roadmap"]
  const coreProcess  = profile.modules["module-13-core-process-map"]
  const quality      = profile.modules["module-14-quality-control"]
  const journey      = profile.modules["module-15-customer-journey"]
  const annualPlan   = profile.modules["module-20-annual-planning"]
  const quarterly    = profile.modules["module-21-quarterly-rocks"]

  return (
    <div className="flex flex-col gap-6">
      {/* Core process modules */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Core Systems
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ModuleCard
            moduleSlot="module-07-master-process-roadmap"
            title="Master Process Roadmap"
            description="Map every recurring process across Marketing, Sales, Operations, and Administration."
            status={mpr?.status ?? "not_started"}
            onLaunch={onLaunch}
          >
            {mpr?.data?.operationsStructure && (
              <Stat label="Ops Structure" value={mpr.data.operationsStructure as string} />
            )}
          </ModuleCard>

          <ModuleCard
            moduleSlot="module-13-core-process-map"
            title="Core Process Map"
            description="Document the 3–7 core processes that make your business run."
            status={coreProcess?.status ?? "not_started"}
            onLaunch={onLaunch}
          >
            {coreProcess?.data?.processes && (
              <ul className="flex flex-col gap-1">
                {(coreProcess.data.processes as string[]).map((p) => (
                  <li key={p} className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-primary/50 shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
            )}
          </ModuleCard>

          <ModuleCard
            moduleSlot="module-14-quality-control"
            title="Quality Control"
            description="Define what 'done right' looks like and how you verify it every time."
            status={quality?.status ?? "not_started"}
            onLaunch={onLaunch}
          />

          <ModuleCard
            moduleSlot="module-15-customer-journey"
            title="Customer Journey"
            description="Map every touchpoint from first contact to raving fan."
            status={journey?.status ?? "not_started"}
            onLaunch={onLaunch}
          />
        </div>
      </div>

      {/* Rhythm modules */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Execution Rhythms
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 items-stretch">
          <ModuleCard
            moduleSlot="module-20-annual-planning"
            title="Annual Planning"
            description="3 Annual Goals and a 52-week map to achieve them."
            status={annualPlan?.status ?? "not_started"}
            onLaunch={onLaunch}
          />
          <ModuleCard
            moduleSlot="module-21-quarterly-rocks"
            title="Quarterly Rocks"
            description="The 1–3 most important 90-day priorities. Nothing else moves until these are done."
            status={quarterly?.status ?? "not_started"}
            onLaunch={onLaunch}
          />
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium capitalize">{value}</span>
    </div>
  )
}

/**
 * Purpose Section — "The Why"
 * Vision Story, Mission Statement, Core Values.
 * Every unbuilt tool shows a Start Module button.
 * When Vision Story is complete the full VisionStoryPanel replaces the simple banner.
 */
import { Heart } from "lucide-react"
import { ModuleCard } from "../shared/ModuleCard"
import { VisionStoryPanel } from "./VisionStoryPanel"
import type { ClientProfile } from "@/types/bopos"

interface PurposeSectionProps {
  profile: ClientProfile
  onLaunch?: (moduleId: number) => void
}

export function PurposeSection({ profile, onLaunch }: PurposeSectionProps) {
  const vs      = profile.modules["module-01-vision-story"]
  const mission = profile.modules["module-02-mission-statement"]
  const cv      = profile.modules["module-03-core-values"]
  const vision  = profile.visionStory

  return (
    <div className="flex flex-col gap-6">
      {/* Full Vision Story panel — shown whenever a visionStatement exists */}
      {vision.visionStatement && (
        <VisionStoryPanel
          vision={vision}
          onReview={() => onLaunch?.(1)}
        />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 items-stretch">
        {/* Module 01 — Vision Story */}
        <ModuleCard
          moduleSlot="module-01-vision-story"
          title="Vision Story"
          description="Define where you're going and why — your 3-to-5-year financial and lifestyle target."
          status={vs?.status ?? "not_started"}
          onLaunch={onLaunch}
        />

        {/* Module 02 — Mission Statement */}
        <ModuleCard
          moduleSlot="module-02-mission-statement"
          title="Mission Statement"
          description="12 words or fewer — the 'we exist to...' declaration that answers why this business exists."
          status={mission?.status ?? "not_started"}
          onLaunch={onLaunch}
        >
          {mission?.data?.missionStatement && (
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-medium italic leading-snug text-foreground">
                "{mission.data.missionStatement as string}"
              </p>
              <p className="text-xs text-muted-foreground">
                {(mission.data.wordCount as number) ?? 0} words
              </p>
            </div>
          )}
        </ModuleCard>

        {/* Module 03 — Core Values */}
        <ModuleCard
          moduleSlot="module-03-core-values"
          title="Core Values"
          description="The 3–5 non-negotiable behaviors that define your culture — the curbs on the road."
          status={cv?.status ?? "not_started"}
          onLaunch={onLaunch}
        >
          {cv?.data?.values && (
            <ul className="flex flex-col gap-1">
              {(cv.data.values as Array<{ name: string; definition: string }>).map((v) => (
                <li key={v.name} className="flex items-start gap-1.5 text-xs">
                  <Heart className="h-3 w-3 shrink-0 text-rose-400 mt-0.5" />
                  <span><strong>{v.name}:</strong> {v.definition}</span>
                </li>
              ))}
            </ul>
          )}
        </ModuleCard>
      </div>
    </div>
  )
}

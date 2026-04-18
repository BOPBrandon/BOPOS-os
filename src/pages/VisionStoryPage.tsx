/**
 * VisionStoryPage — standalone route wrapper for VisionStoryViewer.
 * Route: /vision-story
 * On complete → /os (Purpose tab, module marked complete)
 * On close   → / (home)
 */
import { useNavigate } from "react-router-dom"
import { VisionStoryViewer } from "@/mothership/modules/module-01-vision-story/VisionStoryViewer"
import { useProfile } from "@/context/ProfileContext"
import { pullForward } from "@/services/databridge/pull-forward"
import { MODULE_REGISTRY } from "@/types/bopos"
import type { ModuleCompletionResult } from "@/components/dashboard/ModuleViewer"

export function VisionStoryPage() {
  const navigate              = useNavigate()
  const { profile, setProfile } = useProfile()

  function handleComplete(result: ModuleCompletionResult) {
    const { moduleSlot, moduleId, data } = result
    const meta = MODULE_REGISTRY[moduleSlot]

    setProfile((prev) => {
      const existing = prev.modules[moduleSlot]

      const updatedModule = {
        id:          moduleSlot,
        slot:        moduleId,
        label:       meta?.label    ?? moduleSlot,
        layer:       meta?.layer    ?? ("purpose" as const),
        category:    meta?.category ?? ("foundation" as const),
        ...existing,
        data,
        status:      "completed" as const,
        completedAt: new Date().toISOString().slice(0, 10),
      }

      const withModule = {
        ...prev,
        modules: { ...prev.modules, [moduleSlot]: updatedModule },
      }

      const { updatedProfile } = pullForward(moduleSlot, withModule)
      return updatedProfile
    })

    navigate("/os")
  }

  function handleClose() {
    navigate("/")
  }

  return (
    <VisionStoryViewer
      onComplete={handleComplete}
      onClose={handleClose}
    />
  )
}

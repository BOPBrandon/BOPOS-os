/**
 * MissionStatementPage — standalone route wrapper for MissionStatementViewer.
 * Route: /mission-statement
 * On complete → /os (Purpose tab, module marked complete)
 * On close   → /home
 */
import { useNavigate } from "react-router-dom"
import { MissionStatementViewer } from "@/mothership/modules/module-02-mission-statement/MissionStatementViewer"
import { useProfile } from "@/context/ProfileContext"
import { pullForward } from "@/services/databridge/pull-forward"
import { MODULE_REGISTRY } from "@/types/bopos"
import type { ModuleCompletionResult } from "@/components/dashboard/ModuleViewer"

export function MissionStatementPage() {
  const navigate                = useNavigate()
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
        layer:       meta?.layer    ?? (1 as const),
        category:    meta?.category ?? ("Purpose" as const),
        ...existing,
        data,
        status:      "completed" as const,
        completedAt: new Date().toISOString().slice(0, 10),
      }

      const withModule = {
        ...prev,
        mission: {
          missionStatement: (data.missionStatement as string) ?? (prev.mission?.missionStatement ?? ""),
          wordCount:        (data.wordCount as number)        ?? (prev.mission?.wordCount ?? 0),
          keywords:         (data.keywords as string[])       ?? (prev.mission?.keywords ?? []),
        },
        modules: { ...prev.modules, [moduleSlot]: updatedModule },
      }

      const { updatedProfile } = pullForward(moduleSlot, withModule)
      return updatedProfile
    })

    navigate("/os")
  }

  function handleClose() {
    navigate("/home")
  }

  // profile used via useProfile() above — reference here to silence unused lint
  void profile

  return (
    <MissionStatementViewer
      onComplete={handleComplete}
      onClose={handleClose}
    />
  )
}

export default MissionStatementPage

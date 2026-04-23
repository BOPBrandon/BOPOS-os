/**
 * People Section
 * Org Chart, Role Clarity → feeds RoleScorecard + DelegationRoadmap.
 * Hiring Roadmap and Onboarding shown as module cards.
 */
import { Users } from "lucide-react"
import { ModuleCard } from "../shared/ModuleCard"
import { RoleScorecard, DEMO_ROLES } from "../people/RoleScorecard"
import { DelegationRoadmap, DEMO_DELEGATION } from "../people/DelegationRoadmap"
import type { ClientProfile } from "@/types/bopos"

interface PeopleSectionProps {
  profile: ClientProfile
  onLaunch?: (moduleId: number) => void
}

export function PeopleSection({ profile, onLaunch }: PeopleSectionProps) {
  const teamMeetings = profile.modules["module-08-team-meetings"]
  const iws          = profile.modules["module-06-ideal-weekly-schedule"]
  const orgChart     = profile.modules["module-09-org-chart"]
  const roleClarity  = profile.modules["module-10-role-clarity"]
  const hiring       = profile.modules["module-11-hiring-roadmap"]
  const onboarding   = profile.modules["module-12-onboarding-system"]

  // Use real data from completed modules, fall back to demo
  const hasRoleData = orgChart?.status === "completed" && roleClarity?.status === "completed"
  const roles       = hasRoleData
    ? (roleClarity!.data!.roles as typeof DEMO_ROLES)
    : DEMO_ROLES
  const delegation  = hasRoleData
    ? roles.map((r) => ({ ...r, stage: "owner" as const }))
    : DEMO_DELEGATION

  return (
    <div className="flex flex-col gap-6">

      {/* Rhythms and schedule */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Rhythms &amp; Schedule
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 items-stretch">
          <ModuleCard
            moduleSlot="module-08-team-meetings"
            title="Team Meetings"
            description="Build the RPM meeting architecture — Repetition, Predictability, Meaning — so every meeting moves the business forward."
            status={teamMeetings?.status ?? "not_started"}
            onLaunch={onLaunch}
          >
            {teamMeetings?.data?.meetingDay && (
              <div className="flex flex-col gap-1">
                <Stat label="Meeting Day" value={`${teamMeetings.data.meetingDay as string}s`} />
                {teamMeetings.data.meetingTime && (
                  <Stat label="Time" value={teamMeetings.data.meetingTime as string} />
                )}
              </div>
            )}
          </ModuleCard>
          <ModuleCard
            moduleSlot="module-06-ideal-weekly-schedule"
            title="Ideal Weekly Schedule"
            description="Design the owner's calendar around Big Rocks — protected time for what only the owner can do."
            status={iws?.status ?? "not_started"}
            onLaunch={onLaunch}
          >
            {iws?.data?.immovableBlocks && (
              <Stat
                label="Immovable Blocks"
                value={`${(iws.data.immovableBlocks as unknown[]).length} locked`}
              />
            )}
          </ModuleCard>
        </div>
      </div>

      {/* Org and role modules */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Org &amp; Roles
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ModuleCard
            moduleSlot="module-09-org-chart"
            title="Org Chart"
            description="Map every seat in the business. Who does what and who owns what outcomes."
            status={orgChart?.status ?? "not_started"}
            onLaunch={onLaunch}
          />
          <ModuleCard
            moduleSlot="module-10-role-clarity"
            title="Role Clarity"
            description="Define accountabilities, success metrics, and fit scores for every seat."
            status={roleClarity?.status ?? "not_started"}
            onLaunch={onLaunch}
          />
          <ModuleCard
            moduleSlot="module-11-hiring-roadmap"
            title="Hiring Roadmap"
            description="The sequence for filling open seats based on delegation priority."
            status={hiring?.status ?? "not_started"}
            onLaunch={onLaunch}
          />
          <ModuleCard
            moduleSlot="module-12-onboarding-system"
            title="Onboarding System"
            description="A repeatable process for getting new hires to full speed in 90 days."
            status={onboarding?.status ?? "not_started"}
            onLaunch={onLaunch}
          />
        </div>
      </div>

      {/* Role Scorecard */}
      <section>
        <SectionHeader
          icon={<Users className="h-4 w-4" />}
          title="Role Scorecard"
          subtitle="Every seat, who fills it, and how well it fits"
          isDemo={!hasRoleData}
        />
        <RoleScorecard roles={roles} />
      </section>

      {/* Delegation Roadmap */}
      <section>
        <SectionHeader
          icon={<Users className="h-4 w-4" />}
          title="Delegation Roadmap"
          subtitle="Moving seats from Owner → Training → Delegated → Systemized"
          isDemo={!hasRoleData}
        />
        <DelegationRoadmap items={delegation} />
      </section>
    </div>
  )
}

function SectionHeader({
  icon,
  title,
  subtitle,
  isDemo,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  isDemo: boolean
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {isDemo && (
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
          Demo data — complete Org Chart + Role Clarity to populate
        </span>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

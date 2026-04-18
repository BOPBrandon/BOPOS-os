import { CalendarDays } from "lucide-react"

const CURRENT_WEEK = Math.ceil(
  (new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) /
    (7 * 24 * 60 * 60 * 1000)
)

/**
 * Layer 3 — The Anchor: 52-Week Rhythm Engine
 * Connects long-range planning to daily action via weekly cadence.
 */
export function AnchorDashboard() {
  return (
    <div className="flex flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">The Anchor</h1>
        <p className="text-muted-foreground mt-1">52-Week Rhythm Engine — Weekly execution cadence</p>
      </div>

      {/* Current week callout */}
      <div className="flex items-center gap-4 rounded-lg border border-border bg-card p-5 shadow-sm">
        <CalendarDays className="h-6 w-6 shrink-0 text-primary" />
        <div>
          <p className="text-sm font-semibold">Current Week</p>
          <p className="text-3xl font-bold leading-none mt-1">
            Week {CURRENT_WEEK}
            <span className="ml-2 text-sm font-normal text-muted-foreground">of 52</span>
          </p>
        </div>
      </div>

      {/* 52-week grid */}
      <div>
        <p className="mb-3 text-sm font-medium">Year at a Glance</p>
        <div className="grid grid-cols-13 gap-1.5" style={{ gridTemplateColumns: "repeat(13, 1fr)" }}>
          {Array.from({ length: 52 }, (_, i) => {
            const week = i + 1
            const isPast = week < CURRENT_WEEK
            const isCurrent = week === CURRENT_WEEK
            return (
              <div
                key={week}
                title={`Week ${week}`}
                className={[
                  "flex h-7 w-full items-center justify-center rounded text-[10px] font-medium cursor-default select-none",
                  isCurrent
                    ? "bg-primary text-primary-foreground"
                    : isPast
                    ? "bg-muted text-muted-foreground"
                    : "border border-border text-muted-foreground",
                ].join(" ")}
              >
                {week}
              </div>
            )
          })}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Layer 3 of 3 — Connect your weekly rhythm data to populate the cadence engine.
      </p>
    </div>
  )
}

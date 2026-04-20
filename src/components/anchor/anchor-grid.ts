import type { FrequencyTier } from "./anchor-types"

export const MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]

export interface GridWeek {
  index: number        // 0-based (0–51)
  weekNum: number      // 1-based (1–52)
  start: Date
  end: Date
  monthIndex: number   // 0–11 (month of start date)
  dayLabel: string     // "1", "8", "15"…
  rangeLabel: string   // "Jan 1", "Jan 8"…
  isCurrentWeek: boolean
}

export interface MonthSpan {
  monthIndex: number
  label: string          // "Jan"
  firstWeekIndex: number
  weekCount: number
}

export function buildWeekGrid(year: number): { weeks: GridWeek[]; monthSpans: MonthSpan[] } {
  const today = new Date()
  const isCurrentYear = today.getFullYear() === year
  // Day-of-year 1-indexed
  const todayDayOfYear = isCurrentYear
    ? Math.floor((today.getTime() - new Date(year, 0, 0).getTime()) / 86400000)
    : -1
  const currentWeekIndex = isCurrentYear
    ? Math.min(Math.floor((todayDayOfYear - 1) / 7), 51)
    : -1

  const weeks: GridWeek[] = []
  const monthMap = new Map<number, MonthSpan>()

  for (let i = 0; i < 52; i++) {
    const start = new Date(year, 0, 1 + i * 7)
    const end   = new Date(year, 0, 7 + i * 7)
    // Clamp the last week to Dec 31
    if (end.getFullYear() > year) { end.setFullYear(year); end.setMonth(11); end.setDate(31) }

    const monthIndex = start.getMonth()
    if (!monthMap.has(monthIndex)) {
      monthMap.set(monthIndex, {
        monthIndex,
        label: MONTH_ABBR[monthIndex],
        firstWeekIndex: i,
        weekCount: 0,
      })
    }
    monthMap.get(monthIndex)!.weekCount++

    weeks.push({
      index: i,
      weekNum: i + 1,
      start,
      end,
      monthIndex,
      dayLabel: String(start.getDate()),
      rangeLabel: `${MONTH_ABBR[monthIndex]} ${start.getDate()}`,
      isCurrentWeek: i === currentWeekIndex,
    })
  }

  return { weeks, monthSpans: Array.from(monthMap.values()) }
}

/** Returns true when the given rhythm frequency fires during the week beginning on weekStart. */
export function firesInWeek(
  frequency: FrequencyTier,
  weekStart: Date,
  activeMonths?: number[],
): boolean {
  const month = weekStart.getMonth() + 1       // 1-indexed
  const isFirstWeekOfMonth = weekStart.getDate() <= 7

  switch (frequency) {
    case "daily":
    case "weekly":
      return true
    case "monthly":
      return isFirstWeekOfMonth
    case "quarterly":
      return [1, 4, 7, 10].includes(month) && isFirstWeekOfMonth
    case "semi-annually":
      if (activeMonths && activeMonths.length > 0) {
        return activeMonths.includes(month) && isFirstWeekOfMonth
      }
      return [2, 4, 6, 8, 10, 12].includes(month) && isFirstWeekOfMonth
    case "annually":
      return month === 1 && isFirstWeekOfMonth
    default:
      return false
  }
}

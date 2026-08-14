const MILLISECONDS_PER_DAY = 86_400_000

type CalendarDate = {
  year: number
  month: number
  day: number
}

function calendarDateInTimeZone(date: Date, timeZone: string): CalendarDate {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  }
}

/**
 * Selects one item per local calendar day. Using the calendar-day number
 * instead of a random hash guarantees a different index on consecutive days
 * whenever the collection contains more than one item.
 */
export function dailyRotationIndex(
  itemCount: number,
  date = new Date(),
  timeZone = 'Europe/London',
  offset = 0,
): number {
  if (!Number.isInteger(itemCount) || itemCount <= 0) return -1

  const { year, month, day } = calendarDateInTimeZone(date, timeZone)
  const calendarDay = Math.floor(Date.UTC(year, month - 1, day) / MILLISECONDS_PER_DAY)
  return ((calendarDay + offset) % itemCount + itemCount) % itemCount
}

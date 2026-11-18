// Dates in Troy's time zone. Seasons, game days and month headings all turn
// over at local midnight, and naming the zone keeps the server and the browser
// in agreement.
export const TROY_TIME_ZONE = 'America/New_York'

const dayFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: TROY_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** YYYY-MM-DD in Troy */
export const troyDay = (date: Date): string => dayFormat.format(date)

/** YYYY-MM in Troy */
export const troyMonth = (date: Date): string => troyDay(date).slice(0, 7)

/** Local calendar day as `YYYY-MM-DD`, so "today" turns over at the user's midnight, not UTC's. */
export function toDateKey(now: number = Date.now()): string {
  const d = new Date(now)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

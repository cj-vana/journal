export function parseDateInput(value: string): Date | null {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function parseDateOnlyEnd(value: string): Date | null {
  const date = parseDateInput(value)
  if (!date) return null

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    // parseDateInput treats a date-only string as UTC midnight, so set the end
    // boundary in UTC too — using local setHours would shift the instant by the
    // server's timezone offset and break the range filter off-server-TZ.
    date.setUTCHours(23, 59, 59, 999)
  }

  return date
}

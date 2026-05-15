export function parseDateInput(value: string): Date | null {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function parseDateOnlyEnd(value: string): Date | null {
  const date = parseDateInput(value)
  if (!date) return null

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    date.setHours(23, 59, 59, 999)
  }

  return date
}

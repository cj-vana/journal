import { timingSafeEqual } from 'crypto'

export function isDebugMode(): boolean {
  // Never allow debug mode in production
  if (process.env.NODE_ENV === 'production') return false
  return process.env.ENABLE_DEBUG_PROFILE === 'true'
}

export function validateDebugKey(key: string): boolean {
  const expected = process.env.DEBUG_KEY || ''
  if (!expected || key.length !== expected.length) return false
  try {
    return timingSafeEqual(Buffer.from(key), Buffer.from(expected))
  } catch {
    return false
  }
}

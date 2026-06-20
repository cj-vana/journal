import crypto from 'crypto'
import { eventMeta } from './events'

export function generateEventCode(): string {
  return crypto.randomBytes(8).toString('hex')
}

// Shower events inherit the child's configured gender theme; everything else uses
// the type's default theme.
export function eventThemeFor(type: string, gender: string): string {
  return type === 'shower' ? gender || 'neutral' : eventMeta(type).theme
}

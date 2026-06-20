// Pure, client-safe helpers for guestbook events. No node-only imports here —
// this module is imported by client components.

export type EventType = 'shower' | 'birthday' | 'anniversary' | 'party' | 'other'

export const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: 'shower', label: 'Baby Shower' },
  { value: 'birthday', label: 'Birthday' },
  { value: 'anniversary', label: 'Anniversary' },
  { value: 'party', label: 'Party' },
  { value: 'other', label: 'Other' },
]

const TYPE_META: Record<EventType, { emoji: string; theme: string; verb: string }> = {
  shower: { emoji: '👶', theme: 'neutral', verb: 'Leave a wish for' },
  birthday: { emoji: '🎂', theme: 'birthday', verb: 'Wish a happy birthday to' },
  anniversary: { emoji: '💕', theme: 'anniversary', verb: 'Celebrate' },
  party: { emoji: '🎉', theme: 'party', verb: 'Leave a message for' },
  other: { emoji: '💛', theme: 'warm', verb: 'Leave a message for' },
}

export function isEventType(value: string): value is EventType {
  return Object.prototype.hasOwnProperty.call(TYPE_META, value)
}

export function eventMeta(type: string): { emoji: string; theme: string; verb: string } {
  return TYPE_META[isEventType(type) ? type : 'other']
}

export function eventHeading(type: string, honoree: string): string {
  return `${eventMeta(type).verb} ${honoree}`
}

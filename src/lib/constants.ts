export const MAX_UPLOAD_SIZE = parseInt(process.env.MAX_UPLOAD_SIZE_MB || '20') * 1024 * 1024

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
export const ALLOWED_AUDIO_TYPES = ['audio/webm', 'audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/ogg']

export const MILESTONE_CATEGORIES = [
  { value: 'physical', label: 'Physical', color: '#8CB88C' },
  { value: 'language', label: 'Language', color: '#7BB4E8' },
  { value: 'social', label: 'Social', color: '#F4A0A8' },
  { value: 'cognitive', label: 'Cognitive', color: '#B08CE0' },
] as const

export const MILESTONE_SUGGESTIONS = [
  'First Smile', 'First Laugh', 'First Words', 'First Steps', 'First Tooth',
  'First Solid Food', 'First Crawl', 'First Day of School', 'First Friend',
  'First Drawing', 'First Bike Ride', 'Slept Through the Night', 'First Haircut',
  'First Bath', 'First Roll Over', 'First Sit Up', 'First Wave', 'First Clap',
] as const

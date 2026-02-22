export function isDebugMode(): boolean {
  return process.env.ENABLE_DEBUG_PROFILE === 'true'
}

export function validateDebugKey(key: string): boolean {
  return key === process.env.DEBUG_KEY
}

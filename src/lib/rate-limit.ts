type Bucket = {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

// Hard cap on distinct buckets so a flood of unique keys (e.g. spoofed
// x-forwarded-for values or random codes) cannot grow the Map without bound.
const MAX_BUCKETS = 10_000
let lastSweep = 0

function sweep(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
  lastSweep = now
}

export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()

  // Evict expired buckets at most ~once per minute to keep this amortized O(1).
  if (now - lastSweep > 60_000) sweep(now)

  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt <= now) {
    // Backstop against a burst of distinct keys within a single window.
    if (buckets.size >= MAX_BUCKETS) {
      sweep(now)
      if (buckets.size >= MAX_BUCKETS) return false // saturated: fail closed
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (bucket.count >= limit) {
    return false
  }

  bucket.count += 1
  return true
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import DOMPurify from 'isomorphic-dompurify'
import { checkRateLimit } from '@/lib/rate-limit'

const messageSchema = z.object({
  code: z.string().min(1).max(64),
  guestName: z.string().min(1).max(100),
  message: z.string().min(1).max(2000),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = messageSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })

    const { code, guestName, message } = parsed.data
    const forwardedFor = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    const clientIp = forwardedFor || req.headers.get('x-real-ip') || 'unknown'

    // Per-IP best-effort limit. clientIp comes from x-forwarded-for, which is
    // spoofable when no header-sanitizing proxy fronts the app, so it is backed
    // by an IP-independent global cap per guestbook below.
    if (!checkRateLimit(`event:${code}:${clientIp}`, 10, 60 * 60 * 1000)) {
      return NextResponse.json({ error: 'Too many submissions' }, { status: 429 })
    }
    // Global cap per guestbook code, independent of (spoofable) client IP, so
    // header rotation cannot mint unlimited submissions. Sized well above
    // realistic legitimate guest traffic.
    if (!checkRateLimit(`event-global:${code}`, 60, 60 * 60 * 1000)) {
      return NextResponse.json({ error: 'Too many submissions' }, { status: 429 })
    }

    const event = await prisma.event.findUnique({ where: { code }, select: { id: true, enabled: true } })
    if (!event || !event.enabled) {
      return NextResponse.json({ error: 'This guestbook is not active' }, { status: 403 })
    }

    const cleanName = DOMPurify.sanitize(guestName, { ALLOWED_TAGS: [] }).trim()
    const cleanMessage = DOMPurify.sanitize(message, { ALLOWED_TAGS: [] }).trim()
    if (!cleanName || !cleanMessage) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })

    const created = await prisma.guestMessage.create({
      data: { guestName: cleanName, message: cleanMessage, eventId: event.id },
      select: { id: true, createdAt: true },
    })
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error('Event message POST error:', error)
    return NextResponse.json({ error: 'Failed to submit message' }, { status: 500 })
  }
}

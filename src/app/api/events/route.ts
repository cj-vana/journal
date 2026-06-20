import { NextRequest, NextResponse } from 'next/server'
import { apiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { isEventType } from '@/lib/events'
import { generateEventCode } from '@/lib/event-server'

async function requireAdmin() {
  const session = await apiAuth()
  if (!session?.user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (session.user.role !== 'admin') return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return { session }
}

export async function GET() {
  try {
    const gate = await requireAdmin()
    if (gate.error) return gate.error

    const events = await prisma.event.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { messages: true } } },
    })
    return NextResponse.json(events)
  } catch (error) {
    console.error('Events GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
  }
}

const createSchema = z.object({
  type: z.string().refine(isEventType, 'Invalid type'),
  title: z.string().trim().min(1).max(120),
  honoreeName: z.string().trim().max(100).optional(),
  eventDate: z.string().optional(),
  welcomeMessage: z.string().trim().max(280).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const gate = await requireAdmin()
    if (gate.error) return gate.error

    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }
    const { type, title, honoreeName, eventDate, welcomeMessage } = parsed.data

    let parsedDate: Date | null = null
    if (eventDate) {
      const d = new Date(eventDate)
      if (Number.isNaN(d.getTime())) return NextResponse.json({ error: 'Invalid eventDate' }, { status: 400 })
      parsedDate = d
    }

    const event = await prisma.event.create({
      data: {
        code: generateEventCode(),
        type,
        title,
        honoreeName: honoreeName || null,
        eventDate: parsedDate,
        welcomeMessage: welcomeMessage || null,
        enabled: true,
        createdById: gate.session.user.id,
      },
      include: { _count: { select: { messages: true } } },
    })
    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    console.error('Events POST error:', error)
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })
  }
}

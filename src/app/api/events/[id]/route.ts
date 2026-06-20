import { NextRequest, NextResponse } from 'next/server'
import { apiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { isEventType } from '@/lib/events'
import { generateEventCode } from '@/lib/event-server'

type RouteContext = { params: Promise<{ id: string }> }

const updateSchema = z.object({
  type: z.string().refine(isEventType, 'Invalid type').optional(),
  title: z.string().trim().min(1).max(120).optional(),
  honoreeName: z.string().trim().max(100).nullable().optional(),
  eventDate: z.string().nullable().optional(),
  welcomeMessage: z.string().trim().max(280).nullable().optional(),
  enabled: z.boolean().optional(),
  regenerateCode: z.boolean().optional(),
})

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const session = await apiAuth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await context.params
    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })

    const d = parsed.data
    const data: Prisma.EventUpdateInput = {}
    if (d.type !== undefined) data.type = d.type
    if (d.title !== undefined) data.title = d.title
    if (d.honoreeName !== undefined) data.honoreeName = d.honoreeName || null
    if (d.welcomeMessage !== undefined) data.welcomeMessage = d.welcomeMessage || null
    if (d.enabled !== undefined) data.enabled = d.enabled
    if (d.eventDate !== undefined) {
      if (d.eventDate === null || d.eventDate === '') {
        data.eventDate = null
      } else {
        const date = new Date(d.eventDate)
        if (Number.isNaN(date.getTime())) return NextResponse.json({ error: 'Invalid eventDate' }, { status: 400 })
        data.eventDate = date
      }
    }
    if (d.regenerateCode) data.code = generateEventCode()

    const event = await prisma.event.update({
      where: { id },
      data,
      include: { _count: { select: { messages: true } } },
    })
    return NextResponse.json(event)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }
    console.error('Event PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const session = await apiAuth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await context.params
    await prisma.event.delete({ where: { id } }) // cascades GuestMessage rows
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }
    console.error('Event DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 })
  }
}

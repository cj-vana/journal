import { NextResponse } from 'next/server'
import { apiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_req: Request, context: RouteContext) {
  try {
    const session = await apiAuth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await context.params
    const messages = await prisma.guestMessage.findMany({
      where: { eventId: id },
      orderBy: { createdAt: 'desc' },
      take: 500,
    })
    return NextResponse.json(messages)
  } catch (error) {
    console.error('Event messages GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}

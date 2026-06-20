import { NextRequest, NextResponse } from 'next/server'
import { apiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

type RouteContext = { params: Promise<{ id: string }> }

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const session = await apiAuth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await context.params
    await prisma.guestMessage.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }
    console.error('Event message DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 })
  }
}

export async function POST(_req: NextRequest, context: RouteContext) {
  try {
    const session = await apiAuth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await context.params
    const { contentToHtml } = await import('@/lib/tiptap-html-extensions')

    const entry = await prisma.$transaction(async (tx) => {
      const guestMessage = await tx.guestMessage.findUnique({
        where: { id },
        include: { event: { select: { title: true } } },
      })
      if (!guestMessage) throw new Error('NOT_FOUND')

      const tiptapDoc = {
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: `A message from ${guestMessage.guestName}:` }] },
          { type: 'blockquote', content: [{ type: 'paragraph', content: [{ type: 'text', text: guestMessage.message }] }] },
        ],
      }
      const contentStr = JSON.stringify(tiptapDoc)
      const eventTitle = guestMessage.event?.title ?? 'Guestbook'

      const created = await tx.entry.create({
        data: {
          title: `${eventTitle}: message from ${guestMessage.guestName}`,
          content: contentStr,
          contentHtml: contentToHtml(contentStr),
          authorId: session.user.id,
          entryDate: guestMessage.createdAt,
        },
      })

      const promoted = await tx.guestMessage.updateMany({
        where: { id, promotedToEntryId: null },
        data: { promotedToEntryId: created.id },
      })
      if (promoted.count === 0) throw new Error('ALREADY_PROMOTED')
      return created
    })

    return NextResponse.json({ entryId: entry.id })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'NOT_FOUND') return NextResponse.json({ error: 'Message not found' }, { status: 404 })
      if (error.message === 'ALREADY_PROMOTED') return NextResponse.json({ error: 'Already promoted' }, { status: 409 })
    }
    console.error('Event message promote error:', error)
    return NextResponse.json({ error: 'Failed to promote message' }, { status: 500 })
  }
}

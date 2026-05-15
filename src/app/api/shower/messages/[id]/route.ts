import { NextRequest, NextResponse } from 'next/server'
import { apiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await apiAuth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    await prisma.guestMessage.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }
    console.error('Shower message DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 })
  }
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await apiAuth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    const { contentToHtml } = await import('@/lib/tiptap-html-extensions')

    const entry = await prisma.$transaction(async (tx) => {
      const guestMessage = await tx.guestMessage.findUnique({ where: { id } })
      if (!guestMessage) {
        throw new Error('NOT_FOUND')
      }

      const tiptapDoc = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: `A wish from ${guestMessage.guestName}:` },
            ],
          },
          {
            type: 'blockquote',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: guestMessage.message }],
              },
            ],
          },
        ],
      }

      const contentStr = JSON.stringify(tiptapDoc)
      const contentHtml = contentToHtml(contentStr)

      const created = await tx.entry.create({
        data: {
          title: `Baby Shower Wish from ${guestMessage.guestName}`,
          content: contentStr,
          contentHtml,
          authorId: session.user.id,
          entryDate: guestMessage.createdAt,
        },
      })

      const promoted = await tx.guestMessage.updateMany({
        where: { id, promotedToEntryId: null },
        data: { promotedToEntryId: created.id },
      })
      if (promoted.count === 0) {
        throw new Error('ALREADY_PROMOTED')
      }

      return created
    })

    return NextResponse.json({ entryId: entry.id })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'NOT_FOUND') {
        return NextResponse.json({ error: 'Message not found' }, { status: 404 })
      }
      if (error.message === 'ALREADY_PROMOTED') {
        return NextResponse.json({ error: 'Already promoted' }, { status: 409 })
      }
    }
    console.error('Shower message promote error:', error)
    return NextResponse.json({ error: 'Failed to promote message' }, { status: 500 })
  }
}

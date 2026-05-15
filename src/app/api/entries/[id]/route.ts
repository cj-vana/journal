import { NextRequest, NextResponse } from 'next/server'
import { apiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { contentToHtml } from '@/lib/tiptap-html-extensions'
import { parseDateInput } from '@/lib/dates'
import path from 'path'
import fs from 'fs/promises'

const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(/*turbopackIgnore: true*/ process.cwd(), 'data', 'uploads')

const updateEntrySchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  entryDate: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
  mediaIds: z.array(z.string()).optional(),
  isDraft: z.boolean().optional(),
})

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const session = await apiAuth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params

    const entry = await prisma.entry.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, name: true, avatarColor: true } },
        tags: { include: { tag: true } },
        media: true,
      },
    })

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    // Non-admin users can only view their own entries
    if (entry.authorId !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    return NextResponse.json(entry)
  } catch (error) {
    console.error('Entry GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch entry' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const session = await apiAuth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params
    const body = await req.json()
    const parsed = updateEntrySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }

    const existing = await prisma.entry.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    // IDOR protection: only author or admin can edit
    const userRole = session.user.role
    if (existing.authorId !== session.user.id && userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { title, content, entryDate, tagIds, mediaIds, isDraft } = parsed.data

    const updateData: Record<string, unknown> = {}
    if (title !== undefined) updateData.title = title || null
    if (content !== undefined) {
      updateData.content = content
      updateData.contentHtml = contentToHtml(content)
    }
    if (entryDate !== undefined) {
      const parsedEntryDate = parseDateInput(entryDate)
      if (!parsedEntryDate) return NextResponse.json({ error: 'Invalid entryDate' }, { status: 400 })
      updateData.entryDate = parsedEntryDate
    }
    if (isDraft !== undefined) updateData.isDraft = isDraft

    const fullEntry = await prisma.$transaction(async (tx) => {
      const entry = await tx.entry.update({
        where: { id },
        data: updateData,
      })

      // Update tags
      if (tagIds !== undefined) {
        await tx.entryTag.deleteMany({ where: { entryId: id } })
        if (tagIds.length > 0) {
          await tx.entryTag.createMany({
            data: tagIds.map((tagId) => ({ entryId: id, tagId })),
          })
        }
      }

      // Update media links
      if (mediaIds !== undefined) {
        const existingMediaIds = await tx.media.findMany({
          where: { entryId: id, id: { in: mediaIds } },
          select: { id: true },
        })
        const retainedIds = new Set(existingMediaIds.map((media) => media.id))

        await tx.media.updateMany({
          where: { entryId: id, id: { notIn: [...retainedIds] } },
          data: { entryId: null },
        })
        if (mediaIds.length > 0) {
          await tx.media.updateMany({
            where: {
              id: { in: mediaIds },
              OR: [
                { id: { in: [...retainedIds] } },
                { entryId: null, uploadedBy: session.user.id! },
                { entryId: null, uploadedBy: null },
              ],
            },
            data: { entryId: id },
          })
        }
      }

      return tx.entry.findUnique({
        where: { id: entry.id },
        include: {
          author: { select: { id: true, name: true, avatarColor: true } },
          tags: { include: { tag: true } },
          media: true,
        },
      })
    })

    return NextResponse.json(fullEntry)
  } catch (error) {
    console.error('Entry PUT error:', error)
    return NextResponse.json({ error: 'Failed to update entry' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const session = await apiAuth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params

    const entry = await prisma.entry.findUnique({
      where: { id },
      include: { media: true },
    })

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    // IDOR protection: only author or admin can delete
    const userRole = session.user.role
    if (entry.authorId !== session.user.id && userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete media files from disk in parallel (with path traversal protection)
    await Promise.all(entry.media.map(async (media) => {
      const filePath = path.resolve(UPLOAD_DIR, media.path)
      if (!filePath.startsWith(UPLOAD_DIR + path.sep)) return
      await fs.unlink(filePath).catch(() => {})
      if (media.type === 'image') {
        const thumbPath = filePath.replace('.webp', '_thumb.webp')
        if (thumbPath.startsWith(UPLOAD_DIR + path.sep)) {
          await fs.unlink(thumbPath).catch(() => {})
        }
      }
    }))

    // Cascade will handle EntryTag and Media records
    await prisma.entry.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Entry DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 })
  }
}

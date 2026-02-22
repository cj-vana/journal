import { NextRequest, NextResponse } from 'next/server'
import { apiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { contentToHtml } from '@/lib/tiptap-html-extensions'
import path from 'path'
import fs from 'fs/promises'

const UPLOAD_DIR = process.env.UPLOAD_DIR || './data/uploads'

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
    if (entryDate !== undefined) updateData.entryDate = new Date(entryDate)
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
        // Unlink old media
        await tx.media.updateMany({
          where: { entryId: id },
          data: { entryId: null },
        })
        // Link new media (only media uploaded by this user or already linked to this entry)
        if (mediaIds.length > 0) {
          await tx.media.updateMany({
            where: {
              id: { in: mediaIds },
              OR: [
                { entryId: null, uploadedBy: session.user.id! },
                { entryId: null, uploadedBy: null },
                { entryId: id },
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
    const resolvedUploadDir = path.resolve(UPLOAD_DIR)
    await Promise.all(entry.media.map(async (media) => {
      const filePath = path.resolve(path.join(UPLOAD_DIR, media.path))
      if (!filePath.startsWith(resolvedUploadDir + path.sep)) return
      await fs.unlink(filePath).catch(() => {})
      if (media.type === 'image') {
        const thumbPath = filePath.replace('.webp', '_thumb.webp')
        if (thumbPath.startsWith(resolvedUploadDir + path.sep)) {
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

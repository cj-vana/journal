import { NextRequest, NextResponse } from 'next/server'
import { apiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { generateHTML } from '@tiptap/html'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Color from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import HorizontalRule from '@tiptap/extension-horizontal-rule'
import Blockquote from '@tiptap/extension-blockquote'
import path from 'path'
import fs from 'fs/promises'

const UPLOAD_DIR = process.env.UPLOAD_DIR || './data/uploads'

const htmlExtensions = [
  StarterKit.configure({
    horizontalRule: false,
    blockquote: false,
  }),
  Image,
  Color,
  TextStyle,
  Underline,
  Link,
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  HorizontalRule,
  Blockquote,
]

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

    if (entry.isDraft && entry.authorId !== session.user.id && session.user.role !== 'admin') {
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
      return NextResponse.json(
        { error: 'Invalid data', details: parsed.error.issues },
        { status: 400 }
      )
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
      try {
        const json = JSON.parse(content)
        updateData.contentHtml = generateHTML(json, htmlExtensions)
      } catch {
        updateData.contentHtml = `<p>${content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`
      }
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
        // Link new media
        if (mediaIds.length > 0) {
          await tx.media.updateMany({
            where: { id: { in: mediaIds } },
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

    // Delete media files from disk
    for (const media of entry.media) {
      try {
        const filePath = path.join(UPLOAD_DIR, media.path)
        await fs.unlink(filePath)
        // Delete thumbnail if image
        if (media.type === 'image') {
          const thumbPath = filePath.replace('.webp', '_thumb.webp')
          await fs.unlink(thumbPath).catch(() => {})
        }
      } catch {
        // File may already be deleted
      }
    }

    // Cascade will handle EntryTag and Media records
    await prisma.entry.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Entry DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 })
  }
}

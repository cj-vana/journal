import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
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

const createEntrySchema = z.object({
  title: z.string().optional(),
  content: z.string(),
  entryDate: z.string(),
  tagIds: z.array(z.string()).optional(),
  mediaIds: z.array(z.string()).optional(),
  isDraft: z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const authorId = searchParams.get('authorId')
    const tagId = searchParams.get('tagId')
    const search = searchParams.get('search')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const sort = searchParams.get('sort') || 'newest'
    const drafts = searchParams.get('drafts')

    const where: Record<string, unknown> = {}

    if (authorId) where.authorId = authorId
    if (drafts === 'true') {
      where.isDraft = true
    } else if (drafts === 'false') {
      where.isDraft = false
    }
    if (tagId) {
      where.tags = { some: { tagId } }
    }
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
      ]
    }
    if (startDate || endDate) {
      where.entryDate = {}
      if (startDate) (where.entryDate as Record<string, unknown>).gte = new Date(startDate)
      if (endDate) (where.entryDate as Record<string, unknown>).lte = new Date(endDate)
    }

    const [entries, total] = await Promise.all([
      prisma.entry.findMany({
        where,
        include: {
          author: { select: { id: true, name: true, avatarColor: true } },
          tags: { include: { tag: true } },
          media: true,
        },
        orderBy: { entryDate: sort === 'oldest' ? 'asc' : 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.entry.count({ where }),
    ])

    return NextResponse.json({
      entries,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Entries GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch entries' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = createEntrySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid data', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { title, content, entryDate, tagIds, mediaIds, isDraft } = parsed.data

    // Generate HTML from Tiptap JSON
    let contentHtml = ''
    try {
      const json = JSON.parse(content)
      contentHtml = generateHTML(json, htmlExtensions)
    } catch {
      contentHtml = content
    }

    const entry = await prisma.entry.create({
      data: {
        title: title || null,
        content,
        contentHtml,
        authorId: session.user.id!,
        entryDate: new Date(entryDate),
        isDraft: isDraft ?? false,
      },
      include: {
        author: { select: { id: true, name: true, avatarColor: true } },
        tags: { include: { tag: true } },
        media: true,
      },
    })

    // Link media
    if (mediaIds && mediaIds.length > 0) {
      await prisma.media.updateMany({
        where: { id: { in: mediaIds } },
        data: { entryId: entry.id },
      })
    }

    // Create tag associations
    if (tagIds && tagIds.length > 0) {
      await prisma.entryTag.createMany({
        data: tagIds.map((tagId) => ({
          entryId: entry.id,
          tagId,
        })),
      })
    }

    // Re-fetch to include linked media and tags
    const fullEntry = await prisma.entry.findUnique({
      where: { id: entry.id },
      include: {
        author: { select: { id: true, name: true, avatarColor: true } },
        tags: { include: { tag: true } },
        media: true,
      },
    })

    return NextResponse.json(fullEntry, { status: 201 })
  } catch (error) {
    console.error('Entry create error:', error)
    return NextResponse.json({ error: 'Failed to create entry' }, { status: 500 })
  }
}

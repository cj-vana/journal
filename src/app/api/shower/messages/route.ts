import { NextRequest, NextResponse } from 'next/server'
import { apiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import DOMPurify from 'isomorphic-dompurify'
import crypto from 'crypto'

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
  } catch {
    return false
  }
}

const messageSchema = z.object({
  guestName: z.string().min(1).max(100),
  message: z.string().min(1).max(2000),
  showerCode: z.string().min(1),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = messageSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }

    const { guestName, message, showerCode } = parsed.data

    const settings = await prisma.appSettings.findFirst({
      where: { id: 'singleton' },
      select: { showerEnabled: true, showerCode: true },
    })

    if (!settings?.showerEnabled || !settings.showerCode || !constantTimeEqual(settings.showerCode, showerCode)) {
      return NextResponse.json({ error: 'Shower mode is not active' }, { status: 403 })
    }

    const cleanName = DOMPurify.sanitize(guestName, { ALLOWED_TAGS: [] }).trim()
    const cleanMessage = DOMPurify.sanitize(message, { ALLOWED_TAGS: [] }).trim()

    if (!cleanName || !cleanMessage) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }

    const guestMessage = await prisma.guestMessage.create({
      data: {
        guestName: cleanName,
        message: cleanMessage,
        showerCode,
      },
    })

    return NextResponse.json(guestMessage, { status: 201 })
  } catch (error) {
    console.error('Shower message POST error:', error)
    return NextResponse.json({ error: 'Failed to submit message' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await apiAuth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const messages = await prisma.guestMessage.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
    })

    return NextResponse.json(messages)
  } catch (error) {
    console.error('Shower messages GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}

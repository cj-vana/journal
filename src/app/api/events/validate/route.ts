import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { eventMeta } from '@/lib/events'
import { eventThemeFor } from '@/lib/event-server'

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code')
    if (!code) return NextResponse.json({ valid: false })

    const event = await prisma.event.findUnique({
      where: { code },
      select: { type: true, title: true, honoreeName: true, enabled: true, welcomeMessage: true },
    })
    if (!event || !event.enabled) return NextResponse.json({ valid: false })

    const settings = await prisma.appSettings.findFirst({
      where: { id: 'singleton' },
      select: { gender: true, childName: true },
    })

    return NextResponse.json({
      valid: true,
      type: event.type,
      title: event.title,
      honoreeName: event.honoreeName || settings?.childName || 'the family',
      theme: eventThemeFor(event.type, settings?.gender || 'neutral'),
      emoji: eventMeta(event.type).emoji,
      welcomeMessage: event.welcomeMessage,
    })
  } catch (error) {
    console.error('Event validate error:', error)
    return NextResponse.json({ valid: false })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
  } catch {
    return false
  }
}

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code')
    if (!code) {
      return NextResponse.json({ valid: false })
    }

    const settings = await prisma.appSettings.findFirst({
      where: { id: 'singleton' },
      select: { showerEnabled: true, showerCode: true, childName: true, gender: true },
    })

    if (!settings?.showerEnabled || !settings.showerCode || !constantTimeEqual(settings.showerCode, code)) {
      return NextResponse.json({ valid: false })
    }

    return NextResponse.json({
      valid: true,
      childName: settings.childName,
      theme: settings.gender || 'neutral',
    })
  } catch (error) {
    console.error('Shower validate error:', error)
    return NextResponse.json({ valid: false })
  }
}

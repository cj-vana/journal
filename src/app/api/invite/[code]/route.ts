import { NextRequest, NextResponse } from 'next/server'
import { apiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { checkRateLimit } from '@/lib/rate-limit'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  // Throttle the unauthenticated invite-validation oracle (defense in depth;
  // codes are high-entropy nanoid(12)). Best-effort per-IP limit.
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
  if (!checkRateLimit(`invite:${ip}`, 30, 60 * 60 * 1000)) {
    return NextResponse.json({ valid: false, error: 'Too many requests' }, { status: 429 })
  }

  const { code } = await params

  const invite = await prisma.inviteCode.findUnique({ where: { code } })

  if (!invite) {
    return NextResponse.json({ valid: false, error: 'Invalid or expired invite code' })
  }

  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return NextResponse.json({ valid: false, error: 'Invalid or expired invite code' })
  }

  if (invite.useCount >= invite.maxUses) {
    return NextResponse.json({ valid: false, error: 'Invalid or expired invite code' })
  }

  return NextResponse.json({ valid: true })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const session = await apiAuth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { code: idOrCode } = await params

    // Look up by ID first, then by code
    const invite = await prisma.inviteCode.findFirst({
      where: { OR: [{ id: idOrCode }, { code: idOrCode }] },
    })

    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    }

    await prisma.inviteCode.delete({ where: { id: invite.id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Invite DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete invite' }, { status: 500 })
  }
}

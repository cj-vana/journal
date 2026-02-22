import { NextRequest, NextResponse } from 'next/server'
import { apiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
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

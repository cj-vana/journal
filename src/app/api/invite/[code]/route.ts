import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params

  const invite = await prisma.inviteCode.findUnique({ where: { code } })

  if (!invite) {
    return NextResponse.json({ valid: false, error: 'Invalid invite code' })
  }

  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return NextResponse.json({ valid: false, error: 'Invite code expired' })
  }

  if (invite.useCount >= invite.maxUses) {
    return NextResponse.json({ valid: false, error: 'Invite code already used' })
  }

  return NextResponse.json({ valid: true })
}

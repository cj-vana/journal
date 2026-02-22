import { NextRequest, NextResponse } from 'next/server'
import { apiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { getDayOfYear } from 'date-fns'

export async function GET(req: NextRequest) {
  try {
    const session = await apiAuth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const skip = parseInt(searchParams.get('skip') || '0', 10)

    const prompts = await prisma.writingPrompt.findMany({
      where: { isActive: true },
      orderBy: { id: 'asc' },
    })

    if (prompts.length === 0) {
      return NextResponse.json({ error: 'No prompts available' }, { status: 404 })
    }

    const dayOfYear = getDayOfYear(new Date())
    const index = (dayOfYear + skip) % prompts.length
    const prompt = prompts[index]

    return NextResponse.json({
      id: prompt.id,
      text: prompt.text,
      category: prompt.category,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch prompt' }, { status: 500 })
  }
}

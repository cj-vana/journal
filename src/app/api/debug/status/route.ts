import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isDebugMode, validateDebugKey } from '@/lib/debug'
import fs from 'fs/promises'
import path from 'path'

export async function GET(req: NextRequest) {
  if (!isDebugMode()) {
    return NextResponse.json({ error: 'Debug mode not enabled' }, { status: 404 })
  }

  const debugKey = req.headers.get('x-debug-key')
  if (!debugKey || !validateDebugKey(debugKey)) {
    return NextResponse.json({ error: 'Invalid debug key' }, { status: 401 })
  }

  const [userCount, entryCount, milestoneCount, growthCount] = await Promise.all([
    prisma.user.count(),
    prisma.entry.count(),
    prisma.milestone.count(),
    prisma.growthRecord.count(),
  ])

  let uploadDirSize = 0
  try {
    const uploadDir = process.env.UPLOAD_DIR || './data/uploads'
    async function getDirSize(dir: string): Promise<number> {
      let size = 0
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true })
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name)
          if (entry.isDirectory()) {
            size += await getDirSize(fullPath)
          } else {
            const stat = await fs.stat(fullPath)
            size += stat.size
          }
        }
      } catch {}
      return size
    }
    uploadDirSize = await getDirSize(uploadDir)
  } catch {}

  return NextResponse.json({
    users: userCount,
    entries: entryCount,
    milestones: milestoneCount,
    growthRecords: growthCount,
    uploadDirSizeBytes: uploadDirSize,
    uptime: process.uptime(),
  })
}

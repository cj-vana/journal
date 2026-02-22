import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ALLOWED_AUDIO_TYPES, MAX_UPLOAD_SIZE } from '@/lib/constants'
import path from 'path'
import fs from 'fs/promises'

const UPLOAD_DIR = process.env.UPLOAD_DIR || './data/uploads'

const MIME_TO_EXT: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/mp4': 'mp4',
  'audio/ogg': 'ogg',
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!ALLOWED_AUDIO_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const id = crypto.randomUUID().replace(/-/g, '').slice(0, 21)
    const ext = MIME_TO_EXT[file.type] || 'webm'
    const now = new Date()
    const year = now.getFullYear().toString()
    const month = (now.getMonth() + 1).toString().padStart(2, '0')

    const dir = path.join(UPLOAD_DIR, 'audio', year, month)
    await fs.mkdir(dir, { recursive: true })

    const filePath = path.join(dir, `${id}.${ext}`)
    await fs.writeFile(filePath, buffer)

    const media = await prisma.media.create({
      data: {
        type: 'audio',
        filename: `${id}.${ext}`,
        path: `audio/${year}/${month}/${id}.${ext}`,
        mimeType: file.type,
        size: buffer.length,
      },
    })

    const url = `/api/files/audio/${year}/${month}/${id}.${ext}`

    return NextResponse.json({
      id: media.id,
      url,
    })
  } catch (error) {
    console.error('Audio upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { apiAuth } from '@/lib/api-auth'
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

// Magic byte signatures for audio formats
function validateAudioMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 12) return false

  switch (mimeType) {
    case 'audio/mpeg': {
      // MP3: starts with ID3 tag or MP3 sync word (0xFF 0xFB/0xF3/0xF2)
      const hasId3 = buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33
      const hasSyncWord = buffer[0] === 0xFF && (buffer[1] & 0xE0) === 0xE0
      return hasId3 || hasSyncWord
    }
    case 'audio/wav': {
      // WAV: RIFF....WAVE
      const riff = buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46
      const wave = buffer[8] === 0x57 && buffer[9] === 0x41 && buffer[10] === 0x56 && buffer[11] === 0x45
      return riff && wave
    }
    case 'audio/ogg': {
      // OGG: OggS
      return buffer[0] === 0x4F && buffer[1] === 0x67 && buffer[2] === 0x67 && buffer[3] === 0x53
    }
    case 'audio/webm': {
      // WebM: starts with EBML header (0x1A 0x45 0xDF 0xA3)
      return buffer[0] === 0x1A && buffer[1] === 0x45 && buffer[2] === 0xDF && buffer[3] === 0xA3
    }
    case 'audio/mp4': {
      // M4A/MP4: ftyp box marker at offset 4
      const ftyp = buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70
      return ftyp
    }
    default:
      return false
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await apiAuth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Browsers always set Content-Length for multipart uploads. A missing or
    // non-numeric value must be rejected, otherwise the guard is skipped and the
    // entire body is buffered into memory before the post-parse size check.
    const clRaw = req.headers.get('content-length')
    const contentLength = clRaw === null ? NaN : Number(clRaw)
    if (!Number.isFinite(contentLength) || contentLength > MAX_UPLOAD_SIZE + 1024) {
      return NextResponse.json({ error: 'File too large' }, { status: 413 })
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

    if (!validateAudioMagicBytes(buffer, file.type)) {
      return NextResponse.json({ error: 'Invalid audio data' }, { status: 400 })
    }

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
        uploadedBy: session.user.id!,
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

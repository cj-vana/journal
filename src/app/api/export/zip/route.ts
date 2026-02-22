import { NextResponse } from 'next/server'
import { apiAuth } from '@/lib/api-auth'
import { generateZipExport } from '@/lib/export'
import { format } from 'date-fns'

export async function POST() {
  try {
    const session = await apiAuth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const archive = await generateZipExport()
    const dateStr = format(new Date(), 'yyyyMMdd')

    // Stream the archive directly instead of buffering in memory
    const stream = new ReadableStream({
      start(controller) {
        archive.on('data', (chunk: Buffer) => {
          controller.enqueue(new Uint8Array(chunk))
        })
        archive.on('end', () => controller.close())
        archive.on('error', (err) => controller.error(err))
      },
    })

    return new NextResponse(stream, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="journal-export-${dateStr}.zip"`,
      },
    })
  } catch (error) {
    console.error('ZIP export error:', error)
    return NextResponse.json(
      { error: 'Failed to generate ZIP export' },
      { status: 500 }
    )
  }
}

import archiver from 'archiver'
import fs from 'fs'
import path from 'path'
import { prisma } from './prisma'

const UPLOAD_DIR = process.env.UPLOAD_DIR || './data/uploads'

function addDirectoryToArchive(
  archive: archiver.Archiver,
  dirPath: string,
  archivePath: string
) {
  if (!fs.existsSync(dirPath)) return

  const entries = fs.readdirSync(dirPath, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)
    const entryArchivePath = path.join(archivePath, entry.name)
    if (entry.isDirectory()) {
      addDirectoryToArchive(archive, fullPath, entryArchivePath)
    } else if (entry.isFile()) {
      archive.file(fullPath, { name: entryArchivePath })
    }
  }
}

export async function generateZipExport(): Promise<archiver.Archiver> {
  const [entries, milestones, growthRecords, settings] = await Promise.all([
    prisma.entry.findMany({
      include: {
        author: { select: { id: true, name: true, email: true } },
        tags: { include: { tag: true } },
        media: true,
      },
      orderBy: { entryDate: 'asc' },
    }),
    prisma.milestone.findMany({
      include: {
        recorder: { select: { id: true, name: true } },
      },
      orderBy: { date: 'asc' },
    }),
    prisma.growthRecord.findMany({
      include: {
        recorder: { select: { id: true, name: true } },
      },
      orderBy: { date: 'asc' },
    }),
    prisma.appSettings.findFirst({ where: { id: 'singleton' } }),
  ])

  const archive = archiver('zip', { zlib: { level: 6 } })

  archive.append(JSON.stringify(entries, null, 2), { name: 'entries.json' })
  archive.append(JSON.stringify(milestones, null, 2), { name: 'milestones.json' })
  archive.append(JSON.stringify(growthRecords, null, 2), { name: 'growth.json' })
  archive.append(JSON.stringify(settings, null, 2), { name: 'settings.json' })

  const imagesDir = path.join(UPLOAD_DIR, 'images')
  addDirectoryToArchive(archive, imagesDir, 'media/images')

  const audioDir = path.join(UPLOAD_DIR, 'audio')
  addDirectoryToArchive(archive, audioDir, 'media/audio')

  archive.finalize()

  return archive
}

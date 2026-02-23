import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import EntryContent from '@/components/entries/EntryContent'
import AudioPlayer from '@/components/editor/AudioPlayer'
import Link from 'next/link'
import { ArrowLeft, Pencil } from 'lucide-react'
import DeleteEntryButton from './DeleteEntryButton'

interface EntryPageProps {
  params: Promise<{ id: string }>
}

export default async function EntryPage({ params }: EntryPageProps) {
  await requireAuth()
  const { id } = await params

  const entry = await prisma.entry.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, name: true, avatarColor: true } },
      tags: { include: { tag: true } },
      media: true,
    },
  })

  if (!entry) notFound()

  const audioMedia = entry.media.filter((m) => m.type === 'audio')

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/entries"
          className="p-2 text-warm-600 hover:text-warm-800 hover:bg-warm-100 rounded-xl transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1" />
        <Link
          href={`/entries/${entry.id}/edit`}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-warm-200 rounded-xl text-sm text-warm-600 hover:bg-warm-50 transition-colors"
        >
          <Pencil size={14} />
          <span>Edit</span>
        </Link>
        <DeleteEntryButton entryId={entry.id} />
      </div>

      <article>
        {entry.title && (
          <h1 className="text-4xl font-accent text-warm-800 mb-4">{entry.title}</h1>
        )}

        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
            style={{ backgroundColor: entry.author.avatarColor || '#A89060' }}
          >
            {entry.author.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-warm-800 text-sm font-medium">{entry.author.name}</p>
            <p className="text-warm-600 text-xs">
              {format(new Date(entry.entryDate), 'MMMM d, yyyy')}
            </p>
          </div>
        </div>

        {entry.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-6">
            {entry.tags.map(({ tag }) => (
              <span
                key={tag.id}
                className="px-2.5 py-1 rounded-full text-sm font-medium"
                style={{
                  backgroundColor: tag.color ? `${tag.color}20` : '#F5ECDB',
                  color: tag.color || '#6B5B3E',
                }}
              >
                {tag.icon && <span className="mr-1">{tag.icon}</span>}
                {tag.name}
              </span>
            ))}
          </div>
        )}

        {entry.isDraft && (
          <div className="inline-block mb-4 px-3 py-1 bg-warm-100 text-warm-600 rounded-full text-sm font-medium">
            Draft
          </div>
        )}

        <div className="bg-white border border-warm-200 rounded-2xl p-6 mb-6">
          <EntryContent html={entry.contentHtml || ''} />
        </div>

        {audioMedia.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-accent text-warm-800">Audio</h2>
            {audioMedia.map((media) => (
              <AudioPlayer
                key={media.id}
                src={`/api/files/${media.path}`}
                caption={media.caption || undefined}
              />
            ))}
          </div>
        )}
      </article>
    </div>
  )
}

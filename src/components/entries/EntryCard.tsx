import Link from 'next/link'
import { format } from 'date-fns'
import type { EntryWithRelations } from '@/types'

interface EntryCardProps {
  entry: EntryWithRelations
}

function getTextPreview(content: string, maxLength = 100): string {
  try {
    const json = JSON.parse(content)
    const texts: string[] = []
    function extract(node: Record<string, unknown>) {
      if (node.text) texts.push(node.text as string)
      if (Array.isArray(node.content)) {
        for (const child of node.content) extract(child as Record<string, unknown>)
      }
    }
    extract(json)
    const text = texts.join(' ')
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text
  } catch {
    const text = content.replace(/<[^>]+>/g, '')
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text
  }
}

function getFirstImageThumbnail(entry: EntryWithRelations): string | null {
  const image = entry.media.find((m) => m.type === 'image')
  if (!image) return null
  // Construct thumbnail URL from path
  const thumbPath = image.path.replace('.webp', '_thumb.webp')
  return `/api/files/${thumbPath}`
}

export default function EntryCard({ entry }: EntryCardProps) {
  const thumbnail = getFirstImageThumbnail(entry)
  const preview = getTextPreview(entry.content)
  const displayTitle = entry.title || preview.slice(0, 40) || 'Untitled'

  return (
    <Link href={`/entries/${entry.id}`}>
      <div className="bg-white border border-warm-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow p-4 h-full">
        {thumbnail && (
          <div className="mb-3 -mx-4 -mt-4 overflow-hidden rounded-t-2xl">
            <img
              src={thumbnail}
              alt={entry.title || 'Entry image'}
              loading="lazy"
              className="w-full h-40 object-cover"
            />
          </div>
        )}

        <h3 className="font-accent text-lg text-warm-800 font-semibold line-clamp-1 mb-1">
          {displayTitle}
        </h3>

        <p className="text-warm-600 text-sm line-clamp-2 mb-3">{preview}</p>

        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ backgroundColor: entry.author.avatarColor || '#A89060' }}
          >
            {entry.author.name.charAt(0).toUpperCase()}
          </div>
          <span className="text-warm-600 text-xs">{entry.author.name}</span>
          <span className="text-warm-600 text-xs">
            {format(new Date(entry.entryDate), 'MMM d, yyyy')}
          </span>
        </div>

        {entry.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {entry.tags.map(({ tag }) => (
              <span
                key={tag.id}
                className="px-2 py-0.5 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: tag.color ? `${tag.color}20` : '#F5ECDB',
                  color: tag.color || '#6B5B3E',
                }}
              >
                {tag.icon && <span className="mr-0.5">{tag.icon}</span>}
                {tag.name}
              </span>
            ))}
          </div>
        )}

        {entry.isDraft && (
          <span className="inline-block mt-2 px-2 py-0.5 bg-warm-100 text-warm-600 rounded-full text-xs font-medium">
            Draft
          </span>
        )}
      </div>
    </Link>
  )
}

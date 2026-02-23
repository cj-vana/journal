import { sanitizeHtml } from '@/lib/sanitize'

interface EntryContentProps {
  html: string
}

export default function EntryContent({ html }: EntryContentProps) {
  return (
    <div
      className={
        'prose max-w-none ' +
        'prose-headings:font-accent prose-headings:text-warm-800 ' +
        'prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl ' +
        'prose-p:text-warm-800 prose-p:leading-relaxed ' +
        'prose-a:text-sky-600 prose-a:underline hover:prose-a:text-sky-800 ' +
        'prose-blockquote:border-l-4 prose-blockquote:border-rose-300 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-warm-600 ' +
        'prose-img:rounded-xl prose-img:max-w-full prose-img:h-auto ' +
        'prose-hr:border-warm-200 ' +
        'prose-strong:text-warm-800 ' +
        'prose-ul:text-warm-800 prose-ol:text-warm-800 ' +
        'prose-li:text-warm-800'
      }
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(html.replace(/<img /g, '<img loading="lazy" ')) }}
    />
  )
}

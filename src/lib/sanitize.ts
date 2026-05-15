import DOMPurify from 'isomorphic-dompurify'

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function isSafeHref(value: string): boolean {
  try {
    const url = new URL(value, 'http://localhost')
    return ['http:', 'https:', 'mailto:'].includes(url.protocol)
  } catch {
    return false
  }
}

function isSafeSrc(value: string): boolean {
  return value.startsWith('/api/files/') || /^data:image\/(png|jpeg|gif|webp);base64,/i.test(value)
}

function stripUnsafeUrls(html: string): string {
  return html
    .replace(/\s(href|src)=("[^"]*"|'[^']*')/gi, (match, attr: string, quoted: string) => {
      const value = quoted.slice(1, -1).trim()
      const isSafe = attr.toLowerCase() === 'href' ? isSafeHref(value) : isSafeSrc(value)
      return isSafe ? match : ''
    })
    .replace(/<a\b([^>]*)target="_blank"([^>]*)>/gi, (match) => (
      /\srel=/.test(match) ? match : match.replace('>', ' rel="noopener noreferrer">')
    ))
}

export function sanitizeHtml(html: string): string {
  const cleanHtml = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p','br','strong','em','u','s','del','h1','h2','h3','h4','h5','h6','ul','ol','li','blockquote','pre','code','a','img','hr','span','div','sub','sup'],
    ALLOWED_ATTR: ['href','src','alt','title','class','target','rel','width','height','loading','data-type','data-text-align'],
    ALLOW_DATA_ATTR: false,
    FORBID_ATTR: ['style'],
  })

  return stripUnsafeUrls(cleanHtml)
}

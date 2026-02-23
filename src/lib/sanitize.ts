import DOMPurify from 'isomorphic-dompurify'

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p','br','strong','em','u','s','del','h1','h2','h3','h4','h5','h6','ul','ol','li','blockquote','pre','code','a','img','hr','span','div','sub','sup'],
    ALLOWED_ATTR: ['href','src','alt','title','class','style','target','rel','width','height','loading','data-type','data-text-align'],
    ALLOW_DATA_ATTR: false,
  })
}

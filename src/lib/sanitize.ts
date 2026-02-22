/**
 * Basic HTML sanitizer for Tiptap-generated content.
 * Strips script tags, event handlers, and dangerous attributes.
 * Tiptap's generateHTML already produces safe output from its schema,
 * but this provides defense-in-depth.
 */
export function sanitizeHtml(html: string): string {
  return html
    // Remove script tags and their content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove event handler attributes
    .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    // Remove javascript: URLs
    .replace(/href\s*=\s*["']?\s*javascript:/gi, 'href="')
    // Remove data: URLs in src attributes (except images we embed for PDF)
    .replace(/src\s*=\s*["']?\s*data:(?!image\/)/gi, 'src="')
    // Remove iframe, embed, object tags
    .replace(/<\/?(?:iframe|embed|object|applet|form)\b[^>]*>/gi, '')
}

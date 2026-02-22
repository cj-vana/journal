import { generateHTML } from '@tiptap/html'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Color from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import HorizontalRule from '@tiptap/extension-horizontal-rule'
import Blockquote from '@tiptap/extension-blockquote'

const htmlExtensions = [
  StarterKit.configure({ horizontalRule: false, blockquote: false }),
  Image,
  Color,
  TextStyle,
  Underline,
  Link,
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  HorizontalRule,
  Blockquote,
]

export function contentToHtml(content: string): string {
  try {
    const json = JSON.parse(content)
    return generateHTML(json, htmlExtensions)
  } catch {
    return `<p>${content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`
  }
}

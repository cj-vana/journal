import { cache } from 'react'
import { prisma } from './prisma'

/**
 * Cached settings accessor for use in React Server Components.
 * React's cache() deduplicates calls within a single server render pass,
 * so layout + page calling this function results in only one DB query.
 *
 * For non-React contexts (export, PDF generation), call prisma directly.
 */
export const getAppSettings = cache(() =>
  prisma.appSettings.findFirst({ where: { id: 'singleton' } })
)

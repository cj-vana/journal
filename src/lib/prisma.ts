import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function createPrismaClient() {
  const client = new PrismaClient()
  client.$executeRawUnsafe('PRAGMA journal_mode = WAL').catch(() => {})
  client.$executeRawUnsafe('PRAGMA synchronous = NORMAL').catch(() => {})
  client.$executeRawUnsafe('PRAGMA cache_size = -64000').catch(() => {})
  client.$executeRawUnsafe('PRAGMA busy_timeout = 5000').catch(() => {})
  client.$executeRawUnsafe('PRAGMA foreign_keys = ON').catch(() => {})
  return client
}

export const prisma = globalForPrisma.prisma || createPrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

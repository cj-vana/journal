import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function createPrismaClient() {
  const client = new PrismaClient()
  // Initialize SQLite PRAGMAs — chain them to ensure they complete
  client.$executeRawUnsafe('PRAGMA journal_mode = WAL')
    .then(() => client.$executeRawUnsafe('PRAGMA synchronous = NORMAL'))
    .then(() => client.$executeRawUnsafe('PRAGMA cache_size = -64000'))
    .then(() => client.$executeRawUnsafe('PRAGMA busy_timeout = 5000'))
    .then(() => client.$executeRawUnsafe('PRAGMA foreign_keys = ON'))
    .catch(() => {})
  return client
}

export const prisma = globalForPrisma.prisma || createPrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

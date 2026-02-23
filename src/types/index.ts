import type { User, Entry, Tag, Media, Milestone, GrowthRecord, AppSettings } from '@prisma/client'
import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface User {
    role?: string
    avatarColor?: string | null
  }
  interface Session {
    user: {
      id: string
      role: string
      avatarColor?: string | null
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: string
    avatarColor?: string | null
  }
}

export type { User, Entry, Tag, Media, Milestone, GrowthRecord, AppSettings }

export type EntryWithRelations = Entry & {
  author: Pick<User, 'id' | 'name' | 'avatarColor'>
  tags: { tag: Tag }[]
  media: Media[]
}

export type SafeUser = Omit<User, 'passwordHash'>

export type PaginatedResponse<T> = {
  data: T[]
  total: number
  page: number
  totalPages: number
}

import type { User, Entry, Tag, Media, Milestone, GrowthRecord, AppSettings } from '@prisma/client'

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

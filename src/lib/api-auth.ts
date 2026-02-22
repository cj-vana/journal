import { auth } from './auth'
import { isDebugMode, validateDebugKey } from './debug'
import { headers } from 'next/headers'

export async function apiAuth(): Promise<{ user: { id: string; role: string; name?: string; email?: string } } | null> {
  const session = await auth()
  if (session?.user) {
    return { user: { id: session.user.id, role: session.user.role || 'member', name: session.user.name ?? undefined, email: session.user.email ?? undefined } }
  }
  if (isDebugMode()) {
    const h = await headers()
    const key = h.get('x-debug-key')
    if (key && validateDebugKey(key)) {
      const { prisma } = await import('./prisma')
      // Only allow impersonating the explicit debug user, never fallback to a real admin
      const debugUser = await prisma.user.findFirst({
        where: { email: 'chaos-test@debug.local' },
        select: { id: true, name: true, email: true, role: true },
      })
      if (debugUser) {
        return { user: { id: debugUser.id, role: debugUser.role, name: debugUser.name, email: debugUser.email } }
      }
    }
  }
  return null
}

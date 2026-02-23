import { requireAuth } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import DebugBanner from '@/components/layout/DebugBanner'
import AppShell from '@/components/layout/AppShell'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth()
  const settings = await prisma.appSettings.findFirst({ where: { id: 'singleton' } })

  const user = {
    name: session.user?.name || 'User',
    role: session.user?.role || 'member',
    avatarColor: session.user?.avatarColor || null,
  }

  return (
    <div className="min-h-screen bg-cream-50">
      <DebugBanner enabled={process.env.ENABLE_DEBUG_PROFILE === 'true'} />
      <AppShell
        appTitle={settings?.appTitle || 'Our Journal'}
        childName={settings?.childName || 'Baby'}
        user={user}
      >
        {children}
      </AppShell>
    </div>
  )
}

import { requireAuth } from '@/lib/auth-utils'
import { getAppSettings } from '@/lib/settings'
import DebugBanner from '@/components/layout/DebugBanner'
import AppShell from '@/components/layout/AppShell'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth()
  const settings = await getAppSettings()

  const user = {
    name: session.user?.name || 'User',
    role: session.user?.role || 'member',
    avatarColor: session.user?.avatarColor || null,
  }

  const gender = (settings?.gender as 'girl' | 'boy' | 'neutral') || 'neutral'

  return (
    <div className="min-h-screen bg-cream-50" data-theme={gender}>
      <DebugBanner enabled={process.env.ENABLE_DEBUG_PROFILE === 'true' && process.env.NODE_ENV !== 'production'} />
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

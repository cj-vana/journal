import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import SettingsForm from '@/components/settings/SettingsForm'
import Link from 'next/link'
import { Users } from 'lucide-react'

export default async function SettingsPage() {
  await requireAdmin()

  let settings = await prisma.appSettings.findFirst({
    where: { id: 'singleton' },
  })

  if (!settings) {
    settings = await prisma.appSettings.create({
      data: { id: 'singleton' },
    })
  }

  const initialSettings = {
    childName: settings.childName,
    appTitle: settings.appTitle,
    childBirthDate: settings.childBirthDate
      ? settings.childBirthDate.toISOString()
      : null,
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-accent text-warm-800">Settings</h1>
        <p className="text-warm-600 mt-1">Manage your journal settings</p>
      </div>

      <div className="bg-white border border-warm-200 rounded-2xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-warm-800 mb-4">
          Journal Settings
        </h2>
        <SettingsForm initialSettings={initialSettings} />
      </div>

      <Link
        href="/settings/users"
        className="flex items-center gap-3 bg-white border border-warm-200 rounded-2xl shadow-sm p-5 hover:shadow-md transition-shadow"
      >
        <div className="p-3 bg-rose-50 rounded-xl">
          <Users className="w-5 h-5 text-rose-400" />
        </div>
        <div>
          <h3 className="font-semibold text-warm-800">User Management</h3>
          <p className="text-sm text-warm-600">
            Manage users, roles, and invite codes
          </p>
        </div>
      </Link>
    </div>
  )
}

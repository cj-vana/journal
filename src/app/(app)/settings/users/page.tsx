import { requireAdmin } from '@/lib/auth-utils'
import UserManagement from '@/components/settings/UserManagement'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function UsersPage() {
  const session = await requireAdmin()

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1 text-sm text-warm-500 hover:text-warm-700 transition-colors mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Settings
        </Link>
        <h1 className="text-3xl font-accent text-warm-800">
          User Management
        </h1>
        <p className="text-warm-600 mt-1">
          Manage users and invite codes
        </p>
      </div>

      <UserManagement currentUserId={session.user!.id!} />
    </div>
  )
}

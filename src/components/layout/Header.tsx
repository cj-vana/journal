'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PenSquare, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import Button from '@/components/ui/Button'

interface HeaderProps {
  title?: string
  onMenuToggle?: () => void
}

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/entries': 'Entries',
  '/entries/new': 'New Entry',
  '/milestones': 'Milestones',
  '/growth': 'Growth',
  '/export': 'Export',
  '/settings': 'Settings',
}

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname]
  if (pathname.startsWith('/entries/') && pathname.endsWith('/edit')) return 'Edit Entry'
  if (pathname.startsWith('/entries/')) return 'View Entry'
  if (pathname.startsWith('/milestones/')) return 'Milestone'
  return 'Dashboard'
}

export default function Header({ title, onMenuToggle }: HeaderProps) {
  const pathname = usePathname()
  const pageTitle = title || getPageTitle(pathname)

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-sm border-b border-warm-200 pt-[env(safe-area-inset-top,0px)]">
      <div className="flex items-center justify-between px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          {/* Mobile menu button */}
          <button
            onClick={onMenuToggle}
            aria-label="Open navigation menu"
            className="md:hidden p-2 text-warm-600 hover:bg-warm-50 rounded-xl transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold text-warm-800">{pageTitle}</h1>
        </div>
        <Link href="/entries/new">
          <Button size="sm" className="gap-2">
            <PenSquare className="w-4 h-4" />
            <span className="hidden sm:inline">New Entry</span>
          </Button>
        </Link>
      </div>
    </header>
  )
}

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, BookOpen, Plus, Star, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/entries', label: 'Entries', icon: BookOpen },
  { href: '/entries/new', label: 'New', icon: Plus, isCenter: true },
  { href: '/milestones', label: 'Milestones', icon: Star },
  { href: '/growth', label: 'Growth', icon: TrendingUp },
]

export default function MobileNav() {
  const pathname = usePathname()

  return (
    <nav aria-label="Mobile navigation" className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-warm-200 pb-[env(safe-area-inset-bottom,0px)]">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const isActive = item.href === '/entries/new'
            ? false
            : pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon

          if (item.isCenter) {
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label="New entry"
                className="-mt-4 w-14 h-14 rounded-full bg-accent-400 text-white shadow-lg flex items-center justify-center hover:bg-accent-600 transition-colors"
              >
                <Icon className="w-6 h-6" />
              </Link>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-1',
                isActive ? 'text-accent-400' : 'text-warm-600'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

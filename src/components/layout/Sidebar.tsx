'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  Home,
  BookOpen,
  Star,
  TrendingUp,
  Download,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarProps {
  appTitle: string
  childName: string
  user: {
    name: string
    role: string
    avatarColor: string | null
  }
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/entries', label: 'Entries', icon: BookOpen },
  { href: '/milestones', label: 'Milestones', icon: Star },
  { href: '/growth', label: 'Growth', icon: TrendingUp },
  { href: '/export', label: 'Export', icon: Download },
]

const adminItems = [
  { href: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar({ appTitle, childName, user }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const allItems = user.role === 'admin' ? [...navItems, ...adminItems] : navItems

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col fixed left-0 top-0 h-full bg-warm-50 border-r border-warm-200 z-40 transition-all duration-200',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className={cn('p-4 border-b border-warm-200', collapsed && 'px-2')}>
        {!collapsed ? (
          <>
            <h1 className="font-accent text-2xl text-warm-800 truncate">{appTitle}</h1>
            {childName !== appTitle && (
              <p className="text-sm text-warm-600 truncate">{childName}</p>
            )}
          </>
        ) : (
          <div className="w-10 h-10 rounded-full bg-rose-400 flex items-center justify-center text-white font-accent text-lg mx-auto">
            {appTitle.charAt(0)}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {allItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl py-2.5 px-4 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-rose-50 text-rose-600 border-r-2 border-rose-400'
                  : 'text-warm-600 hover:bg-warm-100',
                collapsed && 'justify-center px-2'
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="hidden lg:flex items-center justify-center p-2 mx-2 mb-2 text-warm-400 hover:text-warm-600 hover:bg-warm-100 rounded-xl transition-colors"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* User Info */}
      <div className={cn('p-4 border-t border-warm-200', collapsed && 'p-2')}>
        <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-sm flex-shrink-0"
            style={{ backgroundColor: user.avatarColor || '#F4A0A8' }}
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-warm-800 truncate">{user.name}</p>
              <p className="text-xs text-warm-600 capitalize">{user.role}</p>
            </div>
          )}
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className={cn(
            'flex items-center gap-2 text-sm text-warm-600 hover:text-warm-800 mt-3 transition-colors',
            collapsed && 'justify-center w-full'
          )}
          title={collapsed ? 'Log out' : undefined}
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span>Log out</span>}
        </button>
      </div>
    </aside>
  )
}

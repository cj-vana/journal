'use client'

import { useState, type ReactNode } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import MobileNav from './MobileNav'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AppShellProps {
  appTitle: string
  childName: string
  user: {
    name: string
    role: string
    avatarColor: string | null
  }
  children: ReactNode
}

export default function AppShell({ appTitle, childName, user, children }: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:bg-white focus:px-4 focus:py-2 focus:rounded-xl focus:shadow-lg focus:text-warm-800 focus:ring-2 focus:ring-accent-400">
        Skip to main content
      </a>

      {/* Desktop sidebar */}
      <Sidebar appTitle={appTitle} childName={childName} user={user} />

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed left-0 top-0 h-full w-64 bg-warm-50 border-r border-warm-200 z-50 overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-warm-200">
              <h1 className="font-accent text-2xl text-warm-800">{appTitle}</h1>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 text-warm-600 hover:text-warm-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div onClick={() => setMobileMenuOpen(false)}>
              <Sidebar appTitle={appTitle} childName={childName} user={user} />
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="md:pl-64">
        <Header onMenuToggle={() => setMobileMenuOpen(true)} />
        <main id="main-content" tabIndex={-1} className="min-h-screen pb-20 md:pb-0">
          <div className="max-w-5xl mx-auto px-4 py-8">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileNav />
    </>
  )
}

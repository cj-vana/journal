import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth

  // Public routes
  const publicPaths = ['/login', '/register', '/api/auth']
  const isPublicPath = publicPaths.some(p => pathname.startsWith(p))

  // Invite validation endpoint is public
  if (pathname.match(/^\/api\/invite\/[^/]+$/)) return NextResponse.next()

  // Debug endpoints when debug mode is enabled
  if (pathname.startsWith('/api/debug') && process.env.ENABLE_DEBUG_PROFILE === 'true') {
    const debugKey = req.headers.get('x-debug-key')
    if (debugKey === process.env.DEBUG_KEY) return NextResponse.next()
  }

  // Allow debug key to bypass auth for API routes
  if (pathname.startsWith('/api/') && process.env.ENABLE_DEBUG_PROFILE === 'true') {
    const debugKey = req.headers.get('x-debug-key')
    if (debugKey === process.env.DEBUG_KEY) return NextResponse.next()
  }

  if (isPublicPath) {
    if (isLoggedIn && (pathname === '/login' || pathname === '/register')) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    return NextResponse.next()
  }

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|fonts|favicon.ico).*)'],
}

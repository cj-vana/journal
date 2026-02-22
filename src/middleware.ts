import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth

  // Public routes - exact match or path segment match to prevent prefix attacks
  const publicPaths = ['/login', '/register', '/setup', '/api/auth', '/api/setup']
  const isPublicPath = publicPaths.some(p => pathname === p || pathname.startsWith(p + '/'))

  // Invite validation endpoint is public
  if (pathname.match(/^\/api\/invite\/[^/]+$/)) return NextResponse.next()

  // Debug endpoints - only in non-production when debug mode is enabled
  if (
    (pathname === '/api/debug' || pathname.startsWith('/api/debug/')) &&
    process.env.ENABLE_DEBUG_PROFILE === 'true' &&
    process.env.NODE_ENV !== 'production'
  ) {
    const debugKey = req.headers.get('x-debug-key')
    const expected = process.env.DEBUG_KEY || ''
    if (debugKey && expected && debugKey.length === expected.length) {
      // Constant-time comparison to prevent timing attacks (Edge Runtime can't use crypto.timingSafeEqual)
      let match = 0
      for (let i = 0; i < debugKey.length; i++) {
        match |= debugKey.charCodeAt(i) ^ expected.charCodeAt(i)
      }
      if (match === 0) return NextResponse.next()
    }
  }


  if (isPublicPath) {
    if (isLoggedIn && (pathname === '/login' || pathname === '/register' || pathname === '/setup')) {
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

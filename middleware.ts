import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Database } from '@/types/database'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient<Database>({ req, res })

  try {
    // Refresh session if expired - required for Server Components
    const { data: { session }, error } = await supabase.auth.getSession()

    // Handle protected routes
    if (req.nextUrl.pathname.startsWith('/dashboard')) {
      if (!session) {
        // Store the original URL in the redirectedFrom parameter
        const redirectUrl = new URL('/sign-in', req.url)
        redirectUrl.searchParams.set('redirectedFrom', req.nextUrl.pathname)
        return NextResponse.redirect(redirectUrl)
      }

      // Add user session to response headers for client-side access
      const headers = new Headers(res.headers)
      headers.set('x-user-id', session.user.id)
      headers.set('x-user-role', session.user.user_metadata.role || 'user')

      return NextResponse.next({
        request: {
          headers: req.headers,
        },
        ...res,
        headers,
      })
    }

    // Redirect signed-in users away from auth pages
    if (session && (req.nextUrl.pathname === '/sign-in' || req.nextUrl.pathname === '/sign-up')) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    return res
  } catch (e) {
    console.error('Middleware error:', e)
    return res
  }
}

// Specify which routes this middleware should run for
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/sign-in',
    '/sign-up'
  ]
} 
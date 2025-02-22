import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  try {
    // Refresh session if expired
    await supabase.auth.getSession()

    // Handle protected routes
    if (req.nextUrl.pathname.startsWith('/dashboard')) {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        const redirectUrl = new URL('/sign-in', req.url)
        redirectUrl.searchParams.set('redirectedFrom', req.nextUrl.pathname)
        return NextResponse.redirect(redirectUrl)
      }
    }

    return res
  } catch (e) {
    console.error('Middleware error:', e)
    return res
  }
}

// Specify which routes this middleware should run for
export const config = {
  matcher: ['/dashboard/:path*']
} 
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key-change-it')

export async function middleware(request: NextRequest) {
  const session = request.cookies.get('session')?.value

  // Paths that require no auth
  if (request.nextUrl.pathname.startsWith('/login')) {
    if (session) {
        // Just a simple check, if session exists, try verify. 
        // If valid, redirect to dashboard. If not, continue to login.
        try {
            const { payload } = await jwtVerify(session, SECRET_KEY)
            if (payload.role === 'SUPERVISOR') return NextResponse.redirect(new URL('/admin/bitacoras', request.url))
            if (payload.role === 'TECNICO') return NextResponse.redirect(new URL('/technician/dashboard', request.url))
        } catch (e) {
            // Invalid token, let them login
        }
    }
    return NextResponse.next()
  }

  // Protected paths
  if (request.nextUrl.pathname.startsWith('/admin') || request.nextUrl.pathname.startsWith('/technician')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    try {
      const { payload } = await jwtVerify(session, SECRET_KEY)
      const role = payload.role as string

      if (request.nextUrl.pathname.startsWith('/admin') && role !== 'SUPERVISOR') {
        // Redirect unauthorized access to their own dashboard or 403
        return NextResponse.redirect(new URL('/technician/dashboard', request.url))
      }

      if (request.nextUrl.pathname.startsWith('/technician') && role !== 'TECNICO' && role !== 'SUPERVISOR') {
        return NextResponse.redirect(new URL('/admin/bitacoras', request.url))
      }

      return NextResponse.next()
    } catch (error) {
      console.error('Middleware Verification failed:', error)
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/technician/:path*', '/login'],
}

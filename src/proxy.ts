// src/proxy.ts — Supabase SSR auth guard (Next.js 16+ proxy API)
// Redirects unauthenticated users to /auth

import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'];
  const supabaseAnonKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refresh session
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Public routes — no auth required
  const publicRoutes = ['/auth', '/api', '/_next', '/favicon.ico', '/manifest.json', '/icons'];
  const isPublicRoute = publicRoutes.some(r => pathname.startsWith(r)) || pathname === '/';

  if (!user && !isPublicRoute) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // Redirect authenticated users away from auth pages to /study
  if (user && pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/study', request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image  (image optimization)
     * - favicon.ico
     * - manifest.json
     * - public/icons/* (PWA icons)
     * - public svg files
     */
    '/((?!_next/static|_next/image|favicon\.ico|manifest\.json|icons/.*|\..*\.svg).*)',
  ],
};

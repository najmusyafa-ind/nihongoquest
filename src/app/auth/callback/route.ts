// src/app/auth/callback/route.ts
// Supabase SSR Auth callback handler — required for Google OAuth and email magic links.
// Without this route, OAuth redirects will NOT complete the session handshake.

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // 'next' param allows post-auth redirect override
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? '',
      process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? '',
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Redirect to the target page after successful auth exchange
      return NextResponse.redirect(`${origin}${next}`);
    }

    console.error('[auth/callback] Code exchange failed:', error.message);
  }

  // Auth code missing or exchange failed → redirect to login with error flag
  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`);
}

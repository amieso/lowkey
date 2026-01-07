import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/'

  // Store cookies to set on the response
  const cookiesToSet: { name: string; value: string; options?: object }[] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookies) {
          cookiesToSet.push(...cookies)
        },
      },
    }
  )

  // Helper to create redirect with cookies
  const redirectWithCookies = (url: string) => {
    const response = NextResponse.redirect(url)
    cookiesToSet.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options as object)
    })
    return response
  }

  // Handle magic link (OTP) verification
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'magiclink' | 'email',
    })

    if (!error) {
      const redirectUrl = new URL(next, origin)
      redirectUrl.searchParams.set('auth', 'success')
      return redirectWithCookies(redirectUrl.toString())
    }

    console.log('[Auth Callback] OTP Error:', error.message)
    return NextResponse.redirect(`${origin}?error=auth`)
  }

  // Handle OAuth PKCE code exchange
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    console.log('[Auth Callback] Code exchange result:', {
      hasSession: !!data?.session,
      hasUser: !!data?.user,
      error: error?.message,
      cookiesSet: cookiesToSet.length
    })

    if (!error && data?.session) {
      const redirectUrl = new URL(next, origin)
      redirectUrl.searchParams.set('auth', 'success')
      return redirectWithCookies(redirectUrl.toString())
    }

    console.log('[Auth Callback] Code Error:', error?.message || 'No session returned')
  }

  // Return to home with error
  return NextResponse.redirect(`${origin}?error=auth`)
}

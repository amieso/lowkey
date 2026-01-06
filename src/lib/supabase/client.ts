import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

let client: ReturnType<typeof createSupabaseClient<Database>> | null = null

export function createClient() {
  // Only create client in browser environment
  if (typeof window === 'undefined') {
    // Return a new client for SSR (won't persist)
    return createSupabaseClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }

  // Client-side: use singleton with localStorage session storage
  // Using @supabase/supabase-js instead of @supabase/ssr to avoid
  // navigator.locks bug that causes getSession() to hang indefinitely
  if (!client) {
    client = createSupabaseClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          detectSessionInUrl: true,
          persistSession: true,
        },
      }
    )
  }
  return client
}

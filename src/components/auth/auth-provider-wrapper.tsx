import { createClient } from '@/lib/supabase/server'
import { AuthProvider } from '@/contexts/auth-context'

interface AuthProviderWrapperProps {
  children: React.ReactNode
}

export async function AuthProviderWrapper({ children }: AuthProviderWrapperProps) {
  const supabase = await createClient()
  // getUser() validates with Supabase server - ensures fresh auth state
  const { data: { user } } = await supabase.auth.getUser()

  // Pass initial auth state to client - this prevents flash
  const initialAuthState = user ? 'authenticated' : 'unauthenticated'

  return (
    <AuthProvider initialAuthState={initialAuthState}>
      {children}
    </AuthProvider>
  )
}

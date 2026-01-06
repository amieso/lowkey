import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/database'

export type AuthProvider = 'google' | 'github'

export interface SignUpData {
  email: string
  password: string
  name?: string
}

export interface SignInData {
  email: string
  password: string
}

export interface AuthUser {
  id: string
  email: string
  profile: Profile | null
}

class AuthService {
  private pendingGetUser: Promise<AuthUser | null> | null = null

  private getSupabase() {
    return createClient()
  }

  async signUp({ email, password, name }: SignUpData) {
    const { data, error } = await this.getSupabase().auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    })

    if (error) throw error
    return data
  }

  async signIn({ email, password }: SignInData) {
    const { data, error } = await this.getSupabase().auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error
    return data
  }

  async signInWithOAuth(provider: AuthProvider) {
    const { data, error } = await this.getSupabase().auth.signInWithOAuth({
      provider,
      options: {
        // Redirect back to origin - the client will detect session in URL
        redirectTo: `${window.location.origin}`,
        skipBrowserRedirect: false,
      },
    })

    if (error) throw error
    return data
  }

  async signInWithMagicLink(email: string) {
    const { data, error } = await this.getSupabase().auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) throw error
    return data
  }

  async signOut() {
    const { error } = await this.getSupabase().auth.signOut()
    if (error) throw error
  }

  async getUser(): Promise<AuthUser | null> {
    // Dedupe concurrent calls - if one is in flight, return same promise
    if (this.pendingGetUser) {
      return this.pendingGetUser
    }

    this.pendingGetUser = this._getUser()
    try {
      return await this.pendingGetUser
    } finally {
      this.pendingGetUser = null
    }
  }

  private async _getUser(): Promise<AuthUser | null> {
    try {
      const supabase = this.getSupabase()
      // Use getSession() for initial check - faster and works offline
      // getUser() validates with server but can hang if network issues
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.user) {
        return null
      }

      const user = session.user

      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      return {
        id: user.id,
        email: user.email!,
        profile,
      }
    } catch (err) {
      console.error('[AuthService] getUser error:', err)
      return null
    }
  }

  async getSession() {
    const { data: { session }, error } = await this.getSupabase().auth.getSession()
    if (error) throw error
    return session
  }

  onAuthStateChange(callback: (user: AuthUser | null) => void) {
    const supabase = this.getSupabase()
    return supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        callback({
          id: session.user.id,
          email: session.user.email!,
          profile,
        })
      } else {
        callback(null)
      }
    })
  }

  async resetPassword(email: string) {
    const { error } = await this.getSupabase().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    if (error) throw error
  }

  async updatePassword(password: string) {
    const { error } = await this.getSupabase().auth.updateUser({ password })
    if (error) throw error
  }
}

export const authService = new AuthService()

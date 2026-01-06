import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/database'

interface ProfileUpdateInput {
  name?: string | null
  username?: string | null
  bio?: string | null
  website_url?: string | null
  twitter_handle?: string | null
  avatar_url?: string | null
}

class ProfileService {
  private getSupabase() {
    return createClient()
  }

  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await this.getSupabase()
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching profile:', error)
      return null
    }

    return data as Profile
  }

  async getProfileByUsername(username: string): Promise<Profile | null> {
    const { data, error } = await this.getSupabase()
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single()

    if (error) {
      console.error('Error fetching profile by username:', error)
      return null
    }

    return data as Profile
  }

  async updateProfile(userId: string, updates: ProfileUpdateInput): Promise<Profile | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (this.getSupabase() as any)
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating profile:', error)
      throw error
    }

    return data as Profile
  }

  async checkUsernameAvailable(username: string): Promise<boolean> {
    const { data, error } = await this.getSupabase()
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single()

    if (error && error.code === 'PGRST116') {
      // No rows returned = username available
      return true
    }

    return !data
  }

  async uploadAvatar(userId: string, file: File): Promise<string> {
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}/avatar.${fileExt}`

    const { error: uploadError } = await this.getSupabase().storage
      .from('avatars')
      .upload(fileName, file, { upsert: true })

    if (uploadError) throw uploadError

    const { data } = this.getSupabase().storage
      .from('avatars')
      .getPublicUrl(fileName)

    // Update profile with new avatar URL
    await this.updateProfile(userId, { avatar_url: data.publicUrl })

    return data.publicUrl
  }
}

export const profileService = new ProfileService()

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          name: string | null
          username: string | null
          avatar_url: string | null
          bio: string | null
          website_url: string | null
          twitter_handle: string | null
          plan: 'free' | 'pro'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          username?: string | null
          avatar_url?: string | null
          bio?: string | null
          website_url?: string | null
          twitter_handle?: string | null
          plan?: 'free' | 'pro'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          username?: string | null
          avatar_url?: string | null
          bio?: string | null
          website_url?: string | null
          twitter_handle?: string | null
          plan?: 'free' | 'pro'
          created_at?: string
          updated_at?: string
        }
      }
      companies: {
        Row: {
          id: string
          slug: string
          name: string
          logo_url: string | null
          description: string | null
          website_url: string | null
          twitter_url: string | null
          linkedin_url: string | null
          founded_year: number | null
          company_size: 'startup' | 'mid' | 'enterprise' | null
          industry: string | null
          location: string | null
          created_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          logo_url?: string | null
          description?: string | null
          website_url?: string | null
          twitter_url?: string | null
          linkedin_url?: string | null
          founded_year?: number | null
          company_size?: 'startup' | 'mid' | 'enterprise' | null
          industry?: string | null
          location?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          logo_url?: string | null
          description?: string | null
          website_url?: string | null
          twitter_url?: string | null
          linkedin_url?: string | null
          founded_year?: number | null
          company_size?: 'startup' | 'mid' | 'enterprise' | null
          industry?: string | null
          location?: string | null
          created_at?: string
        }
      }
      collections: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          is_public: boolean
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          is_public?: boolean
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          is_public?: boolean
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      collection_items: {
        Row: {
          id: string
          collection_id: string
          video_slug: string
          note: string | null
          added_at: string
        }
        Insert: {
          id?: string
          collection_id: string
          video_slug: string
          note?: string | null
          added_at?: string
        }
        Update: {
          id?: string
          collection_id?: string
          video_slug?: string
          note?: string | null
          added_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      plan_type: 'free' | 'pro'
      company_size: 'startup' | 'mid' | 'enterprise'
    }
  }
}

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Company = Database['public']['Tables']['companies']['Row']
export type Collection = Database['public']['Tables']['collections']['Row']
export type CollectionItem = Database['public']['Tables']['collection_items']['Row']

export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']
export type CollectionInsert = Database['public']['Tables']['collections']['Insert']
export type CollectionUpdate = Database['public']['Tables']['collections']['Update']

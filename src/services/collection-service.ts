import { createClient } from '@/lib/supabase/client'
import type { Collection, CollectionItem } from '@/types/database'

export interface CollectionWithItems extends Collection {
  items: CollectionItem[]
  item_count: number
}

interface CreateCollectionInput {
  user_id: string
  name: string
  description?: string | null
  is_public?: boolean
  is_default?: boolean
}

interface UpdateCollectionInput {
  name?: string
  description?: string | null
  is_public?: boolean
}

class CollectionService {
  private getSupabase() {
    return createClient()
  }

  async getCollections(userId: string): Promise<Collection[]> {
    const { data, error } = await this.getSupabase()
      .from('collections')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching collections:', error)
      return []
    }

    return (data || []) as Collection[]
  }

  async getCollection(collectionId: string): Promise<CollectionWithItems | null> {
    const { data: collection, error } = await this.getSupabase()
      .from('collections')
      .select('*')
      .eq('id', collectionId)
      .single()

    if (error || !collection) {
      console.error('Error fetching collection:', error)
      return null
    }

    const { data: items } = await this.getSupabase()
      .from('collection_items')
      .select('*')
      .eq('collection_id', collectionId)
      .order('added_at', { ascending: false })

    const c = collection as Collection
    const i = (items || []) as CollectionItem[]

    return {
      id: c.id,
      user_id: c.user_id,
      name: c.name,
      description: c.description,
      is_public: c.is_public,
      is_default: c.is_default,
      created_at: c.created_at,
      updated_at: c.updated_at,
      items: i,
      item_count: i.length,
    }
  }

  async getDefaultCollection(userId: string): Promise<Collection | null> {
    const { data, error } = await this.getSupabase()
      .from('collections')
      .select('*')
      .eq('user_id', userId)
      .eq('is_default', true)
      .single()

    if (error) {
      console.error('Error fetching default collection:', error)
      return null
    }

    return data as Collection
  }

  async createCollection(input: CreateCollectionInput): Promise<Collection> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (this.getSupabase() as any)
      .from('collections')
      .insert(input)
      .select()
      .single()

    if (error) throw error
    return data as Collection
  }

  async updateCollection(collectionId: string, updates: UpdateCollectionInput): Promise<Collection> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (this.getSupabase() as any)
      .from('collections')
      .update(updates)
      .eq('id', collectionId)
      .select()
      .single()

    if (error) throw error
    return data as Collection
  }

  async deleteCollection(collectionId: string): Promise<void> {
    const { error } = await this.getSupabase()
      .from('collections')
      .delete()
      .eq('id', collectionId)

    if (error) throw error
  }

  async addToCollection(collectionId: string, videoSlug: string, note?: string): Promise<CollectionItem> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (this.getSupabase() as any)
      .from('collection_items')
      .insert({
        collection_id: collectionId,
        video_slug: videoSlug,
        note: note || null,
      })
      .select()
      .single()

    if (error) throw error
    return data as CollectionItem
  }

  async removeFromCollection(collectionId: string, videoSlug: string): Promise<void> {
    const { error } = await this.getSupabase()
      .from('collection_items')
      .delete()
      .eq('collection_id', collectionId)
      .eq('video_slug', videoSlug)

    if (error) throw error
  }

  async isVideoSaved(userId: string, videoSlug: string): Promise<boolean> {
    const collections = await this.getCollections(userId)
    if (collections.length === 0) return false

    const collectionIds = collections.map(c => c.id)

    const { data, error } = await this.getSupabase()
      .from('collection_items')
      .select('id')
      .eq('video_slug', videoSlug)
      .in('collection_id', collectionIds)
      .limit(1)

    if (error) {
      console.error('Error checking if video is saved:', error)
      return false
    }

    return ((data as unknown[]) || []).length > 0
  }

  async getVideoCollections(userId: string, videoSlug: string): Promise<string[]> {
    const collections = await this.getCollections(userId)
    if (collections.length === 0) return []

    const collectionIds = collections.map(c => c.id)

    const { data, error } = await this.getSupabase()
      .from('collection_items')
      .select('collection_id')
      .eq('video_slug', videoSlug)
      .in('collection_id', collectionIds)

    if (error) {
      console.error('Error fetching video collections:', error)
      return []
    }

    return ((data || []) as { collection_id: string }[]).map(item => item.collection_id)
  }

  async quickSave(userId: string, videoSlug: string): Promise<void> {
    const defaultCollection = await this.getDefaultCollection(userId)
    if (!defaultCollection) throw new Error('No default collection found')

    await this.addToCollection(defaultCollection.id, videoSlug)
  }

  async quickUnsave(userId: string, videoSlug: string): Promise<void> {
    const defaultCollection = await this.getDefaultCollection(userId)
    if (!defaultCollection) throw new Error('No default collection found')

    await this.removeFromCollection(defaultCollection.id, videoSlug)
  }
}

export const collectionService = new CollectionService()

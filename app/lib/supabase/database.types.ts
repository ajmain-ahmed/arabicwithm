// app/lib/supabase/database.types.ts
// Minimal Supabase database types inferred from the codebase.
// Run `npx supabase gen types typescript --project-id <id>` to replace this
// with generated types from the actual database schema.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      shows: {
        Row: {
          id: string
          slug: string
          title: string
          title_ar: string | null
          description: string | null
          cover: string | null
          level: string
          category: string | null
        }
        Insert: {
          id?: string
          slug: string
          title: string
          title_ar?: string | null
          description?: string | null
          cover?: string | null
          level?: string
          category?: string | null
        }
        Update: {
          id?: string
          slug?: string
          title?: string
          title_ar?: string | null
          description?: string | null
          cover?: string | null
          level?: string
          category?: string | null
        }
        Relationships: []
      }
      episodes: {
        Row: {
          id: string
          show_id: string
          slug: string
          title: string
          level: string
          tags: string[] | null
          description: string | null
          youtube_id: string | null
          instagram_id: string | null
          tiktok_id: string | null
          facebook_id: string | null
          cover: string | null
          created_at: string | null
          transcript: Json | null
        }
        Insert: {
          id?: string
          show_id: string
          slug: string
          title: string
          level?: string
          tags?: string[] | null
          description?: string | null
          youtube_id?: string | null
          instagram_id?: string | null
          tiktok_id?: string | null
          facebook_id?: string | null
          cover?: string | null
          created_at?: string | null
          transcript?: Json | null
        }
        Update: {
          id?: string
          show_id?: string
          slug?: string
          title?: string
          level?: string
          tags?: string[] | null
          description?: string | null
          youtube_id?: string | null
          instagram_id?: string | null
          tiktok_id?: string | null
          facebook_id?: string | null
          cover?: string | null
          created_at?: string | null
          transcript?: Json | null
        }
        Relationships: []
      }
      books: {
        Row: {
          id: string
          slug: string
          title: string
          title_ar: string | null
          description: string | null
          cover: string | null
          level: string
          category: string | null
          tags: string[]
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          slug: string
          title: string
          title_ar?: string | null
          description?: string | null
          cover?: string | null
          level?: string
          category?: string | null
          tags?: string[]
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          slug?: string
          title?: string
          title_ar?: string | null
          description?: string | null
          cover?: string | null
          level?: string
          category?: string | null
          tags?: string[]
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      chapters: {
        Row: {
          id: string
          book_id: string
          slug: string
          title: string
          chapter_number: number
          created_at: string | null
          updated_at: string | null
          content: Json | null
        }
        Insert: {
          id?: string
          book_id: string
          slug: string
          title: string
          chapter_number?: number
          created_at?: string | null
          updated_at?: string | null
          content?: Json | null
        }
        Update: {
          id?: string
          book_id?: string
          slug?: string
          title?: string
          chapter_number?: number
          created_at?: string | null
          updated_at?: string | null
          content?: Json | null
        }
        Relationships: []
      }
      hanswehr_dictionary: {
        Row: {
          id: number
          word: string
          definition: string
          is_root: boolean
          parent_id: number
          quran_occurrence: number | null
          search_vector: string | null
        }
        Insert: {
          id?: number
          word: string
          definition: string
          is_root?: boolean
          parent_id?: number
          quran_occurrence?: number | null
          search_vector?: string | null
        }
        Update: {
          id?: number
          word?: string
          definition?: string
          is_root?: boolean
          parent_id?: number
          quran_occurrence?: number | null
          search_vector?: string | null
        }
        Relationships: []
      }
      phrases: {
        Row: {
          id: number
          phrase_ar_di: string
          phrase_tr: string
          english: string
          cefr: string
          notes: string | null
        }
        Insert: {
          id?: number
          phrase_ar_di: string
          phrase_tr: string
          english: string
          cefr: string
          notes?: string | null
        }
        Update: {
          id?: number
          phrase_ar_di?: string
          phrase_tr?: string
          english?: string
          cefr?: string
          notes?: string | null
        }
        Relationships: []
      }
      learning_profiles: {
        Row: {
          user_id: string
          weekly_goal_seconds: number | null
          legacy_active_seconds: number
          tracked_active_seconds: number
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          weekly_goal_seconds?: number | null
          legacy_active_seconds?: number
          tracked_active_seconds?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          weekly_goal_seconds?: number | null
          legacy_active_seconds?: number
          tracked_active_seconds?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      learning_activity_daily: {
        Row: {
          user_id: string
          activity_date: string
          active_seconds: number
          reading_seconds: number
          video_seconds: number
          word_lookups: number
          updated_at: string
        }
        Insert: {
          user_id: string
          activity_date: string
          active_seconds?: number
          reading_seconds?: number
          video_seconds?: number
          word_lookups?: number
          updated_at?: string
        }
        Update: {
          user_id?: string
          activity_date?: string
          active_seconds?: number
          reading_seconds?: number
          video_seconds?: number
          word_lookups?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      increment_learning_activity: {
        Args: {
          p_user_id: string
          p_activity_date: string
          p_active_seconds: number
          p_reading_seconds: number
          p_video_seconds: number
          p_word_lookups: number
        }
        Returns: undefined
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

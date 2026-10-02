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

type Table<Row> = { Row: { [K in keyof Row]: Row[K] }; Insert: { [K in keyof Row]?: Row[K] }; Update: { [K in keyof Row]?: Row[K] }; Relationships: [] }
export interface Database {
  public: {
    Tables: {
      account_roles: Table<{ user_id: string; role: 'user' | 'editor' | 'admin'; updated_at: string }>
      access_change_audit: Table<import('@/app/lib/reviews').AccessChange>
      content_suggestions: Table<import('@/app/lib/reviews').ContentSuggestion>
      feedback: Table<{ id: string; user_id: string; rating: number; comment: string | null; created_at: string }>
      subscriptions: Table<{ user_id: string; customer_id: string; subscription_id: string | null; status: string; current_period_end: string; cancel_at_period_end: boolean; event_created: number }>
      memory_reviews: Table<{ user_id: string; completion_id: string; card_id: string; rating: string; activity_date: string; xp: number; created_at: string }>
      memory_sessions: Table<{ user_id: string; state: Json; updated_at: string }>
      memory_legacy_progress: Table<{ user_id: string; xp: number }>
      word_search_completions: Table<{ id: string; user_id: string; puzzle_id: string; source_type: 'episode' | 'book'; source_id: string; difficulty: string; word_count: number; words_found: number; mistakes: number; hints_used: number; reveals_used: number; duration_seconds: number; xp_earned: number; activity_date: string; completed_at: string }>
      book_chapter_audio: Table<{ id: string; chapter_id: string; source_type: 'supabase_storage' | 'youtube'; storage_path: string | null; external_video_id: string | null; duration_seconds: number | null; narrator: string | null; is_published: boolean; created_at: string; updated_at: string }>
      book_audio_progress: Table<{ user_id: string; chapter_id: string; position_seconds: number; completed: boolean; updated_at: string }>
      public_profiles: Table<{ user_id: string; display_name: string; is_public: boolean; share_reading: boolean; created_at: string }>

      shows: {
        Row: {
          id: string
          slug: string
          title: string
          title_ar: string | null
          description: string | null
          cover: string | null
          cover_crop: Json
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
          cover_crop?: Json
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
          cover_crop?: Json
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
          cover_crop: Json
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
          cover_crop?: Json
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
          cover_crop?: Json
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
          author: string | null
          reading_time_minutes: number | null
          premium_exempt: boolean
          free_chapter_count: number
          title_ar: string | null
          description: string | null
          cover: string | null
          cover_crop: Json
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
          author?: string | null
          reading_time_minutes?: number | null
          premium_exempt?: boolean
          free_chapter_count?: number
          title_ar?: string | null
          description?: string | null
          cover?: string | null
          cover_crop?: Json
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
          author?: string | null
          reading_time_minutes?: number | null
          premium_exempt?: boolean
          free_chapter_count?: number
          title_ar?: string | null
          description?: string | null
          cover?: string | null
          cover_crop?: Json
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
      website_memory_totals: { Args: { p_user_id: string; p_since?: string }; Returns: Json }
      website_learning_history: { Args: { p_user_id: string }; Returns: Json }
      account_role: { Args: { p_user_id: string }; Returns: string }
      change_account_role: { Args: { p_actor: string; p_target: string; p_role: string; p_reason: string }; Returns: undefined }
      admin_user_directory: { Args: { p_actor: string; p_tab: string; p_search: string; p_page: number; p_size: number }; Returns: Json }
      review_source: { Args: { p_type: string; p_target: string }; Returns: Json }
      submit_content_suggestion: { Args: { p_actor: string; p_type: string; p_target: string; p_line: number; p_document: Json; p_arabic: string; p_english: string; p_comment: string; p_reason: string }; Returns: string }
      edit_content_suggestion: { Args: { p_actor: string; p_id: string; p_withdraw: boolean; p_arabic: string; p_english: string; p_comment: string; p_reason: string }; Returns: undefined }
      review_content_suggestion: { Args: { p_actor: string; p_id: string; p_action: string; p_response: string; p_tokens: Json }; Returns: Json }
      memory_totals: { Args: { p_user_id: string; p_since?: string }; Returns: Json }
      complete_memory_card: { Args: { p_user_id: string; p_completion_id: string; p_card_id: string; p_rating: string; p_xp: number; p_daily_limit: number; p_has_premium: boolean; p_session: Json }; Returns: Json }
      learning_xp_totals: { Args: { p_user_id: string; p_since?: string | null }; Returns: Json }
      complete_word_search: { Args: { p_user_id: string; p_completion_id: string; p_puzzle_id: string; p_source_type: string; p_source_id: string; p_difficulty: string; p_word_count: number; p_words_found: number; p_mistakes: number; p_hints_used: number; p_reveals_used: number; p_duration_seconds: number; p_xp: number }; Returns: Json }
      apply_subscription_event: { Args: { p_user_id: string; p_event_created: number; p_subscription_id: string; p_status: string; p_period_end: string; p_cancel_at_period_end: boolean }; Returns: undefined }

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

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
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

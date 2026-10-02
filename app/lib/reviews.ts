import type { Json } from '@/app/lib/supabase/database.types'

export type AccountRole = 'user' | 'editor' | 'admin'
export type ReviewType = 'book' | 'show'
export type SuggestionStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn'
export interface DirectoryUser {
 id: string; email: string | null; name: string; avatar: string | null; role: AccountRole
 joined: string; last_sign_in: string | null; premium: boolean; paid_premium: boolean
 subscription_status: string | null; current_period_end: string | null; cancel_at_period_end: boolean | null
 banned_until: string | null; activity: Partial<Record<SuggestionStatus, number>> | null
}
export interface DirectoryResult { users: DirectoryUser[]; total: number; counts: Record<'all' | 'premium' | 'editor' | 'admin', number> }
export interface ContentSuggestion {
 id: string; author_id: string; content_type: ReviewType; parent_id: string; target_id: string; line_index: number
 location: string; original_document?: Json; original_block: Json; original_arabic: string; original_english: string
 suggested_arabic: string | null; suggested_english: string | null; suggested_tokens: Json
 comment: string; reason: string; status: SuggestionStatus; created_at: string; updated_at: string
 reviewed_by: string | null; reviewed_at: string | null; admin_response: string | null
}
export interface AccessChange { id: string; target_user_id: string; previous_role: string; new_role: string; changed_by: string; changed_at: string; reason: string }
export interface ReviewBlock { tokens: { arabic: string; [key: string]: Json | undefined }[]; translation: string; [key: string]: Json | undefined }
export interface ReviewSource { document: ReviewBlock[]; parent: string; location: string }
export interface SuggestionInput { arabic: string; english: string; comment: string; reason: string }

'use server'

import { z } from 'zod'
import { getAuthClient } from '@/app/lib/supabase/server'
import { rateLimit } from '@/app/lib/rateLimit'

export interface BookReminderState { active: boolean; fulfilled: boolean }
export type BookReminderResult = { ok: true; state: BookReminderState } | { ok: false; error: string }

export async function bookReleaseReminder(bookId: string): Promise<BookReminderResult> {
  if (!z.string().uuid().safeParse(bookId).success) return { ok: false, error: 'Invalid book.' }
  const client = await getAuthClient()
  const { data: identity, error: authError } = await client.auth.getUser()
  if (authError || !identity.user) return { ok: false, error: 'Sign in to set a reminder.' }
  const { data, error } = await client.from('book_release_reminders').select('fulfilled_at').eq('book_id', bookId).eq('user_id', identity.user.id).maybeSingle()
  if (error) return { ok: false, error: 'Your reminder could not be loaded. Please try again.' }
  return { ok: true, state: { active: Boolean(data && !data.fulfilled_at), fulfilled: Boolean(data?.fulfilled_at) } }
}

export async function setBookReleaseReminder(bookId: string, subscribe: boolean): Promise<BookReminderResult> {
  if (!z.string().uuid().safeParse(bookId).success || typeof subscribe !== 'boolean') return { ok: false, error: 'Invalid reminder request.' }
  const client = await getAuthClient()
  const { data: identity, error: authError } = await client.auth.getUser()
  if (authError || !identity.user) return { ok: false, error: 'Sign in to set a reminder.' }
  if (!rateLimit(`book-reminder:${identity.user.id}`, 30, 60_000).ok) return { ok: false, error: 'Please wait a moment and try again.' }
  // The RPC takes no user ID. It binds auth.uid(), locks the book against a
  // simultaneous release, and preserves fulfilled history across reopenings.
  const { error } = await client.rpc('set_book_release_reminder', { p_book_id: bookId, p_subscribe: subscribe })
  if (error) return { ok: false, error: 'Your reminder could not be updated. Please try again.' }
  return bookReleaseReminder(bookId)
}

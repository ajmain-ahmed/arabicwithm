'use server'

import { z } from 'zod'
import { getAuthenticatedUserId } from '@/app/actions/auth'
import { serviceClient } from '@/app/lib/supabase'

const schema = z.object({ rating: z.number().int().min(1).max(5), comment: z.string().trim().max(2000), submissionId: z.string().uuid() })

export async function submitFeedback(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const parsed = schema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Choose 1–5 stars and keep comments under 2,000 characters.' }
  try {
    const userId = await getAuthenticatedUserId()
    if (!userId) return { ok: false, error: 'Please sign in to submit feedback.' }
    const { error } = await serviceClient.from('feedback').insert({ id: parsed.data.submissionId, user_id: userId, rating: parsed.data.rating, comment: parsed.data.comment || null })
    if (error && error.code !== '23505') {
      console.error('[feedback] insert failed', error)
      return { ok: false, error: 'Feedback could not be saved. Please try again later.' }
    }
    return { ok: true }
  } catch (error) {
    console.error('[feedback]', error)
    return { ok: false, error: 'Feedback could not be saved. Please try again later.' }
  }
}

'use server'
import { serviceClient } from '@/app/lib/supabase'
import { getAuthenticatedUserId } from '@/app/actions/auth'
import { headers } from 'next/headers'
import { rateLimit } from '@/app/lib/rateLimit'

export interface ContentHit {
  key: string; kind: 'show' | 'episode' | 'book' | 'chapter'; title: string;
  source: string; arabic: string; english: string; href: string;
}
export async function searchLearningContent(query: string, after = ''): Promise<{ hits: ContentHit[]; more: boolean; error?: string }> {
  if (typeof query !== 'string' || query.trim().length < 2 || query.length > 120 || typeof after !== 'string' || after.length > 120)
    return {hits:[],more:false,error:'Enter between 2 and 120 characters.'}
  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0] ?? 'local'
  if (!rateLimit(`content-search:${ip}`, 30, 60000).ok) return {hits:[],more:false,error:'Please wait a moment before searching again.'}
  const signedIn = !!await getAuthenticatedUserId()
  // Service-only RPC. The browser never receives privileged keys or full content.
  const { data, error } = await serviceClient.rpc('website_search_content_v1' as never,
    { p_query: query.trim(), p_after: after, p_limit: 21, p_books: signedIn } as never)
    .abortSignal(AbortSignal.timeout(8000))
  if (error) {
    console.error('[content search]', { code: error.code, message: error.message })
    return {hits:[],more:false,error:'Search is temporarily unavailable. Please try again.'}
  }
  const hits = (Array.isArray(data) ? data : []) as ContentHit[]
  return { hits: hits.slice(0, 20), more: hits.length > 20 }
}

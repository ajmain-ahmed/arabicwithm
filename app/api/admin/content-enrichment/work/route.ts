import { serviceClient } from '@/app/lib/supabase'
import { enrichArabicContent } from '@/app/lib/contentEnrichment/service'

export async function POST(request: Request) {
  const token = request.headers.get('x-transcript-worker')
  if (!token || token.length > 1024)
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  const { data, error } = await serviceClient.rpc(
    'transcript_worker_authorised' as never,
    { p_token: token } as never,
  )
  if (error || data !== true) return Response.json({ error: 'unauthorized' }, { status: 401 })
  const results = await Promise.all([enrichArabicContent(), enrichArabicContent()])
  return Response.json({ results })
}

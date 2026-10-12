// Read-only backend comparison. Run: node --env-file=.env.local scripts/check-admin-catalogue-performance.mjs
import { createClient } from '@supabase/supabase-js'
import { performance } from 'node:perf_hooks'

const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
const chapterSummary = 'id,book_id,slug,title,chapter_number,created_at,updated_at'
const episodeSummary = 'id,show_id,slug,title,level,tags,description,youtube_id,instagram_id,tiktok_id,facebook_id,cover,cover_crop,created_at'
async function rows(query) {
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}
const scenarios = {
  'Books before (N+1)': async () => {
    const books = await rows(client.from('books').select('*').order('title'))
    const chapters = (await Promise.all(books.map(book => rows(client.from('chapters').select('*').eq('book_id', book.id).order('chapter_number'))))).flat()
    return { requests: 1 + books.length, books, chapters }
  },
  'Books after (summaries)': async () => {
    const [books, chapters] = await Promise.all([
      rows(client.from('books').select('id,slug,title,author,reading_time_minutes,title_ar,description,cover,cover_crop,level,category,created_at,updated_at').order('title').limit(1000)),
      rows(client.from('chapters').select(chapterSummary).order('chapter_number').limit(1000)),
    ])
    return { requests: 2, books, chapters }
  },
  'Shows before (full episodes)': async () => {
    const [shows, episodes] = await Promise.all([rows(client.from('shows').select('*').order('title')), rows(client.from('episodes').select('*').order('show_id').order('created_at'))])
    return { requests: 2, shows, episodes }
  },
  'Shows after (summaries)': async () => {
    const [shows, episodes] = await Promise.all([
      rows(client.from('shows').select('id,slug,title,title_ar,description,cover,cover_crop,level,category').order('title').limit(1000)),
      rows(client.from('episodes').select(episodeSummary).order('show_id').order('created_at').limit(1000)),
    ])
    return { requests: 2, shows, episodes }
  },
}
const report = []
for (const [scenario, run] of Object.entries(scenarios)) {
  const elapsed = []
  let result
  for (let sample = 0; sample < 3; sample++) {
    const start = performance.now()
    result = await run()
    elapsed.push(Math.round(performance.now() - start))
  }
  elapsed.sort((a, b) => a - b)
  const { requests, ...data } = result
  report.push({ scenario, databaseHttpRequests: requests, decodedJsonBytes: Buffer.byteLength(JSON.stringify(data)), medianMs: elapsed[1], rangeMs: `${elapsed[0]}–${elapsed[2]}` })
}
console.table(report)
console.log('Database HTTP queries only; excludes Admin auth, browser rendering, route requests, compression, and application serialization.')

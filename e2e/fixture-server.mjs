// Isolated HTTP contract fixture. Production authorization runs unchanged;
// only this child Next process points at these synthetic accounts and records.
import https from 'node:https'
import { spawn, spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync } from 'node:fs'
import path from 'node:path'

const fixtureBuild = path.resolve('.next-browser')
if (!fixtureBuild.startsWith(`${process.cwd()}${path.sep}`)) throw new Error('Fixture cache must stay in the workspace.')
rmSync(fixtureBuild, { recursive: true, force: true })
mkdirSync(fixtureBuild, { recursive: true })
const certificate = path.join(fixtureBuild, 'fixture-cert.pem')
const privateKey = path.join(fixtureBuild, 'fixture-key.pem')
const openssl = process.env.OPENSSL_PATH ?? (process.platform === 'win32' ? 'C:/Program Files/Git/usr/bin/openssl.exe' : 'openssl')
const generated = spawnSync(openssl, ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-keyout', privateKey, '-out', certificate, '-subj', '/CN=localhost', '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1'], { stdio: 'ignore' })
if (generated.status !== 0) throw new Error('OpenSSL is required for the local HTTPS media fixture.')

const ids = {
  free: '11111111-1111-4111-8111-111111111111',
  premium: '22222222-2222-4222-8222-222222222222',
  reviewer: '33333333-3333-4333-8333-333333333333',
  admin: '44444444-4444-4444-8444-444444444444',
}
const bookId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const chapterId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const showId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const metadata = new Map()
function account(id) {
  const kind = Object.keys(ids).find(key => ids[key] === id) ?? 'free'
  return { id, aud: 'authenticated', role: 'authenticated', email: `${kind}@fixture.example`, email_confirmed_at: '2026-01-01T00:00:00Z', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: { full_name: `${kind} learner`, ...metadata.get(id) }, identities: [] }
}
const content = Array.from({ length: 30 }, (_, i) => ({ paragraph: i + 1, tokens: [{ arabic: 'كِتَابٌ', headword: 'كِتَاب', english: 'book', pos: 'noun', cefr: 'a1' }], translation: `A book. Paragraph ${i + 1}.` }))
const tables = {
  books: [{ id: bookId, slug: 'test-book', title: 'Test Book', title_ar: 'كتاب', author: 'Fixture Author', level: 'A1', tags: [], premium_exempt: false, free_chapter_count: 5 }],
  chapters: [{ id: chapterId, book_id: bookId, slug: 'chapter-1', title: 'First Chapter', chapter_number: 1, content }],
  shows: [{ id: showId, slug: 'test-show', title: 'Test Show', title_ar: 'كتاب', level: 'A1', tags: [] }],
  episodes: Array.from({ length: 4 }, (_, i) => ({ id: `dddddddd-dddd-4ddd-8ddd-ddddddddddd${i}`, show_id: showId, slug: `clip-${i}`, title: `Clip ${i}`, youtube_id: ['abcdefghij0', 'abcdefghij1', 'abcdefghij2', 'abcdefghij3'][i], level: 'A1', tags: [], transcript: [{ timestamp: '0:00', tokens: [{ arabic: 'كِتَابٌ', english: 'book', pos: 'noun', cefr: 'a1' }], translation: 'A book.' }], created_at: '2026-01-01T00:00:00Z' })),
  book_chapter_audio: ['ar', 'en'].map(language => ({ chapter_id: chapterId, language, is_published: true, source_type: 'supabase_storage', storage_bucket: 'audiobooks', storage_path: `fixture/${language}/chapter.wav`, duration_seconds: 60, narrator: 'Fixture Narrator' })),
}
function userFromToken(token) { try { return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).sub } catch { return null } }
function json(res, data, status = 200) { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)) }
// Real decodable, seekable media lets Chromium verify its actual playback state.
const rate = 8000, sampleCount = rate * 60
const wave = Buffer.alloc(44 + sampleCount * 2)
wave.write('RIFF'); wave.writeUInt32LE(wave.length - 8, 4); wave.write('WAVEfmt ', 8); wave.writeUInt32LE(16, 16); wave.writeUInt16LE(1, 20); wave.writeUInt16LE(1, 22); wave.writeUInt32LE(rate, 24); wave.writeUInt32LE(rate * 2, 28); wave.writeUInt16LE(2, 32); wave.writeUInt16LE(16, 34); wave.write('data', 36); wave.writeUInt32LE(sampleCount * 2, 40)
for (let i = 0; i < sampleCount; i++) wave.writeInt16LE(Math.round(Math.sin(i * Math.PI * 2 * 220 / rate) * 150), 44 + i * 2)
const cover = Buffer.from('UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA', 'base64')
const backend = https.createServer({ key: readFileSync(privateKey), cert: readFileSync(certificate) }, async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:3000')
  res.setHeader('Access-Control-Allow-Headers', 'authorization, apikey, x-client-info, content-type, range, prefer, accept, x-supabase-api-version')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD')
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }
  const url = new URL(req.url, 'https://localhost:4310')
  const chunks = []; for await (const chunk of req) chunks.push(chunk)
  let body = {}; try { body = JSON.parse(Buffer.concat(chunks).toString() || '{}') } catch {}
  const userId = userFromToken((req.headers.authorization ?? '').replace(/^Bearer /, ''))
  if (url.pathname.startsWith('/auth/v1/admin/users/')) return json(res, { user: account(url.pathname.split('/').at(-1)) })
  if (url.pathname === '/auth/v1/user') {
    if (req.method === 'PUT' && userId) metadata.set(userId, { ...metadata.get(userId), ...body.data })
    return userId ? json(res, account(userId)) : json(res, { message: 'Auth session missing!' }, 401)
  }
  if (url.pathname === '/auth/v1/logout') return json(res, {})
  if (url.pathname.startsWith('/rest/v1/rpc/')) {
    const rpc = url.pathname.split('/').at(-1)
    if (rpc === 'account_role') {
      await new Promise(resolve => setTimeout(resolve, 350))
      return json(res, body.p_user_id === ids.admin ? 'admin' : body.p_user_id === ids.reviewer ? 'editor' : 'user')
    }
    if (rpc === 'website_learning_history') return json(res, { daily: [], activeDates: [], totals: { readingSeconds: 0, videoSeconds: 0, wordLookups: 0 } })
    if (rpc === 'learning_xp_totals') return json(res, { xp: 0, wordSearchXp: 0, wordSearches: 0 })
    if (rpc === 'website_memory_totals') return json(res, { cards: 0, xp: 0 })
    if (rpc === 'website_memory_allowance') return json(res, { completed: 0, remaining: 30 })
    return json(res, null)
  }
  if (url.pathname.startsWith('/rest/v1/')) {
    const table = url.pathname.split('/').at(-1)
    if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, null, 201)
    const owner = (url.searchParams.get('user_id') ?? '').replace(/^eq\./, '')
    let rows = tables[table] ?? []
    if (table === 'subscriptions') rows = owner === ids.premium ? [{ user_id: owner, status: 'active', current_period_end: '2099-01-01T00:00:00Z', customer_id: 'fixture' }] : []
    if (table === 'public_profiles') rows = [{ user_id: owner, display_name: `${Object.keys(ids).find(k => ids[k] === owner)} learner`, is_public: false, share_reading: false }]
    if (table === 'learning_profiles') rows = [{ user_id: owner, legacy_active_seconds: 0, tracked_active_seconds: 0, weekly_goal_seconds: null }]
    for (const [key, filter] of url.searchParams) {
      if (filter.startsWith('eq.')) rows = rows.filter(row => String(row[key]) === filter.slice(3))
      if (filter.startsWith('in.(')) { const values = filter.slice(4, -1).split(','); rows = rows.filter(row => values.includes(String(row[key]))) }
      if (filter.startsWith('lte.')) rows = rows.filter(row => Number(row[key]) <= Number(filter.slice(4)))
    }
    res.setHeader('Content-Range', `0-${Math.max(0, rows.length - 1)}/${rows.length}`)
    if (req.method === 'HEAD') { res.writeHead(200); res.end(); return }
    return json(res, (req.headers.accept ?? '').includes('application/vnd.pgrst.object+json') ? rows[0] ?? null : rows)
  }
  if (url.pathname === '/storage/v1/bucket/audiobooks') return json(res, { id: 'audiobooks', name: 'audiobooks', public: false })
  if (url.pathname.startsWith('/storage/v1/object/sign/') && req.method === 'POST') return json(res, { signedURL: `${url.pathname.replace('/storage/v1', '')}?token=fixture-only` })
  if (url.pathname.startsWith('/storage/v1/object/sign/')) {
    const match = req.headers.range?.match(/bytes=(\d+)-(\d*)/)
    const start = match ? Number(match[1]) : 0, end = match?.[2] ? Math.min(Number(match[2]), wave.length - 1) : wave.length - 1
    res.writeHead(match ? 206 : 200, { 'Content-Type': 'audio/wav', 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1, ...(match ? { 'Content-Range': `bytes ${start}-${end}/${wave.length}` } : {}) }); res.end(wave.subarray(start, end + 1)); return
  }
  if (url.pathname.startsWith('/storage/v1/object/')) { res.writeHead(200, { 'Content-Type': 'image/webp' }); res.end(cover); return }
  console.error('Unhandled fixture endpoint:', req.method, url.pathname)
  json(res, { message: 'Unknown fixture endpoint' }, 404)
})
backend.listen(4310, '127.0.0.1', () => {
  const next = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', '3000'], {
    stdio: 'inherit',
    env: { ...process.env, AWM_BROWSER_TEST: '1', SUPABASE_URL: 'https://localhost:4310', NEXT_PUBLIC_SUPABASE_URL: 'https://localhost:4310', SUPABASE_SERVICE_KEY: 'fixture-service-key', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'fixture-public-key', NEXT_PUBLIC_SITE_URL: 'http://127.0.0.1:3000', NODE_EXTRA_CA_CERTS: certificate },
  })
  const stop = () => { next.kill(); backend.close(); setTimeout(() => process.exit(), 500).unref() }
  process.on('SIGINT', stop); process.on('SIGTERM', stop)
  next.on('exit', code => { backend.close(); process.exit(code ?? 0) })
})

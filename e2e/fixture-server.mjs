// Isolated HTTP contract fixture. Production authorization runs unchanged;
// only this child Next process points at these synthetic accounts and records.
import https from 'node:https'
import { spawn, spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync } from 'node:fs'
import path from 'node:path'

const webPort = Number(process.env.AWM_TEST_WEB_PORT ?? 3000)
const backendPort = Number(process.env.AWM_TEST_BACKEND_PORT ?? 4310)
const webUrl = `http://127.0.0.1:${webPort}`
const backendUrl = `https://localhost:${backendPort}`
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
const handles=new Map(),profiles=new Map(),roles=new Map(),accessAudit=[]
const roleFor=id=>roles.get(id)??(id===ids.admin?'admin':id===ids.reviewer?'editor':'user')
let failAudioSave = false
const manualPremium=new Map(), memoryStarts=new Map(), memorySnapshots=new Map(), memoryReviews=new Map(), ownReviews=new Map(), earned=new Set(), wordTotals=new Map()
const effective=id=>id===ids.premium||roleFor(id)==='admin'||manualPremium.get(id)===true
const usage=id=>[...memoryStarts.values()].filter(row=>row.userId===id).length
function account(id) {
  const kind = Object.keys(ids).find(key => ids[key] === id) ?? 'free'
  return { id, aud: 'authenticated', role: 'authenticated', email: `${kind}@fixture.example`, email_confirmed_at: '2026-01-01T00:00:00Z', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: { full_name: `${kind} learner`, ...metadata.get(id) }, identities: [] }
}
const content = Array.from({ length: 30 }, (_, i) => ({ paragraph: i + 1, tokens: [{ arabic: 'كِتَابٌ', headword: 'كِتَاب', english: 'book', pos: 'noun', cefr: 'a1' }], translation: `A book. Paragraph ${i + 1}.` }))
const tables = {
  books: [{ id: bookId, slug: 'test-book', title: 'Test Book', title_ar: 'كتاب', author: 'Fixture Author', level: 'A1', tags: [], premium_exempt: false, free_chapter_count: 5 }],
  chapters: [{ id: chapterId, book_id: bookId, slug: 'chapter-1', title: 'First Chapter', chapter_number: 1, content }],
  shows: [{ id: showId, slug: 'test-show', title: 'Test Show', title_ar: 'كتاب', level: 'A1', tags: [] }],
  episodes: Array.from({ length: 4 }, (_, i) => ({ id: `dddddddd-dddd-4ddd-8ddd-ddddddddddd${i}`, show_id: showId, slug: `clip-${i}`, title: `Clip ${i}`, youtube_id: ['abcdefghij0', 'abcdefghij1', 'abcdefghij2', 'abcdefghij3'][i], level: 'A1', tags: [], transcript: [{ timestamp: '0:00', tokens: [{ arabic: '\u0647\u0630\u0627', english: 'this', pos: 'pronoun', cefr: 'a1' }, { arabic: ['\u0643\u062a\u0627\u0628','\u0642\u0644\u0645','\u0628\u064a\u062a','\u0645\u0627\u0621'][i], english: ['book','pen','house','water'][i], pos: 'noun', cefr: 'a1' }], translation: ['This is a book.','This is a pen.','This is a house.','This is water.'][i] }], created_at: '2026-01-01T00:00:00Z' })),
  book_chapter_audio: ['ar', 'en'].map(language => ({ chapter_id: chapterId, language, is_published: true, source_type: 'supabase_storage', storage_bucket: 'audiobooks', storage_path: `fixture/${language}/chapter.wav`, duration_seconds: 60, narrator: 'Fixture Narrator', external_url: null, external_video_id: null })),
}
tables.chapters.push({ id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', book_id: bookId, slug: 'chapter-6', title: 'Sixth Chapter', chapter_number: 6, content })
function userFromToken(token) { try { return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).sub } catch { return null } }
function json(res, data, status = 200) { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)) }
// Real decodable, seekable media lets Chromium verify its actual playback state.
const rate = 8000, sampleCount = rate * 60
const wave = Buffer.alloc(44 + sampleCount * 2)
wave.write('RIFF'); wave.writeUInt32LE(wave.length - 8, 4); wave.write('WAVEfmt ', 8); wave.writeUInt32LE(16, 16); wave.writeUInt16LE(1, 20); wave.writeUInt16LE(1, 22); wave.writeUInt32LE(rate, 24); wave.writeUInt32LE(rate * 2, 28); wave.writeUInt16LE(2, 32); wave.writeUInt16LE(16, 34); wave.write('data', 36); wave.writeUInt32LE(sampleCount * 2, 40)
for (let i = 0; i < sampleCount; i++) wave.writeInt16LE(Math.round(Math.sin(i * Math.PI * 2 * 220 / rate) * 150), 44 + i * 2)
const audioObjects = new Map(['ar', 'en'].map(language => [`audiobooks/fixture/${language}/chapter.wav`, wave]))
const cover = Buffer.from('UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA', 'base64')
const backend = https.createServer({ key: readFileSync(privateKey), cert: readFileSync(certificate) }, async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', webUrl)
  res.setHeader('Access-Control-Allow-Headers', 'authorization, apikey, x-client-info, content-type, range, prefer, accept, x-supabase-api-version, x-upsert')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD')
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }
  const url = new URL(req.url, backendUrl)
  const chunks = []; for await (const chunk of req) chunks.push(chunk)
  let body = {}; try { body = JSON.parse(Buffer.concat(chunks).toString() || '{}') } catch {}
  const userId = userFromToken((req.headers.authorization ?? '').replace(/^Bearer /, ''))
  if (url.pathname === '/fixture/audio-save-failure') { failAudioSave = Boolean(body.fail); return json(res, {}) }
  if(url.pathname==='/fixture/reset-overhaul'){handles.clear();profiles.clear();roles.clear();accessAudit.length=0;manualPremium.clear();memoryStarts.clear();memorySnapshots.clear();memoryReviews.clear();ownReviews.clear();earned.clear();wordTotals.clear();metadata.clear();return json(res,{})}
  if(url.pathname==='/fixture/earned'){earned.add(body.userId);wordTotals.set(body.userId,body.words??100);return json(res,{})}
  if (url.pathname.startsWith('/auth/v1/admin/users/')) {
    const id=url.pathname.split('/').at(-1)
    if(req.method==='PUT')metadata.set(id,{...metadata.get(id),...body.user_metadata})
    return json(res, { user: account(id) })
  }
  if (url.pathname === '/auth/v1/user') {
    if (req.method === 'PUT' && userId) metadata.set(userId, { ...metadata.get(userId), ...body.data })
    return userId ? json(res, account(userId)) : json(res, { message: 'Auth session missing!' }, 401)
  }
  if (url.pathname === '/auth/v1/logout') return json(res, {})
  if (url.pathname.startsWith('/rest/v1/rpc/')) {
    const rpc = url.pathname.split('/').at(-1)
    if (rpc === 'account_role') {
      await new Promise(resolve => setTimeout(resolve, 350))
      return json(res, roleFor(body.p_user_id))
    }
    if(rpc==='set_public_handle'){
      if(!userId)return json(res,{message:'Not authenticated'},403)
      if([...handles.entries()].some(([id,handle])=>id!==userId&&handle===body.p_handle))return json(res,{message:'PUBLIC_ID_TAKEN'},409)
      handles.set(userId,body.p_handle);return json(res,body.p_handle)
    }
    if(rpc==='admin_set_account_access'){
      if(roleFor(body.p_actor)!=='admin')return json(res,{message:'Forbidden'},403)
      manualPremium.set(body.p_target,body.p_premium);roles.set(body.p_target,body.p_role)
      accessAudit.push({enabled:body.p_premium,reason:body.p_notes,changed_at:new Date().toISOString()})
      return json(res,{role:body.p_role,manual:body.p_premium,premium:effective(body.p_target)})
    }
    if(rpc==='account_has_premium')return json(res,effective(body.p_user_id))
    if(rpc==='admin_set_manual_premium'){
      if(body.p_actor!==ids.admin)return json(res,{message:'Forbidden'},403)
      manualPremium.set(body.p_target,body.p_enabled);return json(res,effective(body.p_target))
    }
    if(rpc==='admin_manual_premium_details')return json(res,{enabled:manualPremium.get(body.p_target)===true,history:accessAudit})
    if(rpc==='admin_user_directory'){
      const users=Object.entries(ids).map(([kind,id])=>({id,email:kind+'@fixture.example',name:kind+' learner',avatar:null,joined:'2026-01-01',last_sign_in:null,role:roleFor(id),premium:effective(id),manual_premium:manualPremium.get(id)===true,paid_premium:kind==='premium',subscription_status:kind==='premium'?'active':null,current_period_end:kind==='premium'?'2099-01-01':null,cancel_at_period_end:false,activity:null,banned_until:null}))
      const filtered=users.filter(u=>(body.p_tab==='all'||body.p_tab==='premium'&&u.premium||u.role===body.p_tab)&&(!body.p_search||u.name.includes(body.p_search)||u.email.includes(body.p_search)))
      return json(res,{users:filtered,total:filtered.length,counts:{all:users.length,premium:users.filter(u=>u.premium).length,editor:1,admin:1}})
    }
    if(rpc==='website_memory_session_usage')return json(res,usage(body.p_user_id))
    if(rpc==='website_begin_memory_session'){
      const id=body.p_user_id,state=body.p_state,previous=memoryStarts.get(state.sessionId)
      if(previous)return json(res,{accepted:true,state:previous.state,used:usage(id)})
      if(!effective(id)&&usage(id)>=1)return json(res,{accepted:false,used:usage(id)})
      memoryStarts.set(state.sessionId,{userId:id,state});memorySnapshots.set(id,state)
      return json(res,{accepted:true,state,used:usage(id)})
    }
    if(rpc==='website_save_memory_session'){
      const row=memoryStarts.get(body.p_state.sessionId)
      if(!row||row.userId!==body.p_user_id)return json(res,{message:'Start this session first'},403)
      row.state=body.p_state;memorySnapshots.set(body.p_user_id,body.p_state);return json(res,body.p_state)
    }
    if(rpc==='website_complete_memory_card_v2'){
      const row=memoryStarts.get(body.p_session.sessionId),id=body.p_user_id
      if(!row||row.userId!==id)return json(res,{message:'Forbidden'},403)
      const key=id+':'+body.p_completion_id
      if(!memoryReviews.has(key))memoryReviews.set(key,{userId:id,xp:body.p_rating==='known'?5:1})
      row.state={...body.p_session,sessionXp:[...memoryReviews.values()].filter(r=>r.userId===id).reduce((n,r)=>n+r.xp,0)};memorySnapshots.set(id,row.state)
      return json(res,{accepted:true,awarded:memoryReviews.get(key).xp,used:usage(id),totalXp:row.state.sessionXp})
    }
    if(rpc==='website_learning_history'&&earned.has(body.p_user_id))return json(res,{daily:[],activeDates:[],totals:{readingSeconds:0,videoSeconds:0,wordLookups:wordTotals.get(body.p_user_id)??100}})
    if (rpc === 'website_learning_history') return json(res, { daily: [], activeDates: [], totals: { readingSeconds: 0, videoSeconds: 0, wordLookups: 0 } })
    if (rpc === 'learning_xp_totals') return json(res, { xp: 0, wordSearchXp: 0, wordSearches: 0 })
    if (rpc === 'website_memory_totals') {const rows=[...memoryReviews.values()].filter(r=>r.userId===body.p_user_id);return json(res,{cards:rows.length,xp:rows.reduce((n,r)=>n+r.xp,0)})}
    if (rpc === 'website_memory_allowance') return json(res, { completed: 0, remaining: 30 })
    return json(res, null)
  }
  if (url.pathname.startsWith('/rest/v1/')) {
    const table = url.pathname.split('/').at(-1)
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (table === 'book_chapter_audio') {
        if (failAudioSave) return json(res, { message: 'Simulated database save failure', code: 'XX000' }, 500)
        const index = tables[table].findIndex(row => row.chapter_id === body.chapter_id && row.language === body.language)
        if (index < 0) tables[table].push(body); else tables[table][index] = { ...tables[table][index], ...body }
      }
      if(table==='public_profiles')profiles.set(body.user_id,body)
      if(table==='book_reviews'){
        const id=body.user_id??userId,book=body.book_id??(url.searchParams.get('book_id')??'').replace(/^eq\./,'')
        const key=id+':'+book
        if(req.method==='DELETE')ownReviews.delete(key);else ownReviews.set(key,body)
      }
      return json(res, null, 201)
    }
    const owner = (url.searchParams.get('user_id') ?? '').replace(/^eq\./, '')
    let rows = tables[table] ?? []
    if(table==='memory_sessions')rows=memorySnapshots.has(owner)?[{user_id:owner,state:memorySnapshots.get(owner)}]:[]
    if(table==='book_reviews')rows=[...ownReviews.values()]
    if (table === 'subscriptions') rows = owner === ids.premium ? [{ user_id: owner, status: 'active', current_period_end: '2099-01-01T00:00:00Z', customer_id: 'fixture' }] : []
    if (table === 'public_profiles') rows = [{ user_id: owner, display_name: `${Object.keys(ids).find(k => ids[k] === owner)} learner`, is_public: false, share_reading: false, ...profiles.get(owner) }]
    if(table==='leaderboard_public_profiles')rows=[...handles.entries()].map(([user_id,handle])=>({user_id,handle}))
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
  if (url.pathname.startsWith('/storage/v1/object/upload/sign/')) {
    const objectPath = decodeURIComponent(url.pathname.split('/object/upload/sign/')[1])
    if (req.method === 'POST') return json(res, { url: `/object/upload/sign/${objectPath}?token=fixture-upload` })
    if (req.method === 'PUT') {
      const boundary = req.headers['content-type']?.match(/boundary=(?:"([^"]+)"|([^;]+))/)
      if (!boundary) return json(res, { message: 'Missing multipart boundary' }, 400)
      const raw = Buffer.concat(chunks), marker = Buffer.from(`--${boundary[1] ?? boundary[2]}`)
      let offset = raw.indexOf(marker)
      while (offset >= 0) {
        const next = raw.indexOf(marker, offset + marker.length)
        if (next < 0) break
        const headerEnd = raw.indexOf('\r\n\r\n', offset)
        const headers = raw.subarray(offset, headerEnd).toString()
        if (headerEnd >= 0 && headerEnd < next && headers.includes('filename=')) {
          audioObjects.set(objectPath, raw.subarray(headerEnd + 4, next - 2))
          return json(res, { Key: objectPath })
        }
        offset = next
      }
      return json(res, { message: 'Missing audio file' }, 400)
    }
  }
  if (url.pathname.startsWith('/storage/v1/object/info/')) {
    const bytes = audioObjects.get(decodeURIComponent(url.pathname.split('/object/info/')[1]))
    return bytes ? json(res, { size: bytes.length, content_type: 'audio/wav' }) : json(res, { message: 'Object not found' }, 404)
  }
  if (url.pathname === '/storage/v1/bucket/audiobooks') return json(res, { id: 'audiobooks', name: 'audiobooks', public: false })
  if (url.pathname.startsWith('/storage/v1/object/sign/') && req.method === 'POST') return json(res, { signedURL: `${url.pathname.replace('/storage/v1', '')}?token=fixture-only` })
  if (url.pathname.startsWith('/storage/v1/object/sign/')) {
    const bytes = audioObjects.get(decodeURIComponent(url.pathname.split('/object/sign/')[1]))
    if (!bytes) return json(res, { message: 'Object not found' }, 404)
    const match = req.headers.range?.match(/bytes=(\d+)-(\d*)/)
    const start = match ? Number(match[1]) : 0, end = match?.[2] ? Math.min(Number(match[2]), bytes.length - 1) : bytes.length - 1
    res.writeHead(match ? 206 : 200, { 'Content-Type': 'audio/wav', 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1, ...(match ? { 'Content-Range': `bytes ${start}-${end}/${bytes.length}` } : {}) }); res.end(bytes.subarray(start, end + 1)); return
  }
  if (url.pathname.startsWith('/storage/v1/object/')) { res.writeHead(200, { 'Content-Type': 'image/webp' }); res.end(cover); return }
  console.error('Unhandled fixture endpoint:', req.method, url.pathname)
  json(res, { message: 'Unknown fixture endpoint' }, 404)
})
backend.listen(backendPort, '127.0.0.1', () => {
  const next = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(webPort)], {
    stdio: 'inherit',
    env: { ...process.env, AWM_BROWSER_TEST: '1', SUPABASE_URL: backendUrl, NEXT_PUBLIC_SUPABASE_URL: backendUrl, SUPABASE_SERVICE_KEY: 'fixture-service-key', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'fixture-public-key', NEXT_PUBLIC_SITE_URL: webUrl, NODE_EXTRA_CA_CERTS: certificate },
  })
  const stop = () => { next.kill(); backend.close(); setTimeout(() => process.exit(), 500).unref() }
  process.on('SIGINT', stop); process.on('SIGTERM', stop)
  next.on('exit', code => { backend.close(); process.exit(code ?? 0) })
})

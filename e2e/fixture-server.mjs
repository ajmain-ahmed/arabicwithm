// Isolated HTTP contract fixture. Production authorization runs unchanged;
// only this child Next process points at these synthetic accounts and records.
import https from 'node:https'
import {randomUUID} from 'node:crypto'
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
const rpcLog=[];let failSearch=false
let failAudioSave = false
let forYouPlayback=false
const manualPremium=new Map(), memoryStarts=new Map(), memorySnapshots=new Map(), memoryReviews=new Map(), ownReviews=new Map(), earned=new Set(), wordTotals=new Map()
const effective=id=>id===ids.premium||roleFor(id)==='admin'||manualPremium.get(id)===true
const usage=id=>[...memoryStarts.values()].filter(row=>row.userId===id).length
function account(id) {
  const kind = Object.keys(ids).find(key => ids[key] === id) ?? 'free'
  return { id, aud: 'authenticated', role: 'authenticated', email: `${kind}@fixture.example`, email_confirmed_at: '2026-01-01T00:00:00Z', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: { full_name: `${kind} learner`, ...metadata.get(id) }, identities: [] }
}
const content = Array.from({ length: 30 }, (_, i) => ({ paragraph: i + 1, tokens: [{ arabic: 'كِتَابٌ', headword: 'كِتَاب', english: 'book', pos: 'noun', cefr: 'a1' }], translation: `A book. Paragraph ${i + 1}.` }))
let failImportAfter=null
const formDrafts=new Map()
const importJobs=new Map()
const tables = {
  email_preferences: [],
  book_audio_progress: [],
  youtube_transcripts: [],
  transcript_groups: [],
  admin_manual_transcripts: [],
  transcript_segments: [],
  books: [{ id: bookId, slug: 'test-book', title: 'Test Book', title_ar: 'كتاب', author: 'Fixture Author', level: 'A1', tags: [], premium_exempt: false, free_chapter_count: 5 }],
  chapters: [{ id: chapterId, book_id: bookId, slug: 'chapter-1', title: 'First Chapter', chapter_number: 1, content }],
  shows: [{ id: showId, slug: 'test-show', title: 'Test Show', title_ar: 'كتاب', level: 'A1', tags: [] }],
  episodes: Array.from({ length: 4 }, (_, i) => ({ id: `dddddddd-dddd-4ddd-8ddd-ddddddddddd${i}`, show_id: showId, slug: `clip-${i}`, title: `Clip ${i}`, youtube_id: ['abcdefghij0', 'abcdefghij1', 'abcdefghij2', 'abcdefghij3'][i], level: 'A1', tags: [], transcript: [{ timestamp: '0:00', tokens: [{ arabic: '\u0647\u0630\u0627', english: 'this', pos: 'pronoun', cefr: 'a1' }, { arabic: ['\u0643\u062a\u0627\u0628','\u0642\u0644\u0645','\u0628\u064a\u062a','\u0645\u0627\u0621'][i], english: ['book','pen','house','water'][i], pos: 'noun', cefr: 'a1' }], translation: ['This is a book.','This is a pen.','This is a house.','This is water.'][i] }], created_at: '2026-01-01T00:00:00Z' })),
  book_chapter_audio: ['ar', 'en'].map(language => ({ chapter_id: chapterId, language, is_published: true, source_type: 'supabase_storage', storage_bucket: 'audiobooks', storage_path: `fixture/${language}/chapter.wav`, duration_seconds: 60, narrator: 'Fixture Narrator', external_url: null, external_video_id: null })),
}
// Seed discovery metadata before the homepage warms the public library cache.
tables.books = Array.from({ length: 6 }, (_, i) => ({ ...tables.books[0],
  id: i ? `bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb${i}` : bookId,
  slug: i ? `layout-book-${i}` : 'test-book', title: i ? `Book ${i + 1}` : 'Test Book',
  category: i < 3 ? 'Mystery' : 'History', tags: i % 2 ? ['Short Reads'] : [],
}))

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
  res.setHeader('Access-Control-Allow-Headers', 'authorization, apikey, x-client-info, content-type, content-profile, accept-profile, range, prefer, accept, x-supabase-api-version, x-upsert')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD')
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }
  const url = new URL(req.url, backendUrl)
  const chunks = []; for await (const chunk of req) chunks.push(chunk)
  let body = {}; try { body = JSON.parse(Buffer.concat(chunks).toString() || '{}') } catch {}
  const userId = userFromToken((req.headers.authorization ?? '').replace(/^Bearer /, ''))
  if(url.pathname==='/fixture/website-update') {
    const second='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
    for(const language of ['ar','en']) if(!tables.book_chapter_audio.some(row=>row.chapter_id===second&&row.language===language)) tables.book_chapter_audio.push({...tables.book_chapter_audio.find(row=>row.language===language),chapter_id:second})
    return json(res,{})
  }
  if(url.pathname==='/fixture/launch-preferences') return json(res,tables.email_preferences)
  if(url.pathname==='/fixture/request-log')return json(res,{rpc:rpcLog})
  if(url.pathname==='/fixture/search-failure'){failSearch=body.fail;return json(res,{})}
  if (url.pathname === '/fixture/audio-save-failure') { failAudioSave = Boolean(body.fail); return json(res, {}) }
  if(url.pathname==='/fixture/import-failure'){failImportAfter=body.after??null;return json(res,{})}
  if(url.pathname==='/fixture/reset-overhaul'){failImportAfter=null;formDrafts.clear();importJobs.clear();handles.clear();profiles.clear();roles.clear();accessAudit.length=0;manualPremium.clear();memoryStarts.clear();memorySnapshots.clear();memoryReviews.clear();ownReviews.clear();earned.clear();wordTotals.clear();metadata.clear();tables.youtube_transcripts.length=0;tables.transcript_groups.length=0;tables.admin_manual_transcripts.length=0;tables.transcript_segments.length=0;return json(res,{})}
  if(url.pathname==='/fixture/word-search'){
    const words=['\u0643\u062a\u0627\u0628','\u0645\u062f\u0631\u0633\u0629','\u062c\u0645\u064a\u0644','\u0633\u0631\u064a\u0639','\u0637\u0639\u0627\u0645','\u0643\u0628\u064a\u0631','\u0635\u063a\u064a\u0631','\u0637\u0631\u064a\u0642','\u0645\u062f\u064a\u0646\u0629','\u0639\u0644\u0645']
    tables.episodes.forEach(episode=>{episode.transcript=[{timestamp:'0:00',tokens:words.map((arabic,i)=>({arabic,lemma:arabic,headword:arabic,english:`Meaning ${i}`,pos:'noun',cefr:'a1'})),translation:'Stored fixture example.'}]})
    return json(res,{})
  }
  if(url.pathname==='/fixture/for-you-playback'){
    forYouPlayback=true
    tables.transcript_groups=[{id:'77777777-7777-4777-8777-777777777770',name:'Fixture A'},{id:'77777777-7777-4777-8777-777777777771',name:'Fixture B'}]
    for(let i=0;i<7;i++){
      const id=`99999999-9999-4999-8999-99999999999${i}`
      const segments=[{id:800+i*10,position:0,start_seconds:375,end_seconds:390,original_text:'Earlier sentence',english_text:'Earlier sentence',tokens:[{arabic:'سَابِقٌ',english:'earlier'}]},
      {id:801+i*10,position:1,start_seconds:495,end_seconds:505,original_text:'Opening sentence',english_text:'Opening sentence',tokens:[{arabic:'كِتَابٌ',english:'book',start_seconds:495,end_seconds:500},{arabic:'جَدِيدٌ',english:'new',start_seconds:500,end_seconds:505}]},
      {id:802+i*10,position:2,start_seconds:505,end_seconds:522,original_text:'Later sentence',english_text:'Later sentence',tokens:[{arabic:'قَلَمٌ',english:'pen'}]}]
      tables.youtube_transcripts=tables.youtube_transcripts.filter(row=>row.id!==id)
      tables.transcript_segments=tables.transcript_segments.filter(row=>row.transcript_id!==id)
      tables.youtube_transcripts.push({id,status:'ready',explore_published:true,source_origin:'website_admin_transcript',raw_transcript:{content:segments.map(segment=>({tokens:segment.tokens}))}})
      tables.transcript_segments.push(...segments.map(segment=>({...segment,transcript_id:id})))
    }
    return json(res,{})
  }
  if(url.pathname==='/fixture/standalone-transcripts'){
    const raw={content:[{text:'مرحبا',offset:1234,duration:5000,english:'Hello',tokens:[{arabic:'مرحبا',english:'hello',pos:'noun',headword:'مرحبا',entry_type:'word',transliteration:'marhaban'}]}]}
    const id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
    tables.youtube_transcripts.push({id,youtube_id:'ZBynl03Vp-w',canonical_url:'https://www.youtube.com/watch?v=ZBynl03Vp-w',title:'Existing standalone transcript',channel:'Original channel',thumbnail:`${backendUrl}/storage/v1/object/public/covers/test.webp`,provider:'manual',source_origin:'website_admin_transcript',episode_id:null,status:'ready',translation_status:'ready',searchable:true,raw_transcript:raw,duration_seconds:10,created_at:'2026-10-07T00:00:00Z',updated_at:'2026-10-07T00:00:00Z'})
    tables.transcript_segments.push({id:1,transcript_id:id,position:0,start_seconds:1.234,end_seconds:6.234,original_text:'مرحبا',english_text:'Hello'})
    return json(res,{})
  }
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
  if (url.pathname === '/auth/v1/token' && req.method === 'POST') {
    const id = Object.values(ids).find(id => account(id).email === body.email)
    if (!id) return json(res,{message:'Invalid credentials'},400)
    const expires = Math.floor(Date.now()/1000)+3600
    const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url')
    return json(res,{access_token:`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,aud:'authenticated',exp:expires,role:'authenticated'})}.fixture-signature`,refresh_token:'fixture-refresh',expires_in:3600,expires_at:expires,token_type:'bearer',user:account(id)})
  }
  if (url.pathname === '/auth/v1/logout') return json(res, {})
  if (url.pathname.startsWith('/rest/v1/rpc/')) {
    const rpc = url.pathname.split('/').at(-1)
    rpcLog.push(rpc)
    const learning = JSON.parse(readFileSync('e2e/learning-data.json','utf8'))
    if(rpc==='transcript_for_you_groups'&&forYouPlayback)return json(res,[0,1,2,3,4,5,6].filter(i=>!body.p_excluded?.includes(801+i*10)).filter(i=>!body.p_group_ids?.length||body.p_group_ids.includes(`77777777-7777-4777-8777-77777777777${i%2}`)).slice(0,5).map(i=>({video:{id:`99999999-9999-4999-8999-99999999999${i}`,youtube_id:`abcdefghij${i}`,title:'Playback fixture',channel:'Fixture'},clip_start_ms:495000,clip_end_ms:522000,segments:tables.transcript_segments.filter(row=>row.transcript_id===`99999999-9999-4999-8999-99999999999${i}`&&row.start_seconds>=495).map(row=>({...row,source_tokens:row.tokens}))})))
    if(rpc==='transcript_for_you_groups')return json(res,[0,1].map(i=>({video:{id:`99999999-9999-4999-8999-99999999999${i}`,youtube_id:`abcdefghij${i}`,title:'Test For You',channel:'Fixture'},clip_start_ms:0,clip_end_ms:60000,segments:[{id:42+i,position:0,start_seconds:0,end_seconds:60,original_text:'\u0643\u0650\u062a\u064e\u0627\u0628\u064c',english_text:'A book.',source_tokens:[{arabic:'\u0643\u0650\u062a\u064e\u0627\u0628\u064c',english:'book'}]}]})))
    if(rpc==='website_search_content_v1') {
      if(failSearch)return json(res,{code:'57014',message:'statement timeout'},500)
      const hits=[{key:'b:'+bookId,kind:'book',title:'Test Book',source:'Test Book',arabic:'',english:'A graded book.',href:'/books/test-book'},
      {key:'c:'+chapterId,kind:'chapter',title:'First Chapter',source:'Test Book',arabic:'',english:'A book. Paragraph 1.',href:'/books/test-book/chapter-1#sentence-0'},
      {key:'e:'+tables.episodes[0].id,kind:'episode',title:'Clip 0',source:'Test Show',arabic:'',english:'This is a book.',href:'/cartoons/test-show/clip-0?t=12'},
      {key:'s:'+showId,kind:'show',title:'Test Show',source:'Test Show',arabic:'',english:'Test show.',href:'/cartoons/test-show'}];
      return json(res,hits.filter(h=>h.key>(body.p_after??'') && (h.kind!=='chapter'||body.p_books)))
    }
    if(rpc==='nahw_candidates') return json(res,learning.nahw)
    if(rpc==='website_grammar_candidates') {
      const examples=[
        {tokens:[{arabic:'كَتَبَ'},{arabic:'الطَّالِبُ'},{arabic:'دَرْسًا'}],translation:'The student wrote a lesson.',target:1,role:'Doer / subject of the verb',key:'subject'},
        {tokens:[{arabic:'قَرَأَ'},{arabic:'عَلِيٌّ'},{arabic:'الْكِتَابَ'}],translation:'Ali read the book.',target:2,role:'Direct object',key:'object'},
        {tokens:[{arabic:'الْمُعَلِّمُ'},{arabic:'فِي'},{arabic:'الْمَدْرَسَةِ'}],translation:'The teacher is in the school.',target:0,role:'Topic',key:'topic'},
      ]
      const rows=examples.map((p,i)=>({id:i+1,sentence_hash:String(i+1).repeat(32),chapter_id:i%2?null:chapterId,paragraph_index:i%2?null:i,segment_id:i%2?44:null,cefr_rank:i+1,payload:{tokens:p.tokens,translation:p.translation,facts:[{token_index:p.target,mode:body.p_mode,key:body.p_mode==='sentence_role'?p.key:body.p_mode==='word_type'?'noun':i===1?'accusative':'nominative',english:body.p_mode==='sentence_role'?p.role:body.p_mode==='word_type'?'Noun':i===1?'Accusative':'Nominative',arabic:body.p_mode==='sentence_role'?'فَاعِلٌ':body.p_mode==='word_type'?'اِسْمٌ':i===1?'مَنْصُوبٌ':'مَرْفُوعٌ'}]}}))
      return json(res,rows.filter(r=>!(body.p_recent??[]).includes(r.sentence_hash)&&(!body.p_cefr||r.cefr_rank<=body.p_cefr)))
    }
    if(rpc==='prepared_practice_candidates') return json(res,body.p_offset ? [] : body.p_kind==='sarf'?learning.sarf:learning.patterns)
    if(['admin_save_manual_draft','admin_load_manual_draft','admin_list_manual_drafts','admin_delete_manual_draft'].includes(rpc)){
      if(roleFor(body.p_actor)!=='admin')return json(res,{message:'Forbidden'},403)
      if(rpc==='admin_list_manual_drafts'){
        const owned=[...formDrafts.values()].filter(d=>d.actor===body.p_actor),filtered=owned.filter(d=>!body.p_search||(d.payload.title||'Untitled draft').toLowerCase().includes(body.p_search.toLowerCase())).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))
        return json(res,{count:owned.length,total:filtered.length,rows:body.p_rows?filtered.slice(body.p_page*30,body.p_page*30+30).map(d=>({id:d.id,draft_id:d.id,draft_version:d.updatedAt,youtube_id:d.payload.url,canonical_url:'',title:d.payload.title.trim()||'Untitled draft',channel:d.payload.channel,thumbnail:'',duration_seconds:null,provider:'manual',status:'draft',translation_status:'unavailable',searchable:false,created_at:d.createdAt,updated_at:d.updatedAt,error_code:null,group_id:'drafts'})):[]})
      }
      const previous=formDrafts.get(body.p_id)
      if(previous&&previous.actor!==body.p_actor)return json(res,{message:'Forbidden'},403)
      if(rpc==='admin_load_manual_draft')return previous?json(res,{id:previous.id,payload:previous.payload,updatedAt:previous.updatedAt}):json(res,{message:'Draft not found'},404)
      if(rpc==='admin_delete_manual_draft'){
        if(previous&&previous.updatedAt!==body.p_version)return json(res,{message:'draft_conflict'},409)
        formDrafts.delete(body.p_id);return json(res,true)
      }
      if(previous&&JSON.stringify(previous.payload)===JSON.stringify(body.p_payload))return json(res,{id:previous.id,updatedAt:previous.updatedAt})
      if(previous&&previous.updatedAt!==body.p_version)return json(res,{message:'draft_conflict'},409)
      const updatedAt=new Date().toISOString(),draft={id:body.p_id,actor:body.p_actor,payload:structuredClone(body.p_payload),updatedAt,createdAt:previous?.createdAt??updatedAt}
      formDrafts.set(body.p_id,draft);return json(res,{id:draft.id,updatedAt})
    }
    if(rpc==='admin_list_manual_transcripts'){
      const eligible=tables.youtube_transcripts.filter(row=>row.provider==='manual'&&row.source_origin==='website_admin_transcript'&&!row.episode_id&&!tables.episodes.some(episode=>episode.youtube_id===row.youtube_id)).map(row=>({...row,group_id:tables.admin_manual_transcripts.find(m=>m.transcript_id===row.id)?.group_id??null}))
      const filtered=eligible.filter(row=>(!body.p_ungrouped||!row.group_id)&&(!body.p_group||body.p_group===row.group_id)&&(!body.p_search||row.title.toLowerCase().includes(body.p_search.toLowerCase())))
      return json(res,{rows:filtered.slice(body.p_page*30,body.p_page*30+30),total:filtered.length,ungrouped:eligible.filter(row=>!row.group_id).length,groups:tables.transcript_groups.map(group=>({...group,direct_count:eligible.filter(row=>row.group_id===group.id).length,transcript_count:eligible.filter(row=>row.group_id===group.id).length}))})
    }
    if(rpc==='admin_manage_transcript_group'){const id=body.p_id??randomUUID();if(body.p_delete)tables.transcript_groups=tables.transcript_groups.filter(group=>group.id!==id);else if(body.p_id)tables.transcript_groups.find(group=>group.id===id).name=body.p_name;else tables.transcript_groups.push({id,name:body.p_name,parent_id:null});return json(res,id)}
    if(rpc==='admin_record_transcript_origin')return json(res,null)
    if(rpc==='admin_move_standalone_transcript'){
      const row=tables.youtube_transcripts.find(row=>row.id===body.p_id),membership=tables.admin_manual_transcripts.find(row=>row.transcript_id===body.p_id)
      if(row.updated_at!==body.p_updated_at||(membership?.group_id??null)!==body.p_previous_group)return json(res,{message:'transcript_group_conflict'},409)
      if(membership)membership.group_id=body.p_group;else tables.admin_manual_transcripts.push({transcript_id:row.id,group_id:body.p_group})
      return json(res,row.updated_at)
    }
    if(['admin_begin_manual_import','website_begin_manual_import','admin_append_manual_import','admin_finish_manual_import','website_finish_manual_import','admin_resume_manual_import'].includes(rpc)){
      if(roleFor(body.p_actor)!=='admin')return json(res,{message:'Forbidden'},403)
      if(rpc==='admin_begin_manual_import'||rpc==='website_begin_manual_import'){
        const existing=importJobs.get(body.p_key);if(existing&&tables.youtube_transcripts.some(row=>row.id===existing.id))return json(res,existing.state)
        if(tables.youtube_transcripts.some(row=>row.youtube_id===body.p_youtube_id))return json(res,{code:'P0001',message:'This video already exists'},400)
        const id=randomUUID(),importId=randomUUID(),raw=structuredClone(body.p_raw),state={importId,id,expected:raw.content.length,committed:0,tokens:0,completed:false,enrichment:'unavailable'}
        const job={id,raw,state,searchable:body.p_searchable,explorePublished:body.p_explore_published??true};importJobs.set(body.p_key,job);importJobs.set(importId,job)
        tables.youtube_transcripts.push({id,youtube_id:body.p_youtube_id,canonical_url:`https://www.youtube.com/watch?v=${body.p_youtube_id}`,title:body.p_title,channel:body.p_channel,thumbnail:`${backendUrl}/storage/v1/object/public/covers/test.webp`,provider:'manual',source_origin:'website_admin_transcript',episode_id:null,status:'indexing',translation_status:'unavailable',searchable:false,raw_transcript:null,duration_seconds:body.p_duration??null,created_at:'2026-10-07T00:00:00Z',updated_at:'2026-10-07T00:00:00Z'})
        tables.admin_manual_transcripts.push({transcript_id:id,group_id:body.p_group??null});return json(res,state)
      }
      const job=rpc==='admin_resume_manual_import'?[...importJobs.values()].find(job=>job.id===body.p_id):importJobs.get(body.p_import)
      if(!job)return json(res,{message:'Import not found'},400)
      if(rpc==='admin_resume_manual_import')return json(res,job.state)
      if(rpc==='admin_append_manual_import'){
        if(failImportAfter!==null&&body.p_offset>=failImportAfter)return json(res,{code:'57014',message:'Simulated database statement timeout'},408)
        if(body.p_offset<job.state.committed)return json(res,job.state)
        const batch=job.raw.content.slice(body.p_offset,body.p_offset+body.p_limit)
        batch.forEach((chunk,i)=>{const later=job.raw.content.find(c=>c.offset>chunk.offset);tables.transcript_segments.push({id:tables.transcript_segments.length+1,transcript_id:job.id,position:body.p_offset+i,original_text:chunk.text,english_text:chunk.english??null,start_seconds:chunk.offset/1000,end_seconds:chunk.duration==null?later?later.offset/1000:null:(chunk.offset+chunk.duration)/1000})})
        job.state.committed+=batch.length;job.state.tokens+=batch.reduce((n,c)=>n+c.text.split(/\s+/).filter(Boolean).length,0);return json(res,job.state)
      }
      if(job.state.committed!==job.state.expected)return json(res,{message:'Import verification failed'},400)
      const row=tables.youtube_transcripts.find(row=>row.id===job.id);row.status='ready';row.searchable=job.searchable;row.explore_published=job.explorePublished;row.raw_transcript=structuredClone(job.raw);row.original_json=job.raw._source_json;delete row.raw_transcript._source_json;row.enrichment_status='unavailable';row.translation_status='ready';job.state.completed=true;return json(res,job.state)
    }
    if(rpc==='admin_import_youtube_transcript'||rpc==='admin_import_grouped_transcript'||rpc==='admin_import_manual_source'){
      if(roleFor(body.p_actor)!=='admin')return json(res,{message:'Forbidden'},403)
      const existing=tables.youtube_transcripts.find(row=>row.youtube_id===body.p_youtube_id)
      if(existing)return json(res,existing.id)
      const id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
      tables.youtube_transcripts.push({id,youtube_id:body.p_youtube_id,canonical_url:`https://www.youtube.com/watch?v=${body.p_youtube_id}`,title:body.p_title,channel:body.p_channel,thumbnail:`${backendUrl}/storage/v1/object/public/covers/test.webp`,provider:'manual',source_origin:'website_admin_transcript',episode_id:null,status:'ready',translation_status:'ready',searchable:body.p_searchable,raw_transcript:body.p_raw,duration_seconds:Math.max(...body.p_raw.content.map(chunk=>chunk.offset+chunk.duration))/1000,created_at:'2026-10-07T00:00:00Z',updated_at:'2026-10-07T00:00:00Z'})
      if(rpc==='admin_import_grouped_transcript'||rpc==='admin_import_manual_source')tables.admin_manual_transcripts.push({transcript_id:id,group_id:body.p_group??null})
      if(rpc==='admin_import_manual_source'){
        const row=tables.youtube_transcripts.find(row=>row.id===id);row.original_json=body.p_raw._source_json;delete row.raw_transcript._source_json;row.enrichment_status='unavailable'
        body.p_raw.content.forEach((chunk,position)=>tables.transcript_segments.push({id:position+1,transcript_id:id,position,original_text:chunk.text,english_text:chunk.english??null,start_seconds:chunk.offset/1000,end_seconds:chunk.duration===null?null:(chunk.offset+chunk.duration)/1000}))
        return json(res,{id,enrichment:'unavailable'})
      }
      return json(res,id)
    }
    if(rpc==='website_save_manual_source'){
      if(roleFor(body.p_actor)!=='admin')return json(res,{message:'Forbidden'},403)
      const row=tables.youtube_transcripts.find(row=>row.id===body.p_id)
      if(!row||row.updated_at!==body.p_updated_at)return json(res,{message:'transcript_edit_conflict'},409)
      Object.assign(row,{title:body.p_title,channel:body.p_channel,searchable:body.p_searchable,explore_published:body.p_explore_published,raw_transcript:structuredClone(body.p_raw),youtube_id:body.p_youtube_id,updated_at:new Date().toISOString()})
      row.original_json=row.raw_transcript._source_json;delete row.raw_transcript._source_json
      tables.transcript_segments=tables.transcript_segments.filter(s=>s.transcript_id!==row.id)
      row.raw_transcript.content.forEach((c,position)=>tables.transcript_segments.push({id:tables.transcript_segments.length+1,transcript_id:row.id,position,original_text:c.text,english_text:c.english??null,start_seconds:c.offset/1000,end_seconds:c.duration===null?null:(c.offset+c.duration)/1000}))
      return json(res,{updatedAt:row.updated_at,enrichment:'unavailable'})
    }
    if(rpc==='admin_manual_enrichment'||rpc==='admin_retry_manual_enrichment'){const row=tables.youtube_transcripts.find(row=>row.id===body.p_id);return json(res,row?{status:row.enrichment_status??'unavailable',diagnostics:[],originalJson:row.original_json??null}:null)}
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
      if(table==='email_preferences') {
        const index=tables.email_preferences.findIndex(row=>row.email===body.email&&row.purpose===body.purpose)
        if(index<0)tables.email_preferences.push(body);else if(!(req.headers.prefer??'').includes('ignore-duplicates'))tables.email_preferences[index]=body
      }
      if(table==='book_audio_progress') {
        const index=tables.book_audio_progress.findIndex(row=>row.user_id===body.user_id&&row.chapter_id===body.chapter_id&&row.language===body.language)
        if(index<0)tables.book_audio_progress.push(body);else tables.book_audio_progress[index]=body
      }
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
  const next = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', ...(process.env.AWM_TEST_WEBPACK === '1' ? ['--webpack'] : []), '--hostname', '127.0.0.1', '--port', String(webPort)], {
    stdio: 'inherit',
    env: { ...process.env, AWM_BROWSER_TEST: '1', SUPABASE_URL: backendUrl, NEXT_PUBLIC_SUPABASE_URL: backendUrl, SUPABASE_SERVICE_KEY: 'fixture-service-key', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'fixture-public-key', NEXT_PUBLIC_SITE_URL: webUrl, NODE_EXTRA_CA_CERTS: certificate },
  })
  const stop = () => { next.kill(); backend.close(); setTimeout(() => process.exit(), 500).unref() }
  process.on('SIGINT', stop); process.on('SIGTERM', stop)
  next.on('exit', code => { backend.close(); process.exit(code ?? 0) })
})

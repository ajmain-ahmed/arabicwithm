// @vitest-environment node
import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { enrichmentDatabase } from '@/supabase/tests/helpers/enrichment'
const state = vi.hoisted(() => ({ db: null as PGlite | null, provider: vi.fn() }))
vi.mock('server-only', () => ({}))
vi.mock('./provider', () => ({
  requestGrammar: state.provider,
  analysisProviderConfigured: () => true,
}))
vi.mock('@/app/lib/supabase', () => ({
  serviceClient: {
    rpc: async (name: string, parameters: Record<string, unknown> = {}) => {
      try {
        const keys = Object.keys(parameters),
          values = keys.map((key) =>
            parameters[key] !== null && typeof parameters[key] === 'object'
              ? JSON.stringify(parameters[key])
              : parameters[key],
          )
        const args = keys.map((key, index) => `${key}=>$${index + 1}`).join(',')
        if (name === 'website_claim_enrichment')
          return {
            data: (await state.db!.query(`select * from public.${name}()`)).rows,
            error: null,
          }
        const { rows } = await state.db!.query<{ result: unknown }>(
          `select public.${name}(${args}) result`,
          values,
        )
        return { data: rows[0]?.result, error: null }
      } catch (error) {
        return { data: null, error: { message: String(error) } }
      }
    },
    from: (table: string) => {
      const filters: Record<string, unknown> = {},
        orders: string[] = []
      let offset = 0,
        limit = 1000
      const run = async () => {
        try {
          const keys = Object.keys(filters),
            where = keys.length
              ? ` where ${keys.map((key, i) => `${key}=$${i + 1}`).join(' and ')}`
              : ''
          const { rows } = await state.db!.query(
            `select * from ${table}${where}${orders.length ? ' order by ' + orders.join(',') : ''} limit ${limit} offset ${offset}`,
            keys.map((key) => filters[key]),
          )
          return { data: rows, error: null }
        } catch (error) {
          return { data: null, error: { message: String(error) } }
        }
      }
      const query = {
        select: () => query,
        eq: (key: string, value: unknown) => {
          filters[key] = value
          return query
        },
        order: (key: string) => {
          orders.push(key)
          return query
        },
        range: (start: number, end: number) => {
          offset = start
          limit = end - start + 1
          return query
        },
        maybeSingle: async () => {
          const value = await run()
          return { ...value, data: value.data?.[0] ?? null }
        },
        then: (resolve: (value: unknown) => unknown) => run().then(resolve),
      }
      return query
    },
  },
}))
import { enrichArabicContent } from './service'
const chapter = '11111111-1111-4111-8111-111111111111',
  episode = '22222222-2222-4222-8222-222222222222',
  transcript = '33333333-3333-4333-8333-333333333333',
  imported = '44444444-4444-4444-8444-444444444444'
const content = [
  { arabic: 'عُدْ عَلَى الْفَوْرِ.', translation: 'Return immediately.' },
  { arabic: 'الْوَرْدَةُ جَمِيلٌ لَوْنُهَا.', translation: 'The flower has a beautiful colour.' },
]
beforeAll(async () => {
  state.db = await enrichmentDatabase()
  await state.db.query(`insert into books values($1,'Book','book','C1')`, [chapter])
  await state.db.query(`insert into shows values($1,'Show','show','C1')`, [chapter])
  state.provider.mockImplementation(async (units: { key: string; arabic: string }[]) => ({
    notes: units
      .filter((unit) => unit.arabic.includes('لَوْنُهَا'))
      .map((unit) => ({
        unitKey: unit.key,
        ruleKey: 'adjective-government',
        titleAr: 'إِعْمَالُ الصِّفَةِ الْمُشَبَّهَةِ',
        titleEn: 'A governing adjective',
        cefr: 'C1',
        category: 'nahw',
        explanation:
          'جَمِيلٌ governs لَوْنُهَا, its raised subject (فَاعِلٌ). The colour is masculine, which explains the adjective’s gender here.',
        detail: '',
        confidence: 0.95,
        highlight: 'جَمِيلٌ لَوْنُهَا',
      })),
  }))
}, 30000)
afterAll(() => state.db?.close())
it('demonstrates saved chapter, episode, standalone transcript and imported YouTube → shared enrichment → one phrase and one candidate with exact examples', async () => {
  const db = state.db!
  await db.query(
    `insert into chapters(id,book_id,title,slug,content)values($1,$1,'Chapter','one',$2::jsonb)`,
    [chapter, JSON.stringify(content)],
  )
  await db.query(
    `insert into episodes(id,show_id,title,slug,transcript)values($1,$2,'Episode','one',$3::jsonb)`,
    [episode, chapter, JSON.stringify(content)],
  )
  for (const [id, origin] of [
    [transcript, 'awm'],
    [imported, 'website_admin_transcript'],
  ])
    await db.query(
      `insert into youtube_transcripts(id,title,status,source_origin,raw_transcript,canonical_url)values($1,'Transcript','ready',$2,$3::jsonb,'https://www.youtube.com/watch?v=fixture1234')`,
      [id, origin, JSON.stringify({ content })],
    )
  const before = (await db.query(`select md5(content::text) digest from chapters`)).rows
  for (let index = 0; index < 8; index++) expect((await enrichArabicContent()).processed).toBe(true)
  expect((await db.query(`select phrase_ar_di,english from phrases`)).rows).toEqual([
    { phrase_ar_di: 'عَلَى الْفَوْرِ', english: 'immediately' },
  ])
  expect((await db.query(`select status,rule_cefr from grammar_notes`)).rows).toEqual([
    { status: 'candidate', rule_cefr: 'C1' },
  ])
  const examples = (
    await db.query<{ arabic: string; source_kind: string; source_id: string }>(
      `select arabic,source_kind,source_id from content_enrichment_examples where grammar_note_id is not null`,
    )
  ).rows
  expect(examples).toHaveLength(4)
  expect(examples.every((example) => example.arabic === content[1].arabic)).toBe(true)
  expect(new Set(examples.map((example) => example.source_kind))).toEqual(
    new Set(['chapter', 'episode', 'transcript']),
  )
  expect(state.provider).toHaveBeenCalledTimes(1)
  expect((await db.query(`select md5(content::text) digest from chapters`)).rows).toEqual(before)
})
it('reruns without duplicate phrases, notes or occurrences and isolates provider failures from phrase processing', async () => {
  await state.db!.query(`select website_queue_enrichment('chapter',$1,true)`, [chapter])
  for (let index = 0; index < 2; index++) await enrichArabicContent()
  expect(
    (await state.db!.query(`select count(*)::int total from content_enrichment_examples`)).rows[0],
  ).toEqual({ total: 8 })
  await state.db!.exec(`delete from content_enrichment_analysis_cache`)
  state.provider.mockRejectedValueOnce(new Error('Provider outage'))
  await state.db!.query(`select website_queue_enrichment('chapter',$1,true)`, [chapter])
  const results = [await enrichArabicContent(), await enrichArabicContent()]
  expect(results.some((result) => result.analyser === 'phrases' && result.processed)).toBe(true)
  expect(
    results.some((result) => result.analyser === 'grammar' && result.warning === 'analysis_failed'),
  ).toBe(true)
  expect((await state.db!.query(`select content from chapters`)).rows[0]).toEqual({ content })
})

it('runs exactly one Episode, imported transcript and chapter through the real HTTP provider service and durable candidate/review pipeline',async()=>{
 const previous=state.db,db=await enrichmentDatabase();state.db=db
 const {handleGrammarAnalysis}=await import('@/supabase/functions/transcript-library/grammar-analysis')
 const actual=await vi.importActual<typeof import('./provider')>('./provider')
 vi.stubEnv('CONTENT_ANALYSIS_URL','https://analysis.fixture/grammar-analysis');vi.stubEnv('CONTENT_ANALYSIS_TOKEN','test-analysis-token')
 const modelFetch=vi.fn().mockImplementation(async(_url:unknown,init:RequestInit)=>{
  const input=JSON.parse(JSON.parse(String(init.body)).input)
  return Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({notes:input.units.filter((unit:{arabic:string})=>unit.arabic.includes('لَوْنُهَا')).map((unit:{unitKey:string})=>({unitKey:unit.unitKey,ruleKey:'adjective-government',titleEn:'A governing adjective',titleAr:'إِعْمَالُ الصِّفَةِ الْمُشَبَّهَةِ',cefr:'C1',category:'nahw',explanation:'Look at جَمِيلٌ: it governs its subject (فَاعِلٌ), لَوْنُهَا. The colour explains its masculine agreement.',mechanics:'Find the raised subject (فَاعِلٌ) after the adjective.',recognitionTip:'Look for the attached pronoun referring back to the flower.',detail:'',exampleExplanation:'The colour is what is beautiful.',transformations:[],confidence:0.95,highlight:'جَمِيلٌ لَوْنُهَا'}))})}]}]})
 })
 vi.stubGlobal('fetch',(url:string,init:RequestInit)=>handleGrammarAnalysis(new Request(url,init),{token:'test-analysis-token',openAIKey:'test-model-key'},modelFetch))
 state.provider.mockImplementation((units,id)=>actual.requestGrammar(units,id))
 try{
  await db.query(`insert into books values($1,'Controlled Book','controlled','C1')`,[chapter]);await db.query(`insert into shows values($1,'Controlled Show','controlled','C1')`,[chapter])
  await db.query(`insert into chapters(id,book_id,title,slug,content)values($1,$1,'Chapter','one',$2::jsonb)`,[chapter,JSON.stringify(content)])
  await db.query(`insert into episodes(id,show_id,title,slug,transcript)values($1,$2,'Episode','one',$3::jsonb)`,[episode,chapter,JSON.stringify(content.map(block=>({...block,timestamp:'00:12'})))])
  await db.query(`insert into youtube_transcripts(id,title,status,source_origin,raw_transcript,canonical_url)values($1,'Imported transcript','ready','website_admin_transcript',$2::jsonb,'https://www.youtube.com/watch?v=fixture1234')`,[imported,JSON.stringify({content:content.map(block=>({...block,timestamp:'00:14'}))})])
  const before=(await db.query(`select md5(content::text) digest from chapters union all select md5(transcript::text) from episodes union all select md5(raw_transcript::text) from youtube_transcripts`)).rows
  for(let index=0;index<6;index++)expect((await enrichArabicContent()).processed).toBe(true)
  expect((await db.query(`select status,rule_cefr from grammar_notes`)).rows).toEqual([{status:'candidate',rule_cefr:'C1'}])
  const examples=(await db.query<{arabic:string;source_kind:string;source_id:string;source_timestamp:string|null;review_status:string}>(`select arabic,source_kind,source_id,source_timestamp,review_status from content_enrichment_examples where grammar_note_id is not null`)).rows
  expect(examples).toHaveLength(3);expect(new Set(examples.map(row=>row.source_kind))).toEqual(new Set(['chapter','episode','transcript']))
  expect(examples.every(row=>row.arabic===content[1].arabic&&row.review_status==='candidate')).toBe(true)
  expect(Object.fromEntries(examples.map(row=>[row.source_kind,row.source_timestamp]))).toEqual({chapter:null,episode:'00:12',transcript:'00:14'})
  expect((await db.query(`select md5(content::text) digest from chapters union all select md5(transcript::text) from episodes union all select md5(raw_transcript::text) from youtube_transcripts`)).rows).toEqual(before)
  expect(modelFetch).toHaveBeenCalledTimes(1)
  const dashboard=(await db.query<{result:{notes:unknown[]}}>(`select website_admin_grammar('list',null,'{"status":"candidate"}'::jsonb,'{}'::jsonb) result`)).rows
  expect(dashboard[0].result.notes).toHaveLength(1)
 }finally{state.db=previous;await db.close();vi.unstubAllGlobals();vi.unstubAllEnvs()}
},30000)

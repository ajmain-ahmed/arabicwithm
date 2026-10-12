// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
const mocks=vi.hoisted(()=>({access:vi.fn(),from:vi.fn()}))
vi.mock('@/app/actions/auth',()=>({getAuthenticatedAccess:mocks.access}))
vi.mock('@/app/lib/supabase',()=>({serviceClient:{from:mocks.from}}))
import { GET } from '@/app/api/reviewer/export/route'
import { loadSourceExport, loadSuggestionExport } from './reviewExportData'
import { suggestionsCsv, type ReviewExportData } from './reviewExports'
import { suggestionsPdf } from './reviewPdf'
const parent='11111111-1111-4111-8111-111111111111',target='22222222-2222-4222-8222-222222222222'
const tokens=[{arabic:'السَّلَامُ',english:'peace',pos:'noun',cefr:'a1',headword:'سلام',entry_type:'root',dictionary_entry_id:'retained',custom:{value:7}},{arabic:'عَلَيْكُمْ',english:'upon you',pos:'preposition',cefr:'a1'}]
const block={tokens,translation:'Peace be upon you.',timestamp:2.5,paragraph:3,punctuation:'!',future_metadata:{preserved:true}}
const suggestion={id:target,author_id:parent,content_type:'book' as const,parent_id:parent,target_id:target,line_index:0,location:'Arabic Reader / Chapter 03',original_block:block,original_arabic:'السَّلَامُ عَلَيْكُمْ',original_english:block.translation,suggested_arabic:null,suggested_english:'Hello, "friend"!\nWelcome.',suggested_tokens:null,comment:'A clear greeting',reason:'Natural English',status:'pending' as const,created_at:'2026-10-02T10:00:00Z',updated_at:'2026-10-02T10:00:00Z',reviewed_at:null,reviewed_by:null,admin_response:null}
const data:ReviewExportData={title:'Arabic Reader',type:'book',filename:'arabic-reader_chapter-03',suggestions:[{...suggestion,unit_title:'Chapter 03',author_name:'Editor'}]}
function query(result:unknown){const q:Record<string,unknown>={then:(resolve:(value:unknown)=>void)=>Promise.resolve(result).then(resolve)};for(const method of ['select','eq','order','gte','lte','in','range'])q[method]=vi.fn(()=>q);q.single=vi.fn(async()=>result);return q}
beforeEach(()=>{vi.clearAllMocks();mocks.access.mockResolvedValue({admin:true,role:'admin',userId:parent})})
describe('actual generated files',()=>{
 it('writes a well-formed UTF-8 CSV with line/block context, escaped quotes and spreadsheet-safe content',()=>{
  const csv=suggestionsCsv(data)
  expect(csv.startsWith('\ufeff')).toBe(true)
  expect(csv).toContain('"Hello, ""friend""!\nWelcome."');expect(csv).toContain('السَّلَامُ عَلَيْكُمْ');expect(csv).toContain('"Chapter 03","1"')
  expect(csv).toContain('dictionary_entry_id');expect(csv).not.toContain(parent)
  expect(suggestionsCsv({...data,suggestions:[{...data.suggestions[0],comment:'=HYPERLINK("bad")'}]})).toContain("'=HYPERLINK")
  mkdirSync('.next/review-export-qa',{recursive:true});writeFileSync('.next/review-export-qa/suggestions.csv',csv)
 })
 it('creates an actual PDF with Arabic font, context and multipage long comments',async()=>{
  const pdf=await suggestionsPdf(data)
  expect(pdf.subarray(0,5).toString()).toBe('%PDF-');expect(pdf.toString('latin1')).toContain('/ToUnicode')
  writeFileSync('.next/review-export-qa/suggestions.pdf',pdf)
  const long=await suggestionsPdf({...data,suggestions:[{...data.suggestions[0],comment:'Review the English translation carefully. '.repeat(260)}]})
  expect(long.toString('latin1').match(/\/Type \/Page\b/g)!.length).toBeGreaterThan(1)
  writeFileSync('.next/review-export-qa/long-suggestions.pdf',long)
  const mixed=await suggestionsPdf({...data,title:'القارئ العربي',suggestions:[{...data.suggestions[0],unit_title:'الفصل الثالث',comment:'اقترح استخدام Hello friend في الترجمة عند السطر 12.'}]})
  writeFileSync('.next/review-export-qa/mixed-suggestions.pdf',mixed)
 })
})
describe('Admin-only scope queries and endpoints',()=>{
 it.each([null,{admin:false,role:'user'},{admin:false,role:'editor'}])('denies all export formats and loaders before querying data for %j',async access=>{
  mocks.access.mockResolvedValue(access)
  for(const format of ['csv','pdf','json'])expect((await GET(new Request(`https://example.com/api/reviewer/export?format=${format}&type=book&parent=${parent}`))).status).toBe(403)
  await expect(loadSourceExport({type:'book',parent})).rejects.toThrow('Forbidden')
  await expect(loadSuggestionExport({type:'show',parent})).rejects.toThrow('Forbidden')
  expect(mocks.from).not.toHaveBeenCalled()
 })
 it.each(['book','show'] as const)('preserves all persisted %s fields, legacy objects and ordering in parsed JSON',async type=>{
  const unit={id:target,title:'Chapter 03',slug:'chapter-03',chapter_number:3,content:[block],transcript:{scriptBlocks:[block],vocabList:[],grammarPoints:[]},custom_field:'keep'}
  const p={id:parent,title:'Arabic Reader',slug:'arabic-reader',metadata:{preserved:true}}
  mocks.from.mockImplementation(table=>query({data:table===type+'s'?p:[unit],error:null}))
  const response=await GET(new Request(`https://example.com/api/reviewer/export?format=json&type=${type}&parent=${parent}&target=${target}`))
  expect(response.status).toBe(200);expect(response.headers.get('Cache-Control')).toBe('private, no-store');expect(response.headers.get('Content-Disposition')).toContain('_source.json')
  const body=await response.json();expect(body[type==='book'?'chapters':'episodes']).toEqual([unit]);expect(body[type]).toEqual(p)
  writeFileSync(`.next/review-export-qa/${type}_source.json`,JSON.stringify(body,null,2))
 })
 it('rejects a chapter/episode belonging to another parent',async()=>{
  mocks.from.mockImplementation(table=>query({data:table==='books'?{id:parent,title:'Reader'}:[],error:null}))
  await expect(loadSourceExport({type:'book',parent,target})).rejects.toThrow('does not belong')
 })
 it.each(['csv','pdf'])('serves a valid downloadable %s file from the authorized endpoint',async format=>{
  mocks.from.mockImplementation(table=>query({data:table==='books'?{id:parent,title:'Arabic Reader'}:table==='chapters'?[{id:target,title:'Chapter 03'}]:table==='public_profiles'?[{user_id:parent,display_name:'Editor'}]:[suggestion],error:null}))
  const response=await GET(new Request(`https://example.com/api/reviewer/export?format=${format}&type=book&parent=${parent}&target=${target}`))
  expect(response.status).toBe(200);expect(response.headers.get('Content-Disposition')).toContain('_suggestions.'+format)
  const bytes=Buffer.from(await response.arrayBuffer())
  expect(bytes.toString().startsWith(format==='pdf'?'%PDF-':'\ufeff')).toBe(true)
  writeFileSync(`.next/review-export-qa/endpoint-suggestions.${format}`,bytes)
 })
 it('exports all matching pages, not just the visible first 25 suggestions',async()=>{
  let calls=0
  mocks.from.mockImplementation(table=>query({data:table==='books'?{id:parent,title:'Reader'}:table==='chapters'?[{id:target,title:'Chapter 03'}]:table==='public_profiles'?[{user_id:parent,display_name:'Editor'}]:calls++===0?Array.from({length:500},()=>suggestion):[suggestion],error:null}))
  const output=await loadSuggestionExport({type:'book',parent,target,status:'pending'})
  expect(output.suggestions).toHaveLength(501);expect(output.suggestions[500].author_name).toBe('Editor');expect(output.suggestions[0].unit_title).toBe('Chapter 03')
 })
 it('rejects invalid scopes and does not disguise failed queries as empty successful exports',async()=>{
  expect((await GET(new Request('https://example.com/api/reviewer/export?format=csv&type=book&parent=invalid'))).status).toBe(400)
  mocks.from.mockReturnValue(query({data:null,error:{message:'offline'}}))
  expect((await GET(new Request(`https://example.com/api/reviewer/export?format=csv&type=book&parent=${parent}`))).status).toBe(500)
 })
})

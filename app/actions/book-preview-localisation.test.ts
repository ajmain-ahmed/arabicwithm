// @vitest-environment node
import {expect,it,vi} from 'vitest'
const state=vi.hoisted(()=>({enrich:vi.fn()}))
vi.mock('next/cache',()=>({unstable_cache:(fn:unknown)=>fn}))
vi.mock('@/app/actions/auth',()=>({getAuthenticatedUserId:async()=>null,getAuthenticatedAccess:async()=>null,guardAdmin:vi.fn()}))
vi.mock('@/app/lib/localisation/metadata.server',()=>({enrichEligibleMetadata:state.enrich}))
vi.mock('@/app/lib/supabase',()=>({hasServiceClientConfig:()=>true,serviceClient:{from:(table:string)=>{
 const books=[{id:'released',slug:'proverbs',title:'Proverbs',is_completed:true},{id:'curated',slug:'curated',title:'Curated',title_ar:'عنوان محرّر',is_completed:true},{id:'draft',slug:'draft',title:'Draft',is_completed:false}]
 let chapters=[{id:'one',book_id:'released',slug:'one',title:'One',chapter_number:1,is_published:true},{id:'two',book_id:'released',slug:'two',title:'Two',chapter_number:2,is_published:false},{id:'three',book_id:'curated',slug:'three',title:'Three',chapter_number:1,is_published:true},{id:'hidden',book_id:'draft',slug:'hidden',title:'Hidden',chapter_number:1,is_published:true}]
 const query={select:()=>query,eq:(key:string,value:unknown)=>{chapters=chapters.filter(row=>row[key as keyof typeof row]===value);return query},then:(resolve:(value:unknown)=>unknown)=>Promise.resolve({data:table==='books'?books:chapters,error:null}).then(resolve)}
 return query
}}}))
import {fetchExploreBookChapterMetasForPublic} from './books'
it('reuses approved or curated Book titles in activity previews after publication filtering',async()=>{
 state.enrich.mockImplementation(async(_entity:string,rows:{id:string;titleAr?:string}[])=>rows.map(row=>({...row,titleAr:row.titleAr??'كِتَابُ الْأَمْثَالِ'})))
 const rows=await fetchExploreBookChapterMetasForPublic()
 expect(rows.map(row=>row.chapterId)).toEqual(['one','three'])
 expect(rows[0].bookTitleAr).toBe('كِتَابُ الْأَمْثَالِ')
 expect(rows[1].bookTitleAr).toBe('عنوان محرّر')
 expect(state.enrich.mock.calls[0][1].map((row:{id:string})=>row.id)).toEqual(['released','curated'])
})

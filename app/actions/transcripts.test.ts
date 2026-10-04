import {beforeEach,describe,it,expect,vi} from 'vitest'
const mocks=vi.hoisted(()=>({guard:vi.fn(),access:vi.fn(),rpc:vi.fn(),from:vi.fn(),revalidate:vi.fn()}))
vi.mock('@/app/actions/auth',()=>({guardAdmin:mocks.guard,getAuthenticatedAccess:mocks.access}))
vi.mock('@/app/lib/supabase',()=>({serviceClient:{rpc:mocks.rpc,from:mocks.from}}))
vi.mock('next/cache',()=>({revalidatePath:mocks.revalidate}))
import {addAdminYouTubeTranscript,importAdminManualTranscript,importAdminManualTranscriptResult,listAdminTranscripts,searchTranscriptWord,loadPublicTranscript,generateAdminTranscript,deleteAdminTranscript,loadAdminTranscript,downloadAdminTranscriptJson} from './transcripts'
beforeEach(()=>{vi.resetAllMocks();mocks.guard.mockResolvedValue(undefined);mocks.access.mockResolvedValue({admin:true,userId:'11111111-1111-4111-8111-111111111111'})})
describe('website transcript server boundaries',()=>{
 it('reports failed provenance marking and lets canonical reuse repair it on retry',async()=>{const lookup={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),maybeSingle:vi.fn().mockResolvedValue({data:{id:'saved'},error:null})};mocks.from.mockReturnValue(lookup);mocks.rpc.mockResolvedValueOnce({data:null,error:{message:'unavailable'}}).mockResolvedValueOnce({data:'saved',error:null});await expect(addAdminYouTubeTranscript('Dgj9fQYbCZY')).rejects.toThrow('provenance');expect(await addAdminYouTubeTranscript('Dgj9fQYbCZY')).toBe('saved');expect(mocks.rpc).toHaveBeenCalledTimes(2);expect(mocks.rpc).not.toHaveBeenCalledWith('register_youtube_transcript',expect.anything())})

 it.each([true,false])('passes canonical bilingual JSON and explicit publication=%s through the existing import RPC',async searchable=>{mocks.rpc.mockResolvedValue({data:'saved',error:null});const content=[{text:'حياكم الله',offset:0,duration:5270,english:'Welcome'}];expect(await importAdminManualTranscriptResult({url:'https://youtu.be/Dgj9fQYbCZY',title:'Title',channel:'',json:JSON.stringify({content}),searchable})).toEqual({ok:true,id:'saved'});expect(mocks.rpc).toHaveBeenCalledWith('admin_record_transcript_origin',{p_actor:'11111111-1111-4111-8111-111111111111',p_id:'saved'});expect(mocks.rpc).toHaveBeenCalledWith('admin_import_youtube_transcript',expect.objectContaining({p_searchable:searchable,p_raw:{provider:'manual',lang:'ar',content}}))})
 it('returns useful JSON validation without touching the database',async()=>{const result=await importAdminManualTranscriptResult({url:'https://youtu.be/Dgj9fQYbCZY',title:'Title',channel:'',json:'{',searchable:true});expect(result).toEqual({ok:false,error:expect.stringContaining('Invalid transcript JSON')});expect(mocks.rpc).not.toHaveBeenCalled()})
 it('uses a short-lived schema fallback without repeating the failing query on each navigation',async()=>{
  const clock=vi.spyOn(Date,'now').mockReturnValue(1000)
  const query={select:vi.fn().mockReturnThis(),order:vi.fn().mockReturnThis(),range:vi.fn()}
  query.range
   .mockReturnValueOnce({overrideTypes:async()=>({data:null,error:{code:'42703',message:'column website_generation does not exist'},count:null})})
   .mockResolvedValueOnce({data:[{id:'existing'}],error:null,count:1})
   .mockReturnValueOnce({overrideTypes:async()=>({data:[{id:'existing'}],error:null,count:1})})
   .mockReturnValueOnce({overrideTypes:async()=>({data:[{id:'existing',website_generation:true}],error:null,count:1})})
  mocks.from.mockReturnValue(query)
  expect(await listAdminTranscripts()).toEqual({rows:[{id:'existing',website_generation:false}],total:1})
  expect(query.range).toHaveBeenCalledTimes(2)
  expect(await listAdminTranscripts()).toEqual({rows:[{id:'existing',website_generation:false}],total:1})
  expect(query.select.mock.calls[2][0]).not.toContain('website_generation')
  clock.mockReturnValue(61001)
  expect((await listAdminTranscripts()).rows[0].website_generation).toBe(true)
  expect(query.select.mock.calls[3][0]).toContain('website_generation')
  clock.mockRestore()
 })
 it('denies generation, deletion and draft viewing before database access',async()=>{mocks.access.mockResolvedValue({admin:false,userId:'other'});mocks.guard.mockRejectedValue(new Error('Forbidden'));expect(await generateAdminTranscript('https://youtu.be/Dgj9fQYbCZY')).toEqual({ok:false,error:'Administrators only.'});expect(await deleteAdminTranscript('11111111-1111-4111-8111-111111111111')).toEqual({ok:false,error:'Administrators only.'});await expect(loadAdminTranscript('11111111-1111-4111-8111-111111111111')).rejects.toThrow('Forbidden');expect(mocks.rpc).not.toHaveBeenCalled();expect(mocks.from).not.toHaveBeenCalled()})
 it('queues automatic bilingual generation and reports canonical duplicates',async()=>{const id='33333333-3333-4333-8333-333333333333';mocks.rpc.mockResolvedValue({data:{id,duplicate:true},error:null});expect(await generateAdminTranscript('https://youtu.be/Dgj9fQYbCZY?t=30')).toEqual({ok:true,id,duplicate:true});expect(mocks.rpc).toHaveBeenCalledWith('admin_generate_youtube_transcript',{p_actor:'11111111-1111-4111-8111-111111111111',p_youtube_id:'Dgj9fQYbCZY'})})
 it('validates generation URLs before queuing',async()=>{expect((await generateAdminTranscript('Dgj9fQYbCZY')).ok).toBe(false);expect((await generateAdminTranscript('https://example.com/video')).ok).toBe(false);expect(mocks.rpc).not.toHaveBeenCalled()})
 it('deletes through the authorized cascade RPC and invalidates public entry points',async()=>{mocks.rpc.mockResolvedValue({data:true,error:null});const id='33333333-3333-4333-8333-333333333333';expect(await deleteAdminTranscript(id)).toEqual({ok:true});expect(mocks.rpc).toHaveBeenCalledWith('admin_delete_youtube_transcript',{p_actor:'11111111-1111-4111-8111-111111111111',p_id:id});expect(mocks.revalidate).toHaveBeenCalledWith('/explore/search')})
 it('accepts phrase searches through the shared search RPC',async()=>{mocks.rpc.mockResolvedValue({data:[],error:null});await searchTranscriptWord('not alone');expect(mocks.rpc).toHaveBeenCalledWith('search_transcript_word',expect.objectContaining({p_word:'not alone'}))})
 it('denies non-admin imports and lists before database access',async()=>{mocks.access.mockResolvedValue({admin:false,userId:'other'});mocks.guard.mockRejectedValue(new Error('Forbidden'));await expect(addAdminYouTubeTranscript('https://youtu.be/Dgj9fQYbCZY')).rejects.toThrow('Forbidden');await expect(importAdminManualTranscript({url:'https://youtu.be/Dgj9fQYbCZY',title:'Title',channel:'',arabic:'text',searchable:true})).rejects.toThrow('Forbidden');await expect(listAdminTranscripts()).rejects.toThrow('Forbidden');expect(mocks.from).not.toHaveBeenCalled();expect(mocks.rpc).not.toHaveBeenCalled()})
 it('reuses stored historical content without queuing or calling a provider',async()=>{const lookup={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),maybeSingle:vi.fn().mockResolvedValue({data:{id:'saved'},error:null})};mocks.from.mockReturnValue(lookup);mocks.rpc.mockResolvedValue({data:'saved',error:null});expect(await addAdminYouTubeTranscript('https://youtu.be/Dgj9fQYbCZY')).toBe('saved');expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith('admin_record_transcript_origin',{p_actor:'11111111-1111-4111-8111-111111111111',p_id:'saved'})})
 it('queues new URLs through the existing ingestion RPC and authenticated actor',async()=>{const lookup={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),maybeSingle:vi.fn().mockResolvedValue({data:null,error:null})};mocks.from.mockReturnValue(lookup);mocks.rpc.mockResolvedValue({data:'new',error:null});expect(await addAdminYouTubeTranscript('https://youtu.be/Dgj9fQYbCZY')).toBe('new');expect(mocks.rpc).toHaveBeenCalledWith('register_youtube_transcript',{p_user:'11111111-1111-4111-8111-111111111111',p_youtube_id:'Dgj9fQYbCZY'})})
 it('normalises timed manual content and publishes only on explicit intent',async()=>{mocks.rpc.mockResolvedValue({data:'manual',error:null});await importAdminManualTranscript({url:'https://youtu.be/Dgj9fQYbCZY',title:'Title',channel:'Source',arabic:'00:00:01,200 --> 00:00:03,700\nتعلم العربية',searchable:false});expect(mocks.rpc).toHaveBeenCalledWith('admin_import_youtube_transcript',expect.objectContaining({p_searchable:false,p_raw:{provider:'manual',lang:'ar',content:[{text:'تعلم العربية',offset:1200,duration:2500}]}}))})
 it('uses one ranked search RPC with its compound rank/id cursor',async()=>{mocks.rpc.mockResolvedValue({data:[],error:null});await searchTranscriptWord('استطاع',99,2);expect(mocks.rpc).toHaveBeenCalledWith('search_transcript_word',{p_word:'استطاع',p_after:99,p_after_rank:2,p_limit:20})})
 it('does not expose unpublished canonical data through the public loader',async()=>{const lookup={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),maybeSingle:vi.fn().mockResolvedValue({data:null,error:null})};mocks.from.mockReturnValue(lookup);expect(await loadPublicTranscript('11111111-1111-4111-8111-111111111111')).toBeNull();expect(lookup.eq).toHaveBeenCalledWith('status','ready');expect(lookup.eq).toHaveBeenCalledWith('searchable',true);expect(mocks.from).toHaveBeenCalledTimes(1)})
})

it('requires a complete YouTube URL and a trimmed non-empty title before importing', async()=>{
  for(const input of [{url:'Dgj9fQYbCZY',title:'Title'},{url:'https://example.com/video',title:'Title'},{url:'https://youtu.be/Dgj9fQYbCZY',title:'   '}]){
    const result=await importAdminManualTranscriptResult({...input,json:'{"content":[]}',searchable:true})
    expect(result.ok).toBe(false)
  }
  expect(mocks.rpc).not.toHaveBeenCalled()
})
it('trims the title and supplies no duplicate source field for simple JSON imports',async()=>{
  mocks.rpc.mockResolvedValue({data:'saved',error:null})
  await importAdminManualTranscriptResult({url:'https://www.youtube.com/watch?v=Dgj9fQYbCZY',title:'  Video Title  ',json:JSON.stringify({content:[{text:'\u0645\u0631\u062d\u0628\u0627',offset:0,duration:5000,english:'Hello'}]}),searchable:true})
  expect(mocks.rpc).toHaveBeenCalledWith('admin_import_youtube_transcript',expect.objectContaining({p_title:'Video Title',p_channel:'Unknown channel',p_youtube_id:'Dgj9fQYbCZY'}))
})
it('denies download before database access for non-admins',async()=>{
  mocks.guard.mockRejectedValue(new Error('Forbidden'))
  await expect(downloadAdminTranscriptJson('11111111-1111-4111-8111-111111111111')).rejects.toThrow('Forbidden')
  expect(mocks.from).not.toHaveBeenCalled()
})
it('downloads all pages rather than the viewer window, ordered numerically with portable fields',async()=>{
  const id='11111111-1111-4111-8111-111111111111'
  const videoQuery={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),maybeSingle:vi.fn().mockResolvedValueOnce({data:{title:'Full / Video'},error:null}).mockResolvedValueOnce({data:{id},error:null})}
  const first=Array.from({length:500},(_,position)=>({position,original_text:'\u0645\u0631\u062d\u0628\u0627',english_text:'Hello',start_seconds:position,end_seconds:position+1}))
  const segmentQuery={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),gt:vi.fn().mockReturnThis(),order:vi.fn().mockReturnThis(),limit:vi.fn().mockResolvedValueOnce({data:first,error:null}).mockResolvedValueOnce({data:[{...first[0],position:500,start_seconds:500,end_seconds:501}],error:null})}
  mocks.from.mockImplementation(table=>table==='youtube_transcripts'?videoQuery:segmentQuery)
  const result=await downloadAdminTranscriptJson(id)
  expect(result.filename).toBe('Full_Video_transcript.json')
  const content=JSON.parse(result.json).content
  expect(content).toHaveLength(501)
  expect(content[500]).toEqual({text:'\u0645\u0631\u062d\u0628\u0627',english:'Hello',offset:500000,duration:1000})
  expect(segmentQuery.gt).toHaveBeenNthCalledWith(2,'position',499)
  expect(Object.keys(content[0])).toEqual(['text','offset','duration','english'])
})
it('does not return a partial download on pagination failure',async()=>{
  const video={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),maybeSingle:vi.fn().mockResolvedValue({data:{title:'Video'},error:null})}
  const segments={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),gt:vi.fn().mockReturnThis(),order:vi.fn().mockReturnThis(),limit:vi.fn().mockResolvedValue({data:null,error:{message:'failed'}})}
  mocks.from.mockImplementation(table=>table==='youtube_transcripts'?video:segments)
  await expect(downloadAdminTranscriptJson('11111111-1111-4111-8111-111111111111')).rejects.toThrow('complete transcript')
})

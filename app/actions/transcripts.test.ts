import {beforeEach,describe,it,expect,vi} from 'vitest'
const mocks=vi.hoisted(()=>({guard:vi.fn(),access:vi.fn(),rpc:vi.fn(),from:vi.fn(),revalidate:vi.fn(),duration:vi.fn()}))
vi.mock('@/app/actions/auth',()=>({guardAdmin:mocks.guard,getAuthenticatedAccess:mocks.access}))
vi.mock('@/app/lib/supabase',()=>({serviceClient:{rpc:mocks.rpc,from:mocks.from}}))
vi.mock('@/app/lib/youtubeVideoDuration',()=>({getYouTubeVideoDuration:mocks.duration}))
vi.mock('next/cache',()=>({revalidatePath:mocks.revalidate}))
import {addAdminYouTubeTranscript,importAdminManualTranscript,importAdminManualTranscriptResult,validateAdminManualTranscript,listAdminTranscripts,searchTranscriptWord,loadPublicTranscript,generateAdminTranscript,deleteAdminTranscript,loadAdminTranscript,downloadAdminTranscriptJson,saveAdminTranscriptJson,moveAdminTranscriptGroup} from './transcripts'
beforeEach(()=>{vi.resetAllMocks();mocks.duration.mockResolvedValue(null);mocks.guard.mockResolvedValue(undefined);mocks.access.mockResolvedValue({admin:true,userId:'11111111-1111-4111-8111-111111111111'})})

function metadata(duration:number|null){const query={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),maybeSingle:vi.fn().mockResolvedValue({data:duration===null?null:{duration_seconds:duration},error:null})};mocks.from.mockReturnValue(query);return query}
const startOnlyJson=JSON.stringify([{tokens:[{arabic:'\u0645\u0631\u062d\u0628\u0627',english:'hello'}],timestamp:'00:00',translation:'Hello'},{arabic:'\u0645\u0631\u062d\u0628\u0627',start_ms:630000}])
describe('manual import timing preflight',()=>{
 it.each(['ZBynl03Vp-w','https://www.youtube.com/watch?v=ZBynl03Vp-w','https://youtu.be/ZBynl03Vp-w','https://www.youtube.com/shorts/ZBynl03Vp-w','https://www.youtube.com/embed/ZBynl03Vp-w'])('accepts %s without demanding duration for fully timed content',async url=>{
  mocks.rpc.mockResolvedValue({data:'saved',error:null})
  const json=JSON.stringify([{arabic:'\u0645\u0631\u062d\u0628\u0627',start_ms:1000,end_ms:5000}])
  expect(await validateAdminManualTranscript({url,json,duration:''})).toMatchObject({ok:true,segments:1,durationSource:'transcript'})
  expect(await importAdminManualTranscriptResult({url,title:'Title',json,searchable:true,duration:''})).toEqual({ok:true,id:'saved'})
  expect(mocks.rpc).toHaveBeenCalledWith('admin_import_grouped_transcript',expect.objectContaining({p_youtube_id:'ZBynl03Vp-w'}));expect(mocks.from).not.toHaveBeenCalled()
 })
 it('reports the missing final duration before Import without mutating anything',async()=>{
  metadata(null)
  expect(await validateAdminManualTranscript({url:'ZBynl03Vp-w',json:startOnlyJson})).toMatchObject({ok:false,needsDuration:true,error:expect.stringContaining('Enter the video duration')})
  expect(mocks.rpc).not.toHaveBeenCalled()
 })
 it.each([['10:57',27000],['1:10:57',3627000]])('imports start-only blocks with human duration %s',async(duration,lastDuration)=>{
  metadata(null);mocks.rpc.mockResolvedValue({data:'saved',error:null})
  expect(await validateAdminManualTranscript({url:'ZBynl03Vp-w',json:startOnlyJson,duration})).toMatchObject({ok:true,durationSource:'manual'})
  expect(await importAdminManualTranscriptResult({url:'ZBynl03Vp-w',title:'Title',json:startOnlyJson,duration,searchable:true})).toMatchObject({ok:true})
  expect(mocks.rpc).toHaveBeenCalledWith('admin_import_grouped_transcript',expect.objectContaining({p_raw:expect.objectContaining({content:[expect.objectContaining({offset:0,duration:630000}),expect.objectContaining({offset:630000,duration:lastDuration})]})}))
 })
 it('automatically reuses saved duration metadata without a manual value',async()=>{
  const query=metadata(657)
  expect(await validateAdminManualTranscript({url:'ZBynl03Vp-w',json:startOnlyJson})).toMatchObject({ok:true,durationSource:'saved-video'})
  expect(query.eq).toHaveBeenCalledWith('youtube_id','ZBynl03Vp-w');expect(mocks.rpc).not.toHaveBeenCalled()
 })
 it('ignores saved metadata that ends before the final start and uses manual duration',async()=>{
  metadata(100)
  expect(await validateAdminManualTranscript({url:'ZBynl03Vp-w',json:startOnlyJson,duration:'10:57'})).toMatchObject({ok:true,durationSource:'manual'})
 })
 it('rejects malformed durations and video inputs with useful errors',async()=>{
  expect(await validateAdminManualTranscript({url:'ZBynl03Vp-w',json:startOnlyJson,duration:'657'})).toMatchObject({ok:false,error:expect.stringContaining('MM:SS')})
  expect(await validateAdminManualTranscript({url:'not-a-video-id',json:startOnlyJson})).toMatchObject({ok:false,error:'Enter a YouTube URL or video ID.'})
  expect(mocks.rpc).not.toHaveBeenCalled()
 })
 it('authorizes preflight before reading metadata',async()=>{
  mocks.access.mockResolvedValue({admin:false,userId:'other'})
  expect(await validateAdminManualTranscript({url:'ZBynl03Vp-w',json:startOnlyJson})).toMatchObject({ok:false,error:'Administrators only.'})
  expect(mocks.from).not.toHaveBeenCalled();expect(mocks.rpc).not.toHaveBeenCalled()
 })
})
describe('website transcript server boundaries',()=>{
 it('reports failed provenance marking and lets canonical reuse repair it on retry',async()=>{const lookup={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),maybeSingle:vi.fn().mockResolvedValue({data:{id:'saved'},error:null})};mocks.from.mockReturnValue(lookup);mocks.rpc.mockResolvedValueOnce({data:null,error:{message:'unavailable'}}).mockResolvedValueOnce({data:'saved',error:null});await expect(addAdminYouTubeTranscript('Dgj9fQYbCZY')).rejects.toThrow('provenance');expect(await addAdminYouTubeTranscript('Dgj9fQYbCZY')).toBe('saved');expect(mocks.rpc).toHaveBeenCalledTimes(2);expect(mocks.rpc).not.toHaveBeenCalledWith('register_youtube_transcript',expect.anything())})

 it.each([true,false])('passes canonical bilingual JSON and explicit publication=%s through the existing import RPC',async searchable=>{mocks.rpc.mockResolvedValue({data:'saved',error:null});const content=[{text:'حياكم الله',offset:0,duration:5270,english:'Welcome'}];expect(await importAdminManualTranscriptResult({url:'https://youtu.be/Dgj9fQYbCZY',title:'Title',channel:'',json:JSON.stringify({content}),searchable})).toEqual({ok:true,id:'saved'});expect(mocks.rpc).toHaveBeenCalledTimes(1);expect(mocks.rpc).toHaveBeenCalledWith('admin_import_grouped_transcript',expect.objectContaining({p_searchable:searchable,p_raw:{provider:'manual',lang:'ar',content}}))})
 it('returns useful JSON validation without touching the database',async()=>{const result=await importAdminManualTranscriptResult({url:'https://youtu.be/Dgj9fQYbCZY',title:'Title',channel:'',json:'{',searchable:true});expect(result).toEqual({ok:false,error:expect.stringContaining('Invalid transcript JSON')});expect(mocks.rpc).not.toHaveBeenCalled()})
 it('fails closed when the manual library migration is unavailable instead of mixing Shows into the list',async()=>{
  mocks.rpc.mockResolvedValue({data:null,error:{code:'PGRST202',message:'RPC missing'}})
  await expect(listAdminTranscripts()).rejects.toThrow('Apply the transcript groups migration')
  expect(mocks.from).not.toHaveBeenCalled()
 })
 it('denies generation, deletion and draft viewing before database access',async()=>{mocks.access.mockResolvedValue({admin:false,userId:'other'});mocks.guard.mockRejectedValue(new Error('Forbidden'));expect(await generateAdminTranscript('https://youtu.be/Dgj9fQYbCZY')).toEqual({ok:false,error:'Administrators only.'});expect(await deleteAdminTranscript('11111111-1111-4111-8111-111111111111')).toEqual({ok:false,error:'Administrators only.'});await expect(loadAdminTranscript('11111111-1111-4111-8111-111111111111')).rejects.toThrow('Forbidden');expect(mocks.rpc).not.toHaveBeenCalled();expect(mocks.from).not.toHaveBeenCalled()})
 it('queues automatic bilingual generation and reports canonical duplicates',async()=>{const id='33333333-3333-4333-8333-333333333333';mocks.rpc.mockResolvedValue({data:{id,duplicate:true},error:null});expect(await generateAdminTranscript('https://youtu.be/Dgj9fQYbCZY?t=30')).toEqual({ok:true,id,duplicate:true});expect(mocks.rpc).toHaveBeenCalledWith('admin_generate_youtube_transcript',{p_actor:'11111111-1111-4111-8111-111111111111',p_youtube_id:'Dgj9fQYbCZY'})})
 it('validates generation URLs before queuing',async()=>{expect((await generateAdminTranscript('https://example.com/video')).ok).toBe(false);expect(mocks.rpc).not.toHaveBeenCalled()})
 it('deletes through the authorized cascade RPC and invalidates public entry points',async()=>{mocks.rpc.mockResolvedValue({data:true,error:null});const id='33333333-3333-4333-8333-333333333333';expect(await deleteAdminTranscript(id)).toEqual({ok:true});expect(mocks.rpc).toHaveBeenCalledWith('admin_delete_youtube_transcript',{p_actor:'11111111-1111-4111-8111-111111111111',p_id:id});expect(mocks.revalidate).toHaveBeenCalledWith('/explore/search')})
 it('accepts phrase searches through the shared search RPC',async()=>{mocks.rpc.mockResolvedValue({data:[],error:null});await searchTranscriptWord('not alone');expect(mocks.rpc).toHaveBeenCalledWith('search_transcript_word',expect.objectContaining({p_word:'not alone'}))})
 it('denies non-admin imports and lists before database access',async()=>{mocks.access.mockResolvedValue({admin:false,userId:'other'});mocks.guard.mockRejectedValue(new Error('Forbidden'));await expect(addAdminYouTubeTranscript('https://youtu.be/Dgj9fQYbCZY')).rejects.toThrow('Forbidden');await expect(importAdminManualTranscript({url:'https://youtu.be/Dgj9fQYbCZY',title:'Title',channel:'',arabic:'text',searchable:true})).rejects.toThrow('Forbidden');await expect(listAdminTranscripts()).rejects.toThrow('Forbidden');expect(mocks.from).not.toHaveBeenCalled();expect(mocks.rpc).not.toHaveBeenCalled()})
 it('reuses stored historical content without queuing or calling a provider',async()=>{const lookup={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),maybeSingle:vi.fn().mockResolvedValue({data:{id:'saved'},error:null})};mocks.from.mockReturnValue(lookup);mocks.rpc.mockResolvedValue({data:'saved',error:null});expect(await addAdminYouTubeTranscript('https://youtu.be/Dgj9fQYbCZY')).toBe('saved');expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith('admin_record_transcript_origin',{p_actor:'11111111-1111-4111-8111-111111111111',p_id:'saved'})})
 it('queues new URLs through the existing ingestion RPC and authenticated actor',async()=>{const lookup={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),maybeSingle:vi.fn().mockResolvedValue({data:null,error:null})};mocks.from.mockReturnValue(lookup);mocks.rpc.mockResolvedValue({data:'new',error:null});expect(await addAdminYouTubeTranscript('https://youtu.be/Dgj9fQYbCZY')).toBe('new');expect(mocks.rpc).toHaveBeenCalledWith('register_youtube_transcript',{p_user:'11111111-1111-4111-8111-111111111111',p_youtube_id:'Dgj9fQYbCZY'})})
 it('normalises timed manual content and publishes only on explicit intent',async()=>{mocks.rpc.mockResolvedValue({data:'manual',error:null});await importAdminManualTranscript({url:'https://youtu.be/Dgj9fQYbCZY',title:'Title',channel:'Source',arabic:'00:00:01,200 --> 00:00:03,700\nتعلم العربية',searchable:false});expect(mocks.rpc).toHaveBeenCalledWith('admin_import_grouped_transcript',expect.objectContaining({p_searchable:false,p_raw:{provider:'manual',lang:'ar',content:[{text:'تعلم العربية',offset:1200,duration:2500}]}}))})
 it('uses one ranked search RPC with its compound rank/id cursor',async()=>{mocks.rpc.mockResolvedValue({data:[],error:null});await searchTranscriptWord('استطاع',99,2);expect(mocks.rpc).toHaveBeenCalledWith('search_transcript_word',{p_word:'استطاع',p_after:99,p_after_rank:2,p_limit:20})})
 it('does not expose unpublished canonical data through the public loader',async()=>{const lookup={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),maybeSingle:vi.fn().mockResolvedValue({data:null,error:null})};mocks.from.mockReturnValue(lookup);expect(await loadPublicTranscript('11111111-1111-4111-8111-111111111111')).toBeNull();expect(lookup.eq).toHaveBeenCalledWith('status','ready');expect(lookup.eq).toHaveBeenCalledWith('searchable',true);expect(mocks.from).toHaveBeenCalledTimes(1)})
})

it('requires a recognized YouTube URL or ID and a trimmed non-empty title before importing', async()=>{
  for(const input of [{url:'bad-id',title:'Title'},{url:'https://example.com/video',title:'Title'},{url:'https://youtu.be/Dgj9fQYbCZY',title:'   '}]){
    const result=await importAdminManualTranscriptResult({...input,json:'{"content":[]}',searchable:true})
    expect(result.ok).toBe(false)
  }
  expect(mocks.rpc).not.toHaveBeenCalled()
})
it('trims the title and supplies no duplicate source field for simple JSON imports',async()=>{
  mocks.rpc.mockResolvedValue({data:'saved',error:null})
  await importAdminManualTranscriptResult({url:'https://www.youtube.com/watch?v=Dgj9fQYbCZY',title:'  Video Title  ',json:JSON.stringify({content:[{text:'\u0645\u0631\u062d\u0628\u0627',offset:0,duration:5000,english:'Hello'}]}),searchable:true})
  expect(mocks.rpc).toHaveBeenCalledWith('admin_import_grouped_transcript',expect.objectContaining({p_title:'Video Title',p_channel:'Unknown channel',p_youtube_id:'Dgj9fQYbCZY'}))
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
  mocks.from.mockImplementation(table=>table==='youtube_transcripts'?videoQuery:table==='admin_manual_transcripts'?{select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),maybeSingle:vi.fn().mockResolvedValue({data:{group_id:null},error:null})}:segmentQuery)
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
  mocks.from.mockImplementation(table=>table==='youtube_transcripts'?video:table==='admin_manual_transcripts'?{select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),maybeSingle:vi.fn().mockResolvedValue({data:{group_id:null},error:null})}:segments)
  await expect(downloadAdminTranscriptJson('11111111-1111-4111-8111-111111111111')).rejects.toThrow('complete transcript')
})
it('exports preserved lexical metadata with the current indexed translation',async()=>{
  const id='11111111-1111-4111-8111-111111111111',text='\u0645\u0631\u062d\u0628\u0627'
  const tokens=[{id:'word-1',arabic:text,gloss:'hello',start_ms:0,end_ms:900,cefr:'a1',pos:'interjection'}]
  const video={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),maybeSingle:vi.fn().mockResolvedValueOnce({data:{title:'Rich',raw_transcript:{content:[{text,offset:0,duration:1000,english:'Old translation',sentence_id:'sentence-1',tokens,paragraph:1}]}},error:null}).mockResolvedValueOnce({data:{id},error:null})}
  const segments={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),gt:vi.fn().mockReturnThis(),order:vi.fn().mockReturnThis(),limit:vi.fn().mockResolvedValue({data:[{position:0,original_text:text,english_text:'Current translation',start_seconds:0,end_seconds:1}],error:null})}
  mocks.from.mockImplementation(table=>table==='youtube_transcripts'?video:table==='admin_manual_transcripts'?{select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),maybeSingle:vi.fn().mockResolvedValue({data:{group_id:null},error:null})}:segments)
  const result=await downloadAdminTranscriptJson(id)
  expect(JSON.parse(result.json).content[0]).toEqual({text,offset:0,duration:1000,english:'Current translation',sentence_id:'sentence-1',tokens,paragraph:1})
})

describe('editing JSON safely',()=>{
 const id='11111111-1111-4111-8111-111111111111',updatedAt='2026-10-08T12:00:00Z'
 const input={json:JSON.stringify({sentences:[{arabic:'مرحبا',start_ms:1234,end_ms:4567,english:'Hello',tokens:[{ar:'مرحبا',plain:'مرحبا',gloss:'hello',start_ms:1234,end_ms:2234}]}]}),title:'Video',channel:'Channel',searchable:true,updatedAt}
 function stored(){const query={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),single:vi.fn().mockResolvedValue({data:{duration_seconds:10},error:null})};mocks.from.mockReturnValue(query)}
 it('uses the shared normaliser and one atomic RPC on the same ID',async()=>{
  stored();mocks.rpc.mockResolvedValue({data:updatedAt,error:null})
  const result=await saveAdminTranscriptJson(id,input);expect(result).toMatchObject({ok:true,updatedAt})
  expect(mocks.rpc).toHaveBeenCalledTimes(1)
  expect(mocks.rpc).toHaveBeenCalledWith('admin_save_grouped_transcript',expect.objectContaining({p_id:id,p_updated_at:updatedAt,p_title:'Video',p_channel:'Channel',p_searchable:true,p_raw:expect.objectContaining({content:[expect.objectContaining({offset:1234,duration:3333,tokens:[expect.objectContaining({plain:'مرحبا',gloss:'hello',start_ms:1234})]})]})}))
  expect(mocks.revalidate.mock.calls.flat()).toEqual(expect.arrayContaining(['/explore/search','/explore',`/transcripts/${id}`]))
 })
 it('rejects syntax and multiple structural issues before any mutation',async()=>{
  stored()
  expect(await saveAdminTranscriptJson(id,{...input,json:'{broken'})).toMatchObject({ok:false,error:expect.stringContaining('Invalid transcript JSON')})
  const result=await saveAdminTranscriptJson(id,{...input,json:JSON.stringify({sentences:[{arabic:'مرحبا',end_ms:1000},{arabic:'مرحبا',start_ms:1000,end_ms:500}]})})
  expect(result).toMatchObject({ok:false,error:expect.stringContaining('Sentence 1')});if(!result.ok)expect(result.error).toContain('Sentence 2')
  expect(mocks.rpc).not.toHaveBeenCalled()
 })
 it('authorises before reading data',async()=>{
  mocks.access.mockResolvedValue({admin:false});expect(await saveAdminTranscriptJson(id,input)).toMatchObject({ok:false,error:'Administrators only.'})
  expect(mocks.from).not.toHaveBeenCalled();expect(mocks.rpc).not.toHaveBeenCalled()
 })
 it('returns useful concurrent-edit errors without changing editor data',async()=>{
  stored();mocks.rpc.mockResolvedValue({data:null,error:{message:'transcript_edit_conflict'}})
  expect(await saveAdminTranscriptJson(id,input)).toMatchObject({ok:false,error:expect.stringContaining('changed after you opened')})
 })
})

describe('server duration resolution shared by Import and Edit',()=>{
 const id='11111111-1111-4111-8111-111111111111',updatedAt='2026-10-08T12:00:00Z'
 it('uses actual YouTube duration for the final start-only segment',async()=>{
  mocks.duration.mockResolvedValue(657)
  expect(await validateAdminManualTranscript({url:'https://youtu.be/ZBynl03Vp-w',json:startOnlyJson})).toMatchObject({ok:true,durationSource:'youtube'})
  mocks.rpc.mockResolvedValue({data:'saved',error:null})
  expect(await importAdminManualTranscriptResult({url:'ZBynl03Vp-w',title:'Video',json:startOnlyJson,searchable:true})).toMatchObject({ok:true})
  expect(mocks.rpc).toHaveBeenCalledWith('admin_import_grouped_transcript',expect.objectContaining({p_raw:expect.objectContaining({content:expect.arrayContaining([expect.objectContaining({offset:630000,duration:27000})])})}))
  expect(mocks.from).not.toHaveBeenCalled()
 })
 it('does not fetch duration for complete timing or a middle order/duplicate error',async()=>{
  const text='مرحبا'
  expect(await validateAdminManualTranscript({url:'ZBynl03Vp-w',json:JSON.stringify([{text,start_ms:0,end_ms:1000}])})).toMatchObject({ok:true})
  for(const blocks of [[{text,start_ms:2000},{text,start_ms:1000},{text,start_ms:3000}],[{text,start_ms:0,paragraph:1},{text,start_ms:0,paragraph:2},{text,start_ms:3000}]]){
   const result=await validateAdminManualTranscript({url:'ZBynl03Vp-w',json:JSON.stringify(blocks)})
   expect(result).toMatchObject({ok:false,needsDuration:false});if(!result.ok)expect(result.error).not.toContain('Enter the video duration')
  }
  expect(mocks.duration).not.toHaveBeenCalled();expect(mocks.rpc).not.toHaveBeenCalled()
 })
 it('supports explicit minutes mode after automatic retrieval fails',async()=>{
  metadata(null)
  expect(await validateAdminManualTranscript({url:'ZBynl03Vp-w',json:startOnlyJson,duration:'11',durationFormat:'minutes'})).toMatchObject({ok:true,durationSource:'manual'})
 })
 it('uses the same merging, duration lookup and manual fallback in Edit',async()=>{
  mocks.from.mockReturnValue({select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),single:vi.fn().mockResolvedValue({data:{youtube_id:'ZBynl03Vp-w',duration_seconds:null},error:null})})
  mocks.duration.mockResolvedValue(660);mocks.rpc.mockResolvedValue({data:updatedAt,error:null})
  const json=JSON.stringify([{tokens:[{arabic:'أهلا',english:'welcome',pos:'noun',headword:'أهل',entry_type:'word',transliteration:'ahlan'}],timestamp:'08:22',translation:'Welcome'},{tokens:[{arabic:'بكم',english:'you',pos:'pronoun',headword:null,entry_type:'word',transliteration:'bikum'}],timestamp:'08:22',translation:'to you'},{arabic:'مرحبا',timestamp:'10:00'}])
  expect(await saveAdminTranscriptJson(id,{json,title:'Video',channel:'Channel',searchable:true,updatedAt})).toMatchObject({ok:true})
  expect(mocks.duration).toHaveBeenCalledWith('ZBynl03Vp-w')
  expect(mocks.rpc).toHaveBeenCalledWith('admin_save_grouped_transcript',expect.objectContaining({p_id:id,p_raw:expect.objectContaining({content:[expect.objectContaining({offset:502000,duration:98000,tokens:expect.any(Array)}),expect.objectContaining({offset:600000,duration:60000})]})}))
  mocks.duration.mockResolvedValue(null)
  expect(await saveAdminTranscriptJson(id,{json,title:'Video',channel:'Channel',searchable:true,updatedAt,duration:'00:11',durationFormat:'minutes'})).toMatchObject({ok:true})
 })
})

describe('admin transcript title search',()=>{
 it('uses server-wide search and pagination with a validated group filter',async()=>{
  mocks.rpc.mockResolvedValue({data:{rows:[{id:'match',title:'Arabic Lesson'}],total:41,groups:[],ungrouped:2},error:null})
  expect(await listAdminTranscripts(1,'  Lesson  ')).toMatchObject({rows:[{title:'Arabic Lesson'}],total:41})
  expect(mocks.rpc).toHaveBeenCalledWith('admin_list_manual_transcripts',expect.objectContaining({p_page:1,p_search:'Lesson',p_group:null,p_ungrouped:false}))
  await listAdminTranscripts(0,'قصة إبراهيم','ungrouped')
  expect(mocks.rpc).toHaveBeenLastCalledWith('admin_list_manual_transcripts',expect.objectContaining({p_search:'قصة إبراهيم',p_group:null,p_ungrouped:true}))
  await expect(listAdminTranscripts(0,'','invalid')).rejects.toThrow()
 })
 it('persists group, video ID and explicit clock duration in the atomic Edit RPC',async()=>{
  mocks.from.mockReturnValue({select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),single:vi.fn().mockResolvedValue({data:{youtube_id:'ZBynl03Vp-w',duration_seconds:657},error:null})})
  mocks.rpc.mockResolvedValue({data:'2026-10-08T12:00:00Z',error:null})
  expect(await saveAdminTranscriptJson('11111111-1111-4111-8111-111111111111',{json:JSON.stringify([{arabic:'مرحبا',start_ms:0,end_ms:5000}]),title:'New title',channel:'Preserved',searchable:true,updatedAt:'2026-10-08T11:00:00Z',url:'https://youtu.be/Dgj9fQYbCZY',groupId:'22222222-2222-4222-8222-222222222222',duration:'01:10:57'})).toMatchObject({ok:true})
  expect(mocks.rpc).toHaveBeenCalledWith('admin_save_grouped_transcript',expect.objectContaining({p_youtube_id:'Dgj9fQYbCZY',p_group:'22222222-2222-4222-8222-222222222222',p_duration:4257,p_channel:'Preserved'}))
 })
})

it('accepts a raw video ID and reports provider or migration failures precisely',async()=>{
 mocks.rpc.mockResolvedValue({data:{id:'33333333-3333-4333-8333-333333333333',duplicate:false},error:null})
 expect(await generateAdminTranscript('Dgj9fQYbCZY')).toMatchObject({ok:true,duplicate:false})
 mocks.rpc.mockResolvedValueOnce({data:null,error:{code:'PGRST202',message:'Missing RPC'}})
 expect(await generateAdminTranscript('Dgj9fQYbCZY')).toMatchObject({ok:false,error:expect.stringContaining('website_generation_configuration_repair')})
 mocks.rpc.mockResolvedValueOnce({data:null,error:{message:'provider_not_configured'}})
 expect(await generateAdminTranscript('Dgj9fQYbCZY')).toMatchObject({ok:false,error:expect.stringContaining('SUPADATA_API_KEY')})
})

describe('standalone metadata-only group moves',()=>{
 const id='33333333-3333-4333-8333-333333333333',groupId='44444444-4444-4444-8444-444444444444',updatedAt='2026-10-08T12:00:00Z'
 it('sends only assignment and concurrency metadata, with no content reads or public revalidation',async()=>{
  mocks.rpc.mockResolvedValue({data:updatedAt,error:null})
  expect(await moveAdminTranscriptGroup(id,{groupId,previousGroupId:null,updatedAt})).toEqual({ok:true,updatedAt})
  expect(mocks.rpc).toHaveBeenCalledWith('admin_move_standalone_transcript',{p_actor:'11111111-1111-4111-8111-111111111111',p_id:id,p_group:groupId,p_previous_group:null,p_updated_at:updatedAt})
  expect(mocks.from).not.toHaveBeenCalled();expect(mocks.revalidate.mock.calls).toEqual([['/admin/transcripts']])
 })
 it('denies non-admin moves before database access',async()=>{
  mocks.access.mockResolvedValue({admin:false,userId:'other'})
  expect(await moveAdminTranscriptGroup(id,{groupId:null,previousGroupId:groupId,updatedAt})).toEqual({ok:false,error:'Administrators only.'});expect(mocks.rpc).not.toHaveBeenCalled()
 })
 it('reports stale assignment separately from invalid group',async()=>{
  mocks.rpc.mockResolvedValue({data:null,error:{message:'transcript_group_conflict'}})
  expect(await moveAdminTranscriptGroup(id,{groupId,previousGroupId:null,updatedAt})).toMatchObject({ok:false,error:expect.stringContaining('group changed')})
 })
})

it('reports a database segment failure through Import without a second write',async()=>{
 mocks.rpc.mockResolvedValue({data:null,error:{code:'P0001',message:'Import timing validation: Segment 2, token 1: headword must be text or null.'}})
 expect(await importAdminManualTranscriptResult({url:'AWMFILE0001',title:'AWM',json:JSON.stringify([{arabic:'\u0645\u0631\u062d\u0628\u0627',start_ms:0,end_ms:5000}]),searchable:true})).toEqual({ok:false,error:expect.stringContaining('Segment 2, token 1: headword')})
 expect(mocks.rpc).toHaveBeenCalledTimes(1)
 expect(mocks.revalidate).not.toHaveBeenCalled()
})

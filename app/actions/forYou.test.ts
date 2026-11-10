// @vitest-environment node
import {beforeEach,expect,it,vi} from 'vitest'
const mocks=vi.hoisted(()=>({spotlight:vi.fn(),pool:vi.fn(),user:vi.fn(),from:vi.fn(),video:vi.fn(),segments:vi.fn(),filter:vi.fn(),rpc:vi.fn()}))
vi.mock('@/app/lib/transcriptSourceLanguage.server',()=>({transcriptSourceLanguages:async()=>new Map()}))
vi.mock('@/app/lib/forYouGroups',()=>({forYouGroupPool:mocks.pool}))
vi.mock('@/app/lib/homeSpotlight.server',()=>({loadHomeSpotlight:mocks.spotlight}))
vi.mock('@/app/lib/supabase',()=>({serviceClient:{from:mocks.from,rpc:mocks.rpc}}))
vi.mock('@/app/actions/auth',()=>({getAuthenticatedUserId:mocks.user}))
vi.mock('next/headers',()=>({headers:async()=>new Headers()}))
vi.mock('@/app/lib/durableRateLimit',()=>({durableRateLimit:async()=>({ok:true,retryAfterSeconds:1})}))
vi.mock('next/cache',()=>({unstable_cache:(fn:unknown)=>fn}))
import {fetchHomeForYouSpotlight,fetchForYouTranscript,fetchForYouClips,fetchForYouGroups} from './forYou'
const id='99999999-9999-4999-8999-999999999990'
beforeEach(()=>{
 vi.clearAllMocks()
 mocks.pool.mockImplementation(async(language,groups)=>({groups:language==='en'?['5b98c563-5c35-4696-98e1-06aa000eb622']:groups,empty:false,accepts:()=>true}))
 mocks.user.mockResolvedValue('signed-in-user');mocks.spotlight.mockResolvedValue(null)
 mocks.video.mockResolvedValue({data:{id,raw_transcript:{content:[{tokens:[{arabic:'كِتَابٌ',english:'book',start_ms:495000,end_ms:496000}]}]}},error:null})
 mocks.segments.mockResolvedValue({data:[{id:1,position:0,original_text:'كِتَابٌ',english_text:'A book.',start_seconds:495,end_seconds:540,canonical_paragraph:null}],error:null})
 mocks.from.mockImplementation((table:string)=>{
  const q={select:()=>q,eq:(...args:unknown[])=>{mocks.filter(...args);return q},filter:()=>q,gt:()=>q,gte:()=>q,lte:()=>q,order:()=>q,limit:()=>q,maybeSingle:mocks.video,then:(resolve:(value:unknown)=>unknown)=>mocks.segments().then(resolve)}
  if(!['youtube_transcripts','transcript_segments'].includes(table))throw new Error('Unexpected table')
  return q
 })
})
it('loads source timing and real token timing under the independent For You publication boundary',async()=>{
 const result=await fetchForYouTranscript(id)
 expect(result[0].tokens).toEqual([{arabic:'كِتَابٌ',english:'book',start_seconds:495,end_seconds:496}])
 expect(mocks.filter).toHaveBeenCalledWith('explore_published',true)
 expect(mocks.filter).not.toHaveBeenCalledWith('searchable',true)
})
it('does not load segments when a source is no longer published',async()=>{
 mocks.video.mockResolvedValue({data:null,error:null})
 expect(await fetchForYouTranscript(id)).toEqual([])
 expect(mocks.from).toHaveBeenCalledTimes(1)
})

it('passes selected groups and five-result limit to the publication-aware RPC',async()=>{
 mocks.rpc.mockResolvedValue({data:[],error:null})
 await fetchForYouClips('filtered',[],[],[id])
 expect(mocks.rpc).toHaveBeenCalledWith('transcript_for_you_groups',expect.objectContaining({p_group_ids:[id],p_limit:5}))
 await expect(fetchForYouClips('filtered',[],[],['invalid'])).rejects.toThrow()
})
it('loads real group names',async()=>{
 mocks.from.mockReturnValue({select:()=>({order:()=>Promise.resolve({data:[{id,name:'Actual group'}],error:null})})})
 expect(await fetchForYouGroups()).toEqual([{id,name:'Actual group'}])
})

it('allows guest eligible clips/transcripts but keeps Admin group names authenticated',async()=>{
 mocks.user.mockResolvedValue(null);mocks.rpc.mockResolvedValue({data:[],error:null})
 expect(await fetchForYouClips('seed')).toEqual([])
 expect(await fetchForYouTranscript(id)).toHaveLength(1)
 expect(mocks.filter).toHaveBeenCalledWith('status','ready')
 expect(mocks.filter).toHaveBeenCalledWith('explore_published',true)
 await expect(fetchForYouGroups()).rejects.toThrow('Sign in')
})
it('rejects a malformed clip and fills its slot with the next eligible source',async()=>{
 const good=(suffix:string,segmentId:number)=>({video:{status:'ready',explore_published:true,id:`99999999-9999-4999-8999-99999999999${suffix}`,youtube_id:`abcdefghij${suffix}`,title:null},clip_start_ms:0,clip_end_ms:45000,segments:[{id:segmentId,position:0,start_seconds:0,end_seconds:45,original_text:'A meaningful spoken sentence for learners.',canonical_paragraph:{tokens:[{arabic:'كتاب',english:'book'}]}}]})
 mocks.rpc.mockResolvedValueOnce({data:[{...good('1',100),segments:[{id:100}]},good('2',101)],error:null}).mockResolvedValueOnce({data:[good('3',102)],error:null})
 const result=await fetchForYouClips('seed')
 expect(result.map(clip=>clip.video.id)).toEqual([good('2',101).video.id,good('3',102).video.id])
 expect(mocks.rpc.mock.calls[1][1].p_excluded).toEqual([100,101])
})
it('loads stored raw tokens if an older RPC omits source tokens',async()=>{
 mocks.rpc.mockResolvedValue({data:[{video:{status:'ready',explore_published:true,id,youtube_id:'abcdefghij0'},clip_start_ms:495000,clip_end_ms:540000,segments:[{id:1,position:0,original_text:'A meaningful spoken sentence for learners.',english_text:null,start_seconds:495,end_seconds:540,canonical_paragraph:null}]}],error:null})
 expect((await fetchForYouClips('seed'))[0].segments[0].tokens[0].english).toBe('book')
})
it('bounds recent sources to the live RPC limit without losing the selected seed',async()=>{
 mocks.rpc.mockResolvedValue({data:[],error:null})
 await fetchForYouClips('fixed',[],Array.from({length:120},()=>id))
 expect(mocks.rpc.mock.calls[0][1].p_recent).toHaveLength(100)
})
it('skips null or malformed full-transcript rows without failing the source',async()=>{
 mocks.segments.mockResolvedValue({data:[null,{id:4}, {id:1,position:0,original_text:'A meaningful spoken sentence for learners.',english_text:null,start_seconds:495,end_seconds:540,canonical_paragraph:null}],error:null})
 expect(await fetchForYouTranscript(id)).toHaveLength(1)
})

it('public Spotlight delegates once to its dedicated selector without feed/account discovery',async()=>{
 expect(await fetchHomeForYouSpotlight()).toBeNull()
 expect(mocks.spotlight).toHaveBeenCalledOnce();expect(mocks.pool).not.toHaveBeenCalled();expect(mocks.rpc).not.toHaveBeenCalled();expect(mocks.user).not.toHaveBeenCalled();expect(mocks.from).not.toHaveBeenCalled()
})
it('requests English explicitly and rejects invalid languages rather than mixing pools',async()=>{
 mocks.rpc.mockResolvedValue({data:[],error:null});expect(await fetchForYouClips('en-seed',[],[],[],'en')).toEqual([])
 expect(mocks.rpc).toHaveBeenLastCalledWith('transcript_for_you_groups',expect.objectContaining({p_group_ids:['5b98c563-5c35-4696-98e1-06aa000eb622']}))
 await expect(fetchForYouClips('seed',[],[],[],'fr' as 'en')).rejects.toThrow()
})

it('normal AR feed still discards English sources before raw token fallback and refill from the existing RPC',async()=>{
 mocks.pool.mockResolvedValue({groups:[],empty:false,accepts:(source:string)=>source!==id})
 const outside='99999999-9999-4999-8999-999999999991'
 const clip=(source:string,segment:number)=>({video:{id:source,youtube_id:'abcdefghij0'},clip_start_ms:0,clip_end_ms:45000,segments:[{id:segment,position:0,start_seconds:0,end_seconds:45,original_text:'A meaningful spoken sentence for learners.',source_tokens:[{arabic:'book',english:'book'}]}]})
 mocks.from.mockImplementation((table:string)=>{
  if(table!=='for_you_candidates')throw new Error('Unexpected raw lookup for excluded English source')
  const q={select:()=>q,eq:()=>q,order:()=>q,range:async()=>({data:[{segment_id:1},{segment_id:2}],error:null})};return q
 })
 mocks.rpc.mockResolvedValueOnce({data:[clip(id,1)],error:null}).mockResolvedValueOnce({data:[clip(outside,3)],error:null})
 expect((await fetchForYouClips('normal'))[0]?.video.id).toBe(outside)
 expect(mocks.rpc.mock.calls[1][1].p_excluded).toEqual([1,2]);expect(mocks.user).toHaveBeenCalled()
})
it('empty selected-group intersection never calls an unrestricted RPC',async()=>{
 mocks.pool.mockResolvedValue({groups:[],empty:true,accepts:()=>false})
 expect(await fetchForYouClips('seed',[],[],[id],'en')).toEqual([]);expect(mocks.rpc).not.toHaveBeenCalled()
})

it('normal feed retains its ten-second candidates without Homepage duration constraints',async()=>{
 const candidate={video:{id,youtube_id:'abcdefghij0'},clip_start_ms:0,clip_end_ms:10000,segments:[{id:1,position:0,start_seconds:0,end_seconds:10,original_text:'A complete meaningful spoken thought for learners.',source_tokens:[{arabic:'book',english:'book'}]}]}
 mocks.rpc.mockResolvedValue({data:[candidate],error:null})
 expect((await fetchForYouClips('normal'))[0].clip_end_ms).toBe(10000);expect(mocks.spotlight).not.toHaveBeenCalled()
})
it('surfaces Spotlight errors without entering the feed refill machinery',async()=>{
 mocks.spotlight.mockRejectedValue(new Error('Preview unavailable'))
 await expect(fetchHomeForYouSpotlight()).rejects.toThrow('Preview unavailable');expect(mocks.spotlight).toHaveBeenCalledOnce();expect(mocks.rpc).not.toHaveBeenCalled()
})

it('rejects non-speech candidates and refills using the same existing filtered RPC',async()=>{
 const make=(source:string,segment:number,text:string)=>({video:{id:source,youtube_id:'abcdefghij0'},clip_start_ms:0,clip_end_ms:45000,segments:[{id:segment,position:0,start_seconds:0,end_seconds:45,original_text:text,canonical_paragraph:{tokens:[{arabic:text,english:text}]}}]})
 const bad=make(id,900,'[Music]'),good=make('99999999-9999-4999-8999-999999999991',901,'This complete spoken sentence is useful for learning.')
 mocks.rpc.mockResolvedValueOnce({data:[bad],error:null}).mockResolvedValueOnce({data:[good],error:null})
 const result=await fetchForYouClips('speech');expect(result.map(clip=>clip.video.id)).toEqual([good.video.id]);expect(mocks.rpc.mock.calls[1][1].p_excluded).toContain(900)
})

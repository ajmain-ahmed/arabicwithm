// @vitest-environment node
import {beforeEach,expect,it,vi} from 'vitest'
const mocks=vi.hoisted(()=>({pool:vi.fn(),user:vi.fn(),from:vi.fn(),video:vi.fn(),segments:vi.fn(),filter:vi.fn(),rpc:vi.fn()}))
vi.mock('@/app/lib/forYouGroups',()=>({forYouGroupPool:mocks.pool}))
vi.mock('@/app/lib/supabase',()=>({serviceClient:{from:mocks.from,rpc:mocks.rpc}}))
vi.mock('@/app/actions/auth',()=>({getAuthenticatedUserId:mocks.user}))
vi.mock('next/headers',()=>({headers:async()=>new Headers()}))
vi.mock('@/app/lib/rateLimit',()=>({rateLimit:()=>({ok:true})}))
vi.mock('next/cache',()=>({unstable_cache:(fn:unknown)=>fn}))
import {fetchHomeForYouSpotlight,fetchForYouTranscript,fetchForYouClips,fetchForYouGroups} from './forYou'
const id='99999999-9999-4999-8999-999999999990'
beforeEach(()=>{
 vi.clearAllMocks()
 mocks.pool.mockImplementation(async(language,groups)=>({groups:language==='en'?['5b98c563-5c35-4696-98e1-06aa000eb622']:groups,empty:false,accepts:()=>true}))
 mocks.user.mockResolvedValue('signed-in-user')
 mocks.video.mockResolvedValue({data:{id,raw_transcript:{content:[{tokens:[{arabic:'كِتَابٌ',english:'book',start_ms:495000,end_ms:496000}]}]}},error:null})
 mocks.segments.mockResolvedValue({data:[{id:1,position:0,original_text:'كِتَابٌ',english_text:'A book.',start_seconds:495,end_seconds:500,canonical_paragraph:null}],error:null})
 mocks.from.mockImplementation((table:string)=>{
  const q={select:()=>q,eq:(...args:unknown[])=>{mocks.filter(...args);return q},filter:()=>q,gt:()=>q,order:()=>q,limit:()=>q,maybeSingle:mocks.video,then:(resolve:(value:unknown)=>unknown)=>mocks.segments().then(resolve)}
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
 const good=(suffix:string,segmentId:number)=>({video:{status:'ready',explore_published:true,id:`99999999-9999-4999-8999-99999999999${suffix}`,youtube_id:`abcdefghij${suffix}`,title:null},clip_start_ms:0,clip_end_ms:10000,segments:[{id:segmentId,position:0,start_seconds:0,end_seconds:10,original_text:'كتاب',canonical_paragraph:{tokens:[{arabic:'كتاب',english:'book'}]}}]})
 mocks.rpc.mockResolvedValueOnce({data:[{...good('1',100),segments:[{id:100}]},good('2',101)],error:null}).mockResolvedValueOnce({data:[good('3',102)],error:null})
 const result=await fetchForYouClips('seed')
 expect(result.map(clip=>clip.video.id)).toEqual([good('2',101).video.id,good('3',102).video.id])
 expect(mocks.rpc.mock.calls[1][1].p_excluded).toEqual([100,101])
})
it('loads stored raw tokens if an older RPC omits source tokens',async()=>{
 mocks.rpc.mockResolvedValue({data:[{video:{status:'ready',explore_published:true,id,youtube_id:'abcdefghij0'},clip_start_ms:495000,clip_end_ms:500000,segments:[{id:1,position:0,original_text:'كتاب',english_text:null,start_seconds:495,end_seconds:500,canonical_paragraph:null}]}],error:null})
 expect((await fetchForYouClips('seed'))[0].segments[0].tokens[0].english).toBe('book')
})
it('bounds recent sources to the live RPC limit without losing the selected seed',async()=>{
 mocks.rpc.mockResolvedValue({data:[],error:null})
 await fetchForYouClips('fixed',[],Array.from({length:120},()=>id))
 expect(mocks.rpc.mock.calls[0][1].p_recent).toHaveLength(100)
})
it('skips null or malformed full-transcript rows without failing the source',async()=>{
 mocks.segments.mockResolvedValue({data:[null,{id:4}, {id:1,position:0,original_text:'كتاب',english_text:null,start_seconds:495,end_seconds:500,canonical_paragraph:null}],error:null})
 expect(await fetchForYouTranscript(id)).toHaveLength(1)
})

it('public spotlight uses one Arabic clip with fresh seeds and no account/usage calls',async()=>{
 mocks.user.mockResolvedValue(null);mocks.rpc.mockResolvedValue({data:[],error:null})
 expect(await fetchHomeForYouSpotlight()).toBeNull();expect(await fetchHomeForYouSpotlight()).toBeNull()
 expect(mocks.user).not.toHaveBeenCalled();expect(mocks.from).not.toHaveBeenCalled()
 expect(mocks.rpc.mock.calls.every(([name,args])=>name==='transcript_for_you_groups'&&args.p_limit===1)).toBe(true)
 expect(mocks.rpc.mock.calls[0][1].p_seed).not.toBe(mocks.rpc.mock.calls[1][1].p_seed)
})
it('requests English explicitly and rejects invalid languages rather than mixing pools',async()=>{
 mocks.rpc.mockResolvedValue({data:[],error:null});expect(await fetchForYouClips('en-seed',[],[],[],'en')).toEqual([])
 expect(mocks.rpc).toHaveBeenLastCalledWith('transcript_for_you_groups',expect.objectContaining({p_group_ids:['5b98c563-5c35-4696-98e1-06aa000eb622']}))
 await expect(fetchForYouClips('seed',[],[],[],'fr' as 'en')).rejects.toThrow()
})

it('AR and public teaser discard English sources before raw token fallback and refill from the existing RPC',async()=>{
 mocks.pool.mockResolvedValue({groups:[],empty:false,accepts:(source:string)=>source!==id})
 const outside='99999999-9999-4999-8999-999999999991'
 const clip=(source:string,segment:number)=>({video:{id:source,youtube_id:'abcdefghij0'},clip_start_ms:0,clip_end_ms:10000,segments:[{id:segment,position:0,start_seconds:0,end_seconds:10,original_text:'book',source_tokens:[{arabic:'book',english:'book'}]}]})
 mocks.from.mockImplementation((table:string)=>{
  if(table!=='for_you_candidates')throw new Error('Unexpected raw lookup for excluded English source')
  const q={select:()=>q,eq:()=>q,order:()=>q,range:async()=>({data:[{segment_id:1},{segment_id:2}],error:null})};return q
 })
 mocks.rpc.mockResolvedValueOnce({data:[clip(id,1)],error:null}).mockResolvedValueOnce({data:[clip(outside,3)],error:null})
 expect((await fetchHomeForYouSpotlight())?.video.id).toBe(outside)
 expect(mocks.rpc.mock.calls[1][1].p_excluded).toEqual([1,2]);expect(mocks.user).not.toHaveBeenCalled()
})
it('empty selected-group intersection never calls an unrestricted RPC',async()=>{
 mocks.pool.mockResolvedValue({groups:[],empty:true,accepts:()=>false})
 expect(await fetchForYouClips('seed',[],[],[id],'en')).toEqual([]);expect(mocks.rpc).not.toHaveBeenCalled()
})

// @vitest-environment node
import {beforeEach,expect,it,vi} from 'vitest'
const mocks=vi.hoisted(()=>({from:vi.fn(),video:vi.fn(),segments:vi.fn(),filter:vi.fn(),rpc:vi.fn()}))
vi.mock('@/app/lib/supabase',()=>({serviceClient:{from:mocks.from,rpc:mocks.rpc}}))
vi.mock('next/cache',()=>({unstable_cache:(fn:unknown)=>fn}))
import {fetchForYouTranscript,fetchForYouClips,fetchForYouGroups} from './forYou'
const id='99999999-9999-4999-8999-999999999990'
beforeEach(()=>{
 vi.clearAllMocks()
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

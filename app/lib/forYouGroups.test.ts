// @vitest-environment node
import {beforeEach,expect,it,vi} from 'vitest'
const state=vi.hoisted(()=>({groups:[] as {id:string;parent_id:string|null;name?:string}[],members:[] as {transcript_id:string;group_id:string|null}[],failure:false}))
vi.mock('@/app/lib/supabase',()=>({serviceClient:{from:(table:string)=>{
 let ids:string[]=[]
 const q={select:()=>q,order:()=>q,in:(_key:string,values:string[])=>{ids=values;return q},range:async(start:number,end:number)=>({data:(table==='transcript_groups'?state.groups:state.members.filter(m=>m.group_id&&ids.includes(m.group_id))).slice(start,end+1),error:state.failure?{}:null})}
 return q
}}}))
import {ENGLISH_TRANSCRIPT_GROUP_ID as english,forYouGroupPool} from './forYouGroups'
beforeEach(()=>{state.failure=false;state.groups=[{id:english,parent_id:null,name:'English'},{id:'other',parent_id:null}];state.members=[{transcript_id:'B',group_id:english},{transcript_id:'A',group_id:null}]})
it('partitions English B and ungrouped A without duplicate metadata',async()=>{
 const ar=await forYouGroupPool('ar',[]),en=await forYouGroupPool('en',[])
 expect(ar.accepts('A')).toBe(true);expect(en.accepts('A')).toBe(false)
 expect(ar.accepts('B')).toBe(false);expect(en.accepts('B')).toBe(true)
 expect(en.groups).toEqual([english]);expect(ar.groups).toEqual([])
})
it('fresh requests reflect moves into and out of English, including renamed groups',async()=>{
 state.members[0].group_id=null;state.members[1].group_id=english;state.groups[0].name='Renamed'
 const ar=await forYouGroupPool('ar',[]),en=await forYouGroupPool('en',[])
 expect(ar.accepts('A')).toBe(false);expect(en.accepts('A')).toBe(true)
 expect(ar.accepts('B')).toBe(true);expect(en.accepts('B')).toBe(false)
})
it('preserves subtree semantics and intersects EN with selected groups rather than unioning',async()=>{
 state.groups.push({id:'child',parent_id:english});state.members.push({transcript_id:'C',group_id:'child'})
 expect((await forYouGroupPool('en',[])).accepts('C')).toBe(true)
 expect((await forYouGroupPool('en',['child'])).groups).toEqual(['child'])
 expect((await forYouGroupPool('en',['other'])).empty).toBe(true)
 expect((await forYouGroupPool('ar',['other'])).groups).toEqual(['other'])
})
it('fails closed on missing identity or failed membership reads',async()=>{
 state.groups=[];await expect(forYouGroupPool('ar',[])).rejects.toThrow('unavailable')
 state.failure=true;await expect(forYouGroupPool('en',[])).rejects.toThrow('classification')
})
it('paginates membership rather than dropping English entries after the API row limit',async()=>{
 state.members=Array.from({length:1001},(_,i)=>({transcript_id:String(i),group_id:english}))
 expect((await forYouGroupPool('ar',[])).accepts('1000')).toBe(false)
})

it('Imports remains eligible in the ordinary AR pool; English membership still controls classification',async()=>{
 state.groups.push({id:'imports',name:'Imports',parent_id:null});state.members.push({transcript_id:'imported',group_id:'imports'})
 const ar=await forYouGroupPool('ar',[]);expect(ar.accepts('imported')).toBe(true);expect(ar.groups).toEqual([])
 state.members.push({transcript_id:'imported',group_id:english})
 expect((await forYouGroupPool('en',[])).accepts('imported')).toBe(true)
 expect((await forYouGroupPool('ar',[])).accepts('imported')).toBe(false)
})

import { serviceClient } from '@/app/lib/supabase'

import {ENGLISH_TRANSCRIPT_GROUP_ID,transcriptGroupDescendants} from '@/app/lib/transcriptGroupTree'
export {ENGLISH_TRANSCRIPT_GROUP_ID} from '@/app/lib/transcriptGroupTree'

export async function loadTranscriptGroupTree(){
 const groups:{id:string;parent_id:string|null}[]=[]
 for(let offset=0;;offset+=500){
  const {data,error}=await serviceClient.from('transcript_groups').select('id,parent_id').order('id').range(offset,offset+499)
  if(error||!data)throw new Error('Unable to load For You classification. Please retry.')
  groups.push(...data)
  if(data.length<500)break
 }
 return groups
}

export async function forYouGroupPool(language:'ar'|'en', selected:string[]) {
 const groups=await loadTranscriptGroupTree()
 if(!groups.some(g=>g.id===ENGLISH_TRANSCRIPT_GROUP_ID))throw new Error('The configured English transcript group is unavailable.')
 const descendants=(roots:string[])=>transcriptGroupDescendants(groups,roots)
 const english=descendants([ENGLISH_TRANSCRIPT_GROUP_ID])
 const members=new Set<string>()
 // Chunk group IDs so even a large group tree fits PostgREST request URLs.
 const family=[...english]
 for(let i=0;i<family.length;i+=100)for(let offset=0;;offset+=500){
  const {data,error}=await serviceClient.from('admin_manual_transcripts').select('transcript_id').in('group_id',family.slice(i,i+100)).order('transcript_id').range(offset,offset+499)
  if(error||!data)throw new Error('Unable to load For You classification. Please retry.')
  for(const row of data)members.add(row.transcript_id)
  if(data.length<500)break
 }
 let filter=selected
 if(language==='en'){
  const allowed=selected.length?new Set([...descendants(selected)].filter(id=>english.has(id))):english
  // Minimal roots preserve the RPC's existing descendant semantics and AND intersection.
  filter=groups.filter(g=>allowed.has(g.id)&&(!g.parent_id||!allowed.has(g.parent_id))).map(g=>g.id)
  if(filter.length>100)throw new Error('Select fewer transcript groups.')
 }
 return {groups:filter,empty:language==='en'&&!filter.length,accepts:(id:string)=>members.has(id)===(language==='en')}
}

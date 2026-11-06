import { serviceClient } from '@/app/lib/supabase'

// Verified from the existing English group by a read-only setup query.
// Bind to identity, never the editable display name. No classification is stored twice.
export const ENGLISH_TRANSCRIPT_GROUP_ID = '5b98c563-5c35-4696-98e1-06aa000eb622'

export async function forYouGroupPool(language:'ar'|'en', selected:string[]) {
 const groups:{id:string;parent_id:string|null}[]=[]
 for(let offset=0;;offset+=500){
  const {data,error}=await serviceClient.from('transcript_groups').select('id,parent_id').order('id').range(offset,offset+499)
  if(error||!data)throw new Error('Unable to load For You classification. Please retry.')
  groups.push(...data)
  if(data.length<500)break
 }
 if(!groups.some(g=>g.id===ENGLISH_TRANSCRIPT_GROUP_ID))throw new Error('The configured English transcript group is unavailable.')
 const descendants=(roots:string[])=>{
  const ids=new Set(roots)
  for(let changed=true;changed;){changed=false;for(const g of groups)if(g.parent_id&&ids.has(g.parent_id)&&!ids.has(g.id)){ids.add(g.id);changed=true}}
  return ids
 }
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

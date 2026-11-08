// Shared identity/tree semantics for Admin and the For You source pools.
export const ENGLISH_TRANSCRIPT_GROUP_ID = '5b98c563-5c35-4696-98e1-06aa000eb622'
export interface TranscriptGroupNode {id:string;parent_id:string|null}
export function transcriptGroupDescendants(groups:readonly TranscriptGroupNode[],roots:readonly string[]):Set<string>{
 const ids=new Set(roots)
 for(let changed=true;changed;){changed=false;for(const group of groups)if(group.parent_id&&ids.has(group.parent_id)&&!ids.has(group.id)){ids.add(group.id);changed=true}}
 return ids
}
export function isEnglishTranscriptGroup(id:string|null|undefined,groups:readonly TranscriptGroupNode[]):boolean{
 return Boolean(id&&transcriptGroupDescendants(groups,[ENGLISH_TRANSCRIPT_GROUP_ID]).has(id))
}

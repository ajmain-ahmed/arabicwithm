import 'server-only'
import {createHash} from 'node:crypto'
import {serviceClient} from '@/app/lib/supabase'
export const metadataEntities=['book','chapter','show','episode','transcript','transcript_group'] as const
export type MetadataEntity=typeof metadataEntities[number]
export const sourceFingerprint=(value:string)=>createHash('sha256').update(value).digest('hex')
export interface MetadataRecord{id:string;title:string;description?:string|null;titleAr?:string}
/** Call only after the caller's existing parent publication/access checks.
 * Never export this as a public arbitrary-ID action or share Admin results in cache. */
export async function approvedMetadata(entity:MetadataEntity,eligible:MetadataRecord[]){
 if(eligible.length>100)throw new Error('Localisation metadata batch exceeds 100 records.')
 if(!eligible.length)return new Map<string,{title?:string;description?:string}>()
 const {data,error}=await serviceClient.from('content_localisations').select('entity_id,field,value,source_hash').eq('entity_type',entity).eq('locale','ar').eq('status','approved').in('entity_id',eligible.map(row=>row.id)).limit(eligible.length*2)
 if(error)throw new Error('Unable to load localised metadata.')
 const result=new Map<string,{title?:string;description?:string}>()
 for(const item of data??[]){const record=eligible.find(row=>row.id===item.entity_id);if(!record||!['title','description'].includes(item.field))continue;const source=item.field==='title'?record.title:record.description;if(!source||sourceFingerprint(source)!==item.source_hash)continue;result.set(item.entity_id,{...result.get(item.entity_id),[item.field]:item.value})}
 return result
}
export async function adminMetadataSource(entity:MetadataEntity,id:string):Promise<MetadataRecord>{
 // Explicit branches avoid selecting chapter JSON or transcript bodies.
 if(entity==='book'||entity==='show'){
  const {data,error}=await serviceClient.from(entity==='book'?'books':'shows').select('id,title,title_ar,description').eq('id',id).single();if(error||!data)throw new Error('Content record not found.');return {id:data.id,title:data.title,titleAr:data.title_ar??undefined,description:data.description}
 }
 if(entity==='episode'){const {data,error}=await serviceClient.from('episodes').select('id,title,description').eq('id',id).single();if(error||!data)throw new Error('Content record not found.');return data}
 if(entity==='chapter'){const {data,error}=await serviceClient.from('chapters').select('id,title').eq('id',id).single();if(error||!data)throw new Error('Content record not found.');return data}
 if(entity==='transcript'){const {data,error}=await serviceClient.from('youtube_transcripts').select('id,title').eq('id',id).single();if(error||!data)throw new Error('Content record not found.');return data}
 const {data,error}=await serviceClient.from('transcript_groups').select('id,name').eq('id',id).single();if(error||!data)throw new Error('Content record not found.');return {id:data.id,title:data.name}
}
export async function enrichEligibleMetadata<T extends MetadataRecord>(entity:MetadataEntity,eligible:T[]):Promise<(T&{titleAr?:string;descriptionAr?:string})[]>{
 try{
  const translated=new Map<string,{title?:string;description?:string}>()
  for(let offset=0;offset<eligible.length;offset+=100)for(const [id,value] of await approvedMetadata(entity,eligible.slice(offset,offset+100)))translated.set(id,value)
  return eligible.map(row=>({...row,titleAr:row.titleAr?.trim()?row.titleAr:translated.get(row.id)?.title,descriptionAr:translated.get(row.id)?.description}))
 }catch{console.warn('[localisation] Metadata unavailable; preserving original display metadata.');return eligible}
}

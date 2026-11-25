import 'server-only'
import {serviceClient} from '@/app/lib/supabase'
import {sourceFingerprint,type MetadataEntity,type MetadataRecord} from '@/app/lib/localisation/metadata.server'
import {assessBulkRow,type BulkFile,type BulkResult,type StoredTranslation} from './bulk'

const definitions={
 book:{table:'books',columns:'id,title,title_ar,description'},
 show:{table:'shows',columns:'id,title,title_ar,description'},
 chapter:{table:'chapters',columns:'id,title'},episode:{table:'episodes',columns:'id,title,description'},
 transcript:{table:'youtube_transcripts',columns:'id,title'},transcript_group:{table:'transcript_groups',columns:'id,name'},
} as const
const mapSource=(row:Record<string,unknown>):MetadataRecord=>({id:String(row.id),title:String(row.title??row.name??''),description:typeof row.description==='string'?row.description:null,titleAr:typeof row.title_ar==='string'?row.title_ar:undefined})
/** Caller must guardAdmin before invoking any bulk read or write. No bodies or
 * publication fields are selected, let alone modified. */
export async function readBulkSources(entity:MetadataEntity,selection:{after?:string;ids?:string[]}){
 const definition=definitions[entity]
 let query=serviceClient.from(definition.table).select(definition.columns).order('id').limit(selection.ids?100:51)
 if(selection.ids)query=query.in('id',selection.ids)
 if(selection.after)query=query.gt('id',selection.after)
 const {data,error}=await query
 if(error)throw new Error('Unable to read metadata. Retry this batch.')
 return (data??[] as unknown[]).map(row=>mapSource(row as unknown as Record<string,unknown>))
}
export async function readBulkStored(entity:MetadataEntity,ids:string[]):Promise<StoredTranslation[]>{
 if(!ids.length)return []
 const {data,error}=await serviceClient.from('content_localisations').select('entity_id,field,value,source_hash,status').eq('entity_type',entity).eq('locale','ar').in('entity_id',ids).limit(200)
 if(error)throw new Error('Unable to read existing translations. Retry this batch.')
 return data??[]
}
export async function processBulkFile(file:BulkFile,commit:boolean):Promise<BulkResult[]>{
 const ids=[...new Set(file.rows.map(row=>row.id))]
 if(!ids.length)return []
 const [sources,stored]=await Promise.all([readBulkSources(file.entity,{ids}),readBulkStored(file.entity,ids)])
 const results:BulkResult[]=file.rows.map(row=>({id:row.id,field:row.field,result:assessBulkRow(row,sources.find(source=>source.id===row.id),stored.find(item=>item.entity_id===row.id&&item.field===row.field),sourceFingerprint)}))
 if(!commit)return results
 const candidates=file.rows.filter((_,i)=>results[i].result==='ready')
 if(!candidates.length)return results
 // One bounded insert; concurrent manual changes win. Never upsert an update.
 const {data,error}=await serviceClient.from('content_localisations').upsert(candidates.map(row=>({entity_type:file.entity,entity_id:row.id,locale:'ar',field:row.field,value:row.arabic.trim(),status:'draft' as const,source_hash:row.sourceHash,reviewed_at:null})),{onConflict:'entity_type,entity_id,locale,field',ignoreDuplicates:true}).select('entity_id,field')
 // Re-export/preview makes partial or ambiguous network failures safe to retry.
 return results.map(row=>row.result!=='ready'?row:{...row,result:error?'failed — retry available':data?.some(item=>item.entity_id===row.id&&item.field===row.field)?'imported':'conflict'})
}

'use server'
import {z} from 'zod'
import {guardAdmin} from '@/app/actions/auth'
import {serviceClient} from '@/app/lib/supabase'
import {adminMetadataSource,metadataEntities,sourceFingerprint} from '@/app/lib/localisation/metadata.server'
import {updateTag} from 'next/cache'
const identity=z.object({entity:z.enum(metadataEntities),id:z.string().uuid()})
export async function fetchAdminLocalisations(input:unknown){
 await guardAdmin();const {entity,id}=identity.parse(input),source=await adminMetadataSource(entity,id)
 const {data,error}=await serviceClient.from('content_localisations').select('field,value,status,source_hash,updated_at,reviewed_at').eq('entity_type',entity).eq('entity_id',id).eq('locale','ar').limit(2)
 if(error)throw new Error('Unable to load translations.')
 return {source,sourceHashes:{title:sourceFingerprint(source.title),description:sourceFingerprint(source.description??'')},translations:data??[]}
}
export async function saveAdminLocalisation(input:unknown){
 await guardAdmin();const value=identity.extend({field:z.enum(['title','description']),arabic:z.string().trim().min(1).max(20000).refine(text=>/[\u0621-\u064a]/u.test(text),'Enter Arabic text.'),approve:z.boolean(),expectedSourceHash:z.string().regex(/^[a-f0-9]{64}$/),expectedUpdatedAt:z.string().nullable()}).parse(input)
 const source=await adminMetadataSource(value.entity,value.id),original=value.field==='title'?source.title:source.description
 if(!original)throw new Error('There is no source description to translate.')
 if(value.field==='title'&&source.titleAr?.trim())throw new Error('This content already has an authored Arabic title. Edit its existing Arabic title field instead.')
 if(sourceFingerprint(original)!==value.expectedSourceHash)throw new Error('The source changed. Reload before saving a translation.')
 const now=new Date().toISOString(),row={entity_type:value.entity,entity_id:value.id,locale:'ar',field:value.field,value:value.arabic,status:value.approve?'approved' as const:'draft' as const,source_hash:value.expectedSourceHash,reviewed_at:value.approve?now:null,updated_at:now}
 if(value.expectedUpdatedAt===null){const {error}=await serviceClient.from('content_localisations').insert(row);if(error)throw new Error('Translation exists or could not be saved. Reload and retry.')}
 else{const {data,error}=await serviceClient.from('content_localisations').update(row).eq('entity_type',value.entity).eq('entity_id',value.id).eq('locale','ar').eq('field',value.field).eq('updated_at',value.expectedUpdatedAt).select('field');if(error||!data?.length)throw new Error('Translation changed. Reload before saving.')}
 for(const tag of ['books-public','cartoons-public','homepage-featured'])updateTag(tag)
 return {ok:true as const}
}
export async function generateAdminLocalisations(input:unknown){
 await guardAdmin();const {entity,id}=identity.parse(input)
 await adminMetadataSource(entity,id)
 return {ok:false as const,error:'Automatic API translation is disabled to guarantee £0 provider cost. Use Admin → Translations to export/import metadata, or edit Arabic below.'}
}

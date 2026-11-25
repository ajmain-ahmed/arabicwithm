'use server'
import {z} from 'zod'
import {guardAdmin} from '@/app/actions/auth'
import {sourceFingerprint} from '@/app/lib/localisation/metadata.server'
import {bulkEntities,parseBulkFile,type BulkFile} from '@/app/lib/localisation/bulk'
import {processBulkFile,readBulkSources,readBulkStored} from '@/app/lib/localisation/bulk.server'

export async function exportAdminMetadata(input:unknown){
 await guardAdmin()
 const {entity,after}=z.object({entity:z.enum(bulkEntities),after:z.string().uuid().optional()}).strict().parse(input)
 const page=await readBulkSources(entity,{after}),sources=page.slice(0,50)
 const stored=await readBulkStored(entity,sources.map(row=>row.id))
 const rows:BulkFile['rows']=[];let protectedFields=0,conflicts=0
 for(const source of sources)for(const field of ['title','description'] as const){
  const original=field==='title'?source.title:source.description
  if(!original?.trim())continue
  if(field==='title'&&source.titleAr?.trim()){protectedFields++;continue}
  const existing=stored.find(row=>row.entity_id===source.id&&row.field===field)
  if(existing){if(existing.source_hash!==sourceFingerprint(original))conflicts++;else protectedFields++;continue}
  // Original Arabic already renders without another stored translation.
  if(/[\u0621-\u064a]/u.test(original)){protectedFields++;continue}
  rows.push({id:source.id,field,source:original,sourceHash:sourceFingerprint(original),arabic:''})
 }
 return {file:{format:'awm-metadata-ar-v1' as const,entity,rows},scanned:sources.length,protectedFields,conflicts,next:page.length>50?sources.at(-1)!.id:null}
}
export async function previewAdminMetadataImport(text:string){
 await guardAdmin();return processBulkFile(parseBulkFile(text),false)
}
export async function importAdminMetadataDrafts(text:string){
 await guardAdmin();return processBulkFile(parseBulkFile(text),true)
}

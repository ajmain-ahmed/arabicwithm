import {z} from 'zod'

export const bulkEntities=['book','chapter','show','episode','transcript','transcript_group'] as const
export const bulkRowSchema=z.object({
 id:z.string().uuid(),field:z.enum(['title','description']),
 source:z.string().min(1).max(20000),sourceHash:z.string().regex(/^[a-f0-9]{64}$/),
 arabic:z.string().max(20000),
}).strict()
export const bulkFileSchema=z.object({
 format:z.literal('awm-metadata-ar-v1'),entity:z.enum(bulkEntities),
 rows:z.array(bulkRowSchema).max(100),
}).strict().superRefine((file,ctx)=>{
 const seen=new Set<string>()
 for(const row of file.rows){const key=`${row.id}:${row.field}`;if(seen.has(key))ctx.addIssue({code:'custom',message:'Duplicate record/field in import.'});seen.add(key)}
})
export type BulkFile=z.infer<typeof bulkFileSchema>
export type BulkRow=z.infer<typeof bulkRowSchema>
export type BulkResult={id:string;field:'title'|'description';result:'pending'|'ready'|'imported'|'already present'|'conflict'|'source changed'|'authored Arabic preserved'|'invalid Arabic'|'failed — retry available'}
export interface BulkSource{id:string;title:string;description?:string|null;titleAr?:string}
export interface StoredTranslation{entity_id:string;field:string;value:string;source_hash:string;status:string}

/** The shared decision used by preview and commit. Never returns an update. */
export function assessBulkRow(row:BulkRow,source:BulkSource|undefined,stored:StoredTranslation|undefined,fingerprint:(text:string)=>string):BulkResult['result']{
 if(!source)return 'source changed'
 const original=row.field==='title'?source.title:source.description
 if(!original||original!==row.source||fingerprint(original)!==row.sourceHash)return 'source changed'
 if(row.field==='title'&&source.titleAr?.trim())return 'authored Arabic preserved'
 if(!row.arabic.trim())return 'pending'
 if(!/[\u0621-\u064a]/u.test(row.arabic)||/[<>\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(row.arabic))return 'invalid Arabic'
 if(stored)return stored.source_hash===row.sourceHash&&stored.value===row.arabic.trim()?'already present':'conflict'
 return 'ready'
}

export function parseBulkFile(text:string):BulkFile{
 if(new TextEncoder().encode(text).length>1_000_000)throw new Error('Import exceeds 1 MB. Split into batches of up to 100 fields.')
 return bulkFileSchema.parse(JSON.parse(text))
}

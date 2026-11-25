// @vitest-environment node
import {expect,it} from 'vitest'
import {createHash} from 'node:crypto'
import {assessBulkRow,parseBulkFile,type BulkRow} from './bulk'
const fingerprint=(text:string)=>createHash('sha256').update(text).digest('hex')
const source={id:'1522d368-7071-4d44-8ced-7a14d93b9395',title:'A Door That Remained Open'}
const row:BulkRow={id:source.id,field:'title',source:source.title,sourceHash:fingerprint(source.title),arabic:'باب ظل مفتوحًا'}
const file=(rows:unknown[])=>JSON.stringify({format:'awm-metadata-ar-v1',entity:'chapter',rows})
it('accepts a bounded metadata-only file, preserving source text and Arabic',()=>{
 expect(parseBulkFile(file([row])).rows[0]).toEqual(row)
 expect(assessBulkRow(row,source,undefined,fingerprint)).toBe('ready')
})
it('protects existing approved and manually edited drafts, even on retries',()=>{
 for(const status of ['draft','approved']){
  const stored={entity_id:source.id,field:'title',value:'ترجمة يدوية',source_hash:row.sourceHash,status}
  expect(assessBulkRow(row,source,stored,fingerprint)).toBe('conflict')
  expect(assessBulkRow(row,source,{...stored,value:row.arabic},fingerprint)).toBe('already present')
 }
 expect(assessBulkRow(row,{...source,titleAr:'عنوان مؤلف'},undefined,fingerprint)).toBe('authored Arabic preserved')
})
it('rejects stale originals, forged hashes, missing records and invalid Arabic',()=>{
 expect(assessBulkRow(row,{...source,title:'Changed'},undefined,fingerprint)).toBe('source changed')
 expect(assessBulkRow({...row,sourceHash:'a'.repeat(64)},source,undefined,fingerprint)).toBe('source changed')
 expect(assessBulkRow(row,undefined,undefined,fingerprint)).toBe('source changed')
 for(const arabic of ['English only','<script>عربي</script>','عربي\u0000'])expect(assessBulkRow({...row,arabic},source,undefined,fingerprint)).toBe('invalid Arabic')
 expect(assessBulkRow({...row,arabic:''},source,undefined,fingerprint)).toBe('pending')
})
it('rejects duplicate fields, oversized batches/files and unexpected content/schema fields',()=>{
 expect(()=>parseBulkFile(file([row,row]))).toThrow('Duplicate')
 expect(()=>parseBulkFile(file(Array(101).fill(row)))).toThrow()
 expect(()=>parseBulkFile(' '.repeat(1_000_001))).toThrow('1 MB')
 expect(()=>parseBulkFile(file([{...row,content:{tokens:[]}}]))).toThrow()
 expect(()=>parseBulkFile(file([{...row,field:'is_completed'}]))).toThrow()
})

// @vitest-environment node
import {beforeEach,expect,it,vi} from 'vitest'
const mocks=vi.hoisted(()=>({sourceRows:[] as unknown[],storedRows:[] as unknown[],insert:vi.fn()}))
vi.mock('@/app/lib/supabase',()=>({serviceClient:{from:(table:string)=>({
 select:()=>({order(){return this},limit(){return this},in(){return this},eq(){return this},then(resolve:(value:unknown)=>unknown){return Promise.resolve({data:table==='content_localisations'?mocks.storedRows:mocks.sourceRows,error:null}).then(resolve)}}),
 upsert:(...args:unknown[])=>{mocks.insert(...args);return {select:async()=>({data:[{entity_id:'1522d368-7071-4d44-8ced-7a14d93b9395',field:'title'}],error:null})}},
})}}))
import {processBulkFile} from './bulk.server'
import {sourceFingerprint} from './metadata.server'
import type {BulkFile} from './bulk'
const id='1522d368-7071-4d44-8ced-7a14d93b9395',title='A Door That Remained Open'
const file:BulkFile={format:'awm-metadata-ar-v1',entity:'chapter',rows:[{id,field:'title',source:title,sourceHash:sourceFingerprint(title),arabic:'باب ظل مفتوحًا'}]}
beforeEach(()=>{vi.clearAllMocks();mocks.sourceRows=[{id,title}];mocks.storedRows=[]})
it('previews without mutation then stores only new drafts with conflict-ignore semantics',async()=>{
 expect((await processBulkFile(file,false))[0].result).toBe('ready');expect(mocks.insert).not.toHaveBeenCalled()
 expect((await processBulkFile(file,true))[0].result).toBe('imported')
 expect(mocks.insert).toHaveBeenCalledWith([expect.objectContaining({status:'draft',reviewed_at:null,source_hash:file.rows[0].sourceHash})],expect.objectContaining({ignoreDuplicates:true}))
})
it('repeating an identical import is a no-op and different content never overwrites',async()=>{
 mocks.storedRows=[{entity_id:id,field:'title',value:file.rows[0].arabic,source_hash:file.rows[0].sourceHash,status:'approved'}]
 expect((await processBulkFile(file,true))[0].result).toBe('already present');expect(mocks.insert).not.toHaveBeenCalled()
 mocks.storedRows=[{entity_id:id,field:'title',value:'نص يدوي',source_hash:file.rows[0].sourceHash,status:'draft'}]
 expect((await processBulkFile(file,true))[0].result).toBe('conflict');expect(mocks.insert).not.toHaveBeenCalled()
})

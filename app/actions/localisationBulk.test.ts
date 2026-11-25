// @vitest-environment node
import {beforeEach,expect,it,vi} from 'vitest'
const mocks=vi.hoisted(()=>({guard:vi.fn(),process:vi.fn(),sources:vi.fn(),stored:vi.fn()}))
vi.mock('@/app/actions/auth',()=>({guardAdmin:mocks.guard}))
vi.mock('@/app/lib/localisation/bulk.server',()=>({processBulkFile:mocks.process,readBulkSources:mocks.sources,readBulkStored:mocks.stored}))
import {exportAdminMetadata,previewAdminMetadataImport,importAdminMetadataDrafts} from './localisationBulk'
import {sourceFingerprint} from '@/app/lib/localisation/metadata.server'
beforeEach(()=>{vi.clearAllMocks();mocks.guard.mockResolvedValue(undefined);mocks.sources.mockResolvedValue([]);mocks.stored.mockResolvedValue([])})
it('requires canonical Admin authorization before every export, preview and import',async()=>{
 mocks.guard.mockRejectedValue(new Error('Forbidden'))
 for(const call of [()=>exportAdminMetadata({entity:'book'}),()=>previewAdminMetadataImport('{}'),()=>importAdminMetadataDrafts('{}')])await expect(call()).rejects.toThrow('Forbidden')
 expect(mocks.sources).not.toHaveBeenCalled();expect(mocks.process).not.toHaveBeenCalled()
})
it('exports only missing fields with source hashes and preserves authored/stored metadata',async()=>{
 mocks.sources.mockResolvedValue([{id:'one',title:'Title',titleAr:'عنوان',description:'Description'},{id:'two',title:'Other'},{id:'three',title:'Missing'},{id:'four',title:'Changed'}])
 mocks.stored.mockResolvedValue([{entity_id:'two',field:'title',source_hash:sourceFingerprint('Other'),value:'آخر',status:'draft'},{entity_id:'four',field:'title',source_hash:sourceFingerprint('Old'),value:'قديم',status:'approved'}])
 const result=await exportAdminMetadata({entity:'book'})
 expect(result.file.rows.map(row=>[row.id,row.field])).toEqual([['one','description'],['three','title']]);expect(result.file.rows[1].sourceHash).toBe(sourceFingerprint('Missing'));expect(result.conflicts).toBe(1);expect(result.protectedFields).toBe(2)
})
it('uses a read-only preview and independently validates again when saving drafts',async()=>{
 const text=JSON.stringify({format:'awm-metadata-ar-v1',entity:'chapter',rows:[]})
 await previewAdminMetadataImport(text);await importAdminMetadataDrafts(text)
 expect(mocks.process.mock.calls.map(args=>args[1])).toEqual([false,true])
})

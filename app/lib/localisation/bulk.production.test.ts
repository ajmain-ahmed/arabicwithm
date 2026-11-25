// @vitest-environment node
import {expect,it} from 'vitest'
import {serviceClient} from '@/app/lib/supabase'
import {processBulkFile,readBulkStored,readBulkSources} from './bulk.server'
import {sourceFingerprint} from './metadata.server'
import type {BulkFile} from './bulk'

/** Explicit opt-in: writes one new metadata DRAFT only, never source content.
 * Normal test runs cannot touch production. Run with the existing server env. */
it.skipIf(process.env.AWM_METADATA_CONTROLLED_IMPORT!=='1')('stores a controlled free bulk translation and safely repeats it',async()=>{
 const {data:admins,error}=await serviceClient.from('account_roles').select('user_id').eq('role','admin').limit(1)
 expect(error).toBeNull();expect(admins?.length).toBe(1)
 const {data:role,error:roleError}=await serviceClient.rpc('account_role',{p_user_id:admins![0].user_id})
 expect(roleError).toBeNull();expect(role).toBe('admin')
 const id='1522d368-7071-4d44-8ced-7a14d93b9395',title='A Door That Remained Open',arabic='باب ظل مفتوحًا'
 const [source]=await readBulkSources('chapter',{ids:[id]})
 expect(source.title).toBe(title)
 const file:BulkFile={format:'awm-metadata-ar-v1',entity:'chapter',rows:[{id,field:'title',source:title,sourceHash:sourceFingerprint(title),arabic}]}
 const preview=await processBulkFile(file,false)
 expect(['ready','already present']).toContain(preview[0].result)
 const commit=await processBulkFile(file,true)
 expect(['imported','already present']).toContain(commit[0].result)
 const stored=await readBulkStored('chapter',[id])
 expect(stored).toEqual([expect.objectContaining({field:'title',value:arabic,status:'draft',source_hash:file.rows[0].sourceHash})])
 expect((await processBulkFile(file,true))[0].result).toBe('already present')
 expect((await readBulkSources('chapter',{ids:[id]}))[0].title).toBe(title)
},30000)

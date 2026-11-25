// @vitest-environment node
import {webcrypto} from 'node:crypto'
import {afterEach,expect,it,vi} from 'vitest'
import {handleMetadataTranslation} from '@/supabase/functions/transcript-library/metadata-translation'
afterEach(()=>vi.unstubAllGlobals())
const request=(body:unknown,token='server-only')=>new Request('https://example.test/metadata-localisation',{method:'POST',headers:{Authorization:'Bearer '+token},body:JSON.stringify(body)})
it('rejects untrusted callers before doing any work',async()=>{
 vi.stubGlobal('crypto',webcrypto);const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher)
 expect((await handleMetadataTranslation(request({},'wrong'),{serviceKey:'server-only'})).status).toBe(403)
 expect(fetcher).not.toHaveBeenCalled()
})
it('all health, controlled-probe and old generation requests refuse external providers',async()=>{
 vi.stubGlobal('crypto',webcrypto);const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher)
 for(const body of [{task:'metadata-provider-status'},{task:'metadata-provider-check'},{actor:'admin',entity:'book',id:'source'}]){
  const response=await handleMetadataTranslation(request(body),{serviceKey:'server-only'})
  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({mode:'bulk-import-export',ready:false,automaticTranslation:false,paidFallback:false,providerRequests:0})
 }
 expect(fetcher).not.toHaveBeenCalled()
})
it('does not enable automatic generation in response to malicious quota/retry flags',async()=>{
 vi.stubGlobal('crypto',webcrypto);const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher)
 const response=await handleMetadataTranslation(request({task:'metadata-provider-check',retry:true,paidFallback:true,provider:'openai'}),{serviceKey:'server-only'})
 expect(await response.text()).not.toContain('server-only');expect(fetcher).not.toHaveBeenCalled()
})

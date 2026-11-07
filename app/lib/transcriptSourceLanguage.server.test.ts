// @vitest-environment node
import {beforeEach,expect,it,vi} from 'vitest'
const mocks=vi.hoisted(()=>({from:vi.fn(),select:vi.fn(),ids:vi.fn(),query:vi.fn()}))
vi.mock('server-only',()=>({}))
vi.mock('@/app/lib/supabase',()=>({serviceClient:{from:mocks.from}}))
import {transcriptSourceLanguages} from './transcriptSourceLanguage.server'
beforeEach(()=>{vi.resetAllMocks();mocks.from.mockReturnValue({select:mocks.select});mocks.select.mockReturnValue({in:mocks.ids});mocks.ids.mockReturnValue({abortSignal:mocks.query})})
it('projects metadata only, deduplicates IDs and shares the supplied deadline',async()=>{
 const signal=AbortSignal.timeout(1000);mocks.query.mockResolvedValue({data:[{id:'1',source_language:'en'},{id:'2',source_language:null},{id:'3',source_language:'unknown'}],error:null})
 expect(await transcriptSourceLanguages(['1','1','2','3'],signal)).toEqual(new Map([['1','en'],['2','ar'],['3','ar']]))
 expect(mocks.select).toHaveBeenCalledWith('id,source_language:raw_transcript->>source_language');expect(mocks.ids).toHaveBeenCalledWith('id',['1','2','3']);expect(mocks.query).toHaveBeenCalledWith(signal)
})
it('does no request for an empty batch',async()=>{expect(await transcriptSourceLanguages([])).toEqual(new Map());expect(mocks.from).not.toHaveBeenCalled()})
it('fails explicitly rather than showing an English source in the wrong mode',async()=>{mocks.query.mockResolvedValue({error:{message:'private detail'}});await expect(transcriptSourceLanguages(['1'])).rejects.toThrow('Unable to load original audio language metadata.')})

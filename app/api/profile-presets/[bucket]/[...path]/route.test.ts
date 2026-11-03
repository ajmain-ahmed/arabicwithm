// @vitest-environment node
import {beforeEach,expect,it,vi} from 'vitest'
const mocks=vi.hoisted(()=>({info:vi.fn(),download:vi.fn(),from:vi.fn()}))
vi.mock('server-only',()=>({}))
vi.mock('@/app/lib/supabase',()=>({serviceClient:{storage:{from:mocks.from}}}))
import {GET} from './route'
beforeEach(()=>{vi.resetAllMocks();mocks.from.mockReturnValue({info:mocks.info,download:mocks.download});mocks.info.mockResolvedValue({data:{id:'one',size:3,contentType:'image/png'},error:null});mocks.download.mockResolvedValue({data:new Blob(['png'],{type:'image/png'}),error:null})})
it('serves only validated image bytes from a curated private bucket',async()=>{
 const response=await GET(new Request('https://example.test'),{params:Promise.resolve({bucket:'profile-pictures',path:['birds','one.png']})})
 expect(response.status).toBe(200);expect(response.headers.get('content-type')).toBe('image/png');expect(response.headers.get('x-content-type-options')).toBe('nosniff')
 expect(mocks.from).toHaveBeenCalledWith('profile-pictures');expect(mocks.download).toHaveBeenCalledWith('birds/one.png')
})
it.each([['profile-media',['private.png']],['profile-pictures',['..','private.png']],['profile-pictures',['hidden%2fprivate.png']],['profile-pictures',['folder/file.png']],['profile-pictures',['one.svg']]])('rejects invalid bucket/path before elevated reads: %s',async(bucket,path)=>{
 const response=await GET(new Request('https://example.test'),{params:Promise.resolve({bucket:bucket as string,path:path as string[]})})
 expect(response.status).toBe(404);expect(mocks.download).not.toHaveBeenCalled();expect(mocks.info).not.toHaveBeenCalled()
})
it('does not download a missing or unsupported object',async()=>{
 mocks.info.mockResolvedValue({data:null,error:{message:'private failure'}})
 const response=await GET(new Request('https://example.test'),{params:Promise.resolve({bucket:'profile-banners',path:['one.png']})})
 expect(response.status).toBe(404);expect(await response.text()).toBe('');expect(mocks.download).not.toHaveBeenCalled()
})

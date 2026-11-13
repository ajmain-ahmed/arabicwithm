// @vitest-environment node
import {beforeEach,expect,it,vi} from 'vitest'
const mocks=vi.hoisted(()=>({guard:vi.fn(),upload:vi.fn(),from:vi.fn()}))
vi.mock('@/app/actions/auth',()=>({guardAdmin:mocks.guard}))
vi.mock('@/app/actions/audiobooks',()=>({saveChapterAudioForAdmin:vi.fn(),fetchChapterAudioForAdmin:vi.fn()}))
vi.mock('next/navigation',()=>({unstable_rethrow:vi.fn()}))
vi.mock('@/app/lib/supabase',()=>({serviceClient:{storage:{from:mocks.from}}}))
vi.mock('@/app/lib/imageVariants',()=>{throw new Error('Native image processing is unavailable in a Worker')})
import {uploadCoverImage} from './storage'
const bytes=Buffer.from('UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA','base64')
function form(path='books/book-id.webp'){
 const data=new FormData();data.set('bucket','covers');data.set('path',path)
 for(const key of ['file','variant640','variant1080'])data.set(key,new Blob([bytes],{type:'image/webp'}),key+'.webp')
 return data
}
beforeEach(()=>{vi.clearAllMocks();mocks.guard.mockResolvedValue(undefined);mocks.upload.mockResolvedValue({error:null,data:{}});mocks.from.mockImplementation(()=>({upload:mocks.upload,getPublicUrl:(path:string)=>({data:{publicUrl:`https://project.supabase.co/storage/v1/object/public/covers/${path}`}})}))})
it('stores an immutable original and both variants without importing native processing',async()=>{
 const result=await uploadCoverImage(form());expect(result).toEqual({ok:true,data:expect.stringMatching(/books\/book-id--[a-f0-9-]+\.webp$/)})
 const paths=mocks.upload.mock.calls.map(call=>call[0]);expect(paths).toHaveLength(3);expect(paths[2]).toMatch(/^books\/book-id--/)
 for(const call of mocks.upload.mock.calls)expect(call[2]).toMatchObject({upsert:false,contentType:'image/webp'})
 expect(paths).not.toContain('books/book-id.webp')
})
it('never overwrites a previous cover when variants fail and returns a safe production message',async()=>{
 const log=vi.spyOn(console,'error').mockImplementation(()=>{});mocks.upload.mockResolvedValueOnce({error:{message:'PRIVATE_STORAGE_DIAGNOSTIC'}})
 expect(await uploadCoverImage(form())).toEqual({ok:false,error:"We couldn't upload this cover. Please try again."})
 expect(mocks.upload).toHaveBeenCalledOnce();expect(mocks.upload.mock.calls[0][0]).toMatch(/^variants\/books\/book-id--/);log.mockRestore()
})
it('uses distinct paths for repeat selections with identical filenames',async()=>{
 await uploadCoverImage(form());await uploadCoverImage(form());expect(mocks.upload.mock.calls[2][0]).not.toBe(mocks.upload.mock.calls[5][0])
})
it('rejects missing or invalid preview data before writing anything',async()=>{
 const data=form();data.delete('variant640');expect(await uploadCoverImage(data)).toMatchObject({ok:false});expect(mocks.upload).not.toHaveBeenCalled()
})
it.each(['editor','user','guest'])('preserves Admin-only upload authorization for %s',async role=>{
 mocks.guard.mockRejectedValue(new Error(`Forbidden: ${role}`));await expect(uploadCoverImage(form())).rejects.toThrow('Forbidden');expect(mocks.from).not.toHaveBeenCalled()
})
it.each(['books/../escape.webp','books/a/b.webp','private/book.webp'])('rejects unsafe paths %s',async path=>{
 await expect(uploadCoverImage(form(path))).rejects.toThrow('Cover path');expect(mocks.upload).not.toHaveBeenCalled()
})

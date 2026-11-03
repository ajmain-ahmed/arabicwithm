// @vitest-environment node
import {beforeEach,expect,it,vi} from 'vitest'
const mocks=vi.hoisted(()=>({list:vi.fn(),info:vi.fn(),from:vi.fn()}))
vi.mock('server-only',()=>({}))
vi.mock('@/app/lib/supabase',()=>({serviceClient:{storage:{from:mocks.from}}}))
import {readProfilePresets,verifyProfilePreset} from './profilePresetStorage'
const object=(name:string)=>({id:name,name,metadata:{size:100,mimetype:'image/avif'}})
beforeEach(()=>{vi.resetAllMocks();mocks.from.mockReturnValue({list:mocks.list,info:mocks.info})})
it('paginates, traverses folders and ignores invalid/non-image objects',async()=>{
 mocks.list.mockImplementation(async(prefix:string,{offset}:{offset:number})=>({error:null,data:prefix==='birds'?[object('owl.avif')]:offset===0?[{name:'birds',id:null,metadata:null},...Array.from({length:99},(_,i)=>object(`${i}.avif`))]:[{name:'bad.svg',id:'bad',metadata:{mimetype:'image/svg+xml',size:100}},{name:'missing.avif',id:null,metadata:{mimetype:'image/avif',size:100}},object('last.avif')]}))
 const result=await readProfilePresets('profile-pictures')
 expect(result).toHaveLength(101);expect(result.some(p=>p.ref==='profile-pictures/birds/owl.avif')).toBe(true)
 expect(result.every(p=>p.url.startsWith('/api/profile-presets/profile-pictures/'))).toBe(true)
 expect(mocks.list).toHaveBeenCalledWith('',expect.objectContaining({offset:100}))
})
it('validates exact bucket, stored object presence and MIME before accepting a selection',async()=>{
 mocks.info.mockResolvedValue({data:{id:'one',size:100,contentType:'image/avif'},error:null})
 await expect(verifyProfilePreset('profile-pictures/one.avif','profile-pictures')).resolves.toMatchObject({url:'/api/profile-presets/profile-pictures/one.avif'})
 await expect(verifyProfilePreset('profile-banners/one.avif','profile-pictures')).rejects.toThrow('Choose')
 mocks.info.mockResolvedValue({data:null,error:{message:'Missing private object'}})
 await expect(verifyProfilePreset('profile-pictures/gone.avif')).rejects.toThrow('unavailable')
 mocks.info.mockResolvedValue({data:{id:'one',size:100,contentType:'image/svg+xml'},error:null})
 await expect(verifyProfilePreset('profile-pictures/one.avif')).rejects.toThrow('unavailable')
})
it('returns a safe listing error without leaking Storage failures',async()=>{
 mocks.list.mockResolvedValue({data:null,error:{message:'secret backend error'}})
 await expect(readProfilePresets('profile-banners')).rejects.toThrow('could not be loaded')
})

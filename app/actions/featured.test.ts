// @vitest-environment node
import {beforeEach,expect,it,vi} from 'vitest'
const state=vi.hoisted(()=>({guard:vi.fn(),upload:vi.fn(),remove:vi.fn(),upsert:vi.fn(),clear:vi.fn(),tag:vi.fn(),path:vi.fn(),files:[] as {id:string;name:string;updated_at:string}[],shows:[] as {id:string;slug:string;title:string}[],configs:[] as {show_id:string;storage_path:string;position_x:number;position_y:number;updated_at:string}[]}))
vi.mock('server-only',()=>({}))
vi.mock('@/app/actions/auth',()=>({guardAdmin:state.guard}))
vi.mock('next/cache',()=>({updateTag:state.tag,revalidatePath:state.path}))
vi.mock('@/app/lib/supabase',()=>({serviceClient:{
 storage:{from:()=>({list:async()=>({data:state.files,error:null}),getPublicUrl:(path:string)=>({data:{publicUrl:'https://storage.test/'+path}}),upload:state.upload,remove:state.remove})},
 from:(table:string)=>({select:()=>({order:async()=>({data:state.shows}),then:(resolve:(result:unknown)=>unknown)=>Promise.resolve({data:table==='shows'?state.shows:state.configs,error:null}).then(resolve)}),upsert:state.upsert,delete:()=>({eq:state.clear})})
}}))
import {fetchFeaturedForAdmin,saveFeaturedForAdmin,deleteFeaturedForAdmin} from './featured'
const form=()=>{const data=new FormData();data.set('showId','s');data.set('name','ARC.webp');data.set('x','45');data.set('y','22');return data}
beforeEach(()=>{
 vi.clearAllMocks();state.guard.mockResolvedValue(undefined);state.upload.mockResolvedValue({error:null});state.remove.mockResolvedValue({error:null});state.upsert.mockResolvedValue({error:null});state.clear.mockResolvedValue({error:null})
 state.shows=[{id:'s',slug:'ARC',title:'Arcane'}];state.files=[{id:'f',name:'ARC.webp',updated_at:'2026-01-01'},{id:'o',name:'ORPHAN.png',updated_at:'2026-01-01'}];state.configs=[]
})
it('requires Admin for listing, saving and deleting before Storage access',async()=>{
 state.guard.mockRejectedValue(new Error('Forbidden'))
 await expect(fetchFeaturedForAdmin()).rejects.toThrow('Forbidden');await expect(saveFeaturedForAdmin(form())).rejects.toThrow('Forbidden');await expect(deleteFeaturedForAdmin('ARC.webp')).rejects.toThrow('Forbidden')
 expect(state.upload).not.toHaveBeenCalled();expect(state.remove).not.toHaveBeenCalled();expect(state.upsert).not.toHaveBeenCalled()
})
it('discovers old files at centre and identifies orphaned images',async()=>{
 const data=await fetchFeaturedForAdmin();expect(data.assets[0]).toMatchObject({show:{title:'Arcane'},position:{x:50,y:50},status:'Featured image'});expect(data.assets[1]).toMatchObject({show:null,status:'No matching show'})
})
it('saves a focal position without modifying source bytes and expires the Homepage cache',async()=>{
 await saveFeaturedForAdmin(form());expect(state.upsert).toHaveBeenCalledWith(expect.objectContaining({show_id:'s',storage_path:'featured/ARC.webp',position_x:45,position_y:22}),{onConflict:'show_id'});expect(state.upload).not.toHaveBeenCalled();expect(state.tag).toHaveBeenCalledWith('homepage-featured')
})
it('rejects invalid coordinates, traversal, mismatched assets and slug collisions',async()=>{
 const bad=form();bad.set('x','NaN');await expect(saveFeaturedForAdmin(bad)).rejects.toThrow('Position')
 await expect(deleteFeaturedForAdmin('../ARC.webp')).rejects.toThrow('Invalid')
 const wrong=form();wrong.set('name','ORPHAN.png');await expect(saveFeaturedForAdmin(wrong)).rejects.toThrow('no longer exists')
 state.shows.push({id:'other',slug:'arc',title:'Other'});await expect(saveFeaturedForAdmin(form())).rejects.toThrow('collision');expect(state.upsert).not.toHaveBeenCalled()
})
it('requires explicit replacement and validates image bytes before writing',async()=>{
 const data=form();data.set('file',new Blob(['invalid'],{type:'image/png'}),'test.png')
 await expect(saveFeaturedForAdmin(data)).rejects.toThrow('Replace');data.set('replace','true');await expect(saveFeaturedForAdmin(data)).rejects.toThrow('Use a WebP');expect(state.upload).not.toHaveBeenCalled()
})
it('replaces canonical slug path only on save and removes obsolete formats after config is saved',async()=>{
 const data=form();data.set('replace','true');data.set('file',new Blob([new Uint8Array([137,80,78,71,13,10,26,10,0])]),'new.png')
 await saveFeaturedForAdmin(data);expect(state.upload).toHaveBeenCalledWith('featured/ARC.png',expect.any(Blob),expect.objectContaining({upsert:true,contentType:'image/png'}));expect(state.remove).toHaveBeenCalledWith(['featured/ARC.webp']);expect(state.upsert.mock.invocationCallOrder[0]).toBeLessThan(state.remove.mock.invocationCallOrder[0])
})
it('deletes only the selected asset and its configuration, including orphans',async()=>{
 await deleteFeaturedForAdmin('ORPHAN.png');expect(state.remove).toHaveBeenCalledWith(['featured/ORPHAN.png']);expect(state.clear).toHaveBeenCalledWith('storage_path','featured/ORPHAN.png');expect(state.upsert).not.toHaveBeenCalled()
})

it('uploads artwork for a Show with no existing image and uses its canonical slug',async()=>{
 state.files=state.files.filter(file=>file.name!=='ARC.webp')
 const data=form();data.set('file',new Blob([new Uint8Array([255,216,255,0])]),'photo.jpeg')
 await saveFeaturedForAdmin(data);expect(state.upload).toHaveBeenCalledWith('featured/ARC.jpg',expect.any(Blob),expect.objectContaining({contentType:'image/jpeg'}));expect(state.remove).not.toHaveBeenCalled()
})

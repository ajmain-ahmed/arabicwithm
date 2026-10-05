// @vitest-environment node
import {File as NodeFile} from 'node:buffer'
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest'
const mocks=vi.hoisted(()=>({guard:vi.fn(),entitlement:vi.fn(),user:vi.fn(),from:vi.fn(),list:vi.fn(),remove:vi.fn(),sign:vi.fn(),upload:vi.fn(),revalidate:vi.fn(),bucket:vi.fn(),verify:vi.fn()}))
vi.mock('@/app/actions/auth',()=>({guardAdmin:mocks.guard,getAuthenticatedUserId:mocks.user}))
vi.mock('@/app/actions/entitlements',()=>({requireEntitlement:mocks.entitlement}))
vi.mock('@/app/lib/supabase',()=>({serviceClient:{from:mocks.from,storage:{getBucket:mocks.bucket,from:()=>({list:mocks.list,remove:mocks.remove,createSignedUrl:mocks.sign,upload:mocks.upload})}}}))
vi.mock('@/app/lib/verifyAudioObject',()=>({verifyAudioObject:mocks.verify}))
vi.mock('next/cache',()=>({revalidatePath:mocks.revalidate}))
import {uploadAudiobookAudio,removeAudiobookAudio} from './storage'
import {deleteChapterAudioForAdmin,fetchChapterAudioForAdmin,fetchPublishedChapterAudio,requestChapterAudio,requestChapterAudioResult,saveAudioProgress,saveChapterAudioForAdmin} from './audiobooks'
const chapter='11111111-1111-4111-8111-111111111111'
let row:Record<string,unknown>|null,events:string[]
beforeEach(()=>{
 vi.resetAllMocks();vi.stubEnv('SUPABASE_URL','https://example.supabase.co');mocks.verify.mockResolvedValue(undefined);mocks.bucket.mockResolvedValue({data:{public:false},error:null});events=[];row=null;mocks.guard.mockResolvedValue(undefined);mocks.entitlement.mockResolvedValue(undefined);mocks.user.mockResolvedValue('listener');mocks.list.mockResolvedValue({data:[{name:'audio.mp3'}],error:null});mocks.remove.mockImplementation(async()=>{events.push('remove-file');return {error:null}});mocks.sign.mockResolvedValue({data:{signedUrl:'https://example.test/scoped-playback'},error:null})
 mocks.from.mockImplementation((table:string)=>{
  const value={then:(resolve:(value:unknown)=>unknown)=>Promise.resolve({data:table==='book_chapter_audio'?(row?[row]:[]):[],error:null}).then(resolve),select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),maybeSingle:vi.fn(async()=>({data:table==='book_chapter_audio'?row:table==='chapters'?{id:chapter,slug:'chapter',book_id:'book'}:table==='books'?{slug:'book'}:null,error:null})),
   upsert:vi.fn(async(data:Record<string,unknown>)=>{row={id:'audio',...data};events.push('persist-reference');return {error:null}}),
   delete:vi.fn(()=>{const builder={eq:vi.fn().mockReturnThis(),then:(resolve:(value:unknown)=>unknown)=>{row=null;events.push('remove-reference');return Promise.resolve({error:null}).then(resolve)}};return builder})}
  return value
 })
})
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs()})
describe('existing chapter audio persistence and permissions',()=>{
 it('denies audio mutations before touching storage or metadata',async()=>{mocks.guard.mockRejectedValue(new Error('Forbidden'));await expect(saveChapterAudioForAdmin({chapterId:chapter,sourceType:'supabase_storage',storagePath:chapter+'/audio.mp3',externalVideoId:null,durationSeconds:null,narrator:null,isPublished:true})).rejects.toThrow('Forbidden');expect(mocks.from).not.toHaveBeenCalled();expect(mocks.list).not.toHaveBeenCalled()})
 it('persists a stable private path and reloads it, not a signed URL',async()=>{await saveChapterAudioForAdmin({chapterId:chapter,sourceType:'supabase_storage',storagePath:chapter+'/audio.mp3',externalVideoId:null,durationSeconds:15,narrator:'Narrator',isPublished:true});const loaded=await fetchChapterAudioForAdmin(chapter);expect(loaded?.storagePath).toBe(chapter+'/audio.mp3');expect(loaded?.isPublished).toBe(true);expect(mocks.sign).not.toHaveBeenCalled()})
 it('accepts existing nested book objects and rejects inaccessible files before writing',async()=>{
  await saveChapterAudioForAdmin({chapterId:chapter,language:'ar',sourceType:'supabase_storage',storagePath:'audiobooks/arabic/book/unusual-file',isPublished:true})
  expect(row?.storage_path).toBe('arabic/book/unusual-file')
  mocks.verify.mockRejectedValueOnce(new Error('Audio file inaccessible'))
  await expect(saveChapterAudioForAdmin({chapterId:chapter,sourceType:'supabase_storage',storagePath:'arabic/book/missing',isPublished:true})).rejects.toThrow('inaccessible')
  expect(row?.storage_path).toBe('arabic/book/unusual-file')
 })
 it('removes only the persistent reference and preserves manually uploaded files',async()=>{row={chapter_id:chapter,source_type:'supabase_storage',storage_path:chapter+'/audio.mp3',is_published:true};await deleteChapterAudioForAdmin(chapter);expect(events).toEqual(['remove-reference']);expect(mocks.remove).not.toHaveBeenCalled();expect(await fetchPublishedChapterAudio(chapter)).toBeNull()})
 it('legacy uploader normalizes MIME and saves a unique replacement while preserving the old file',async()=>{
  vi.stubGlobal('File',NodeFile);mocks.upload.mockResolvedValue({error:null})
  row={chapter_id:chapter,language:'ar',source_type:'supabase_storage',storage_path:chapter+'/audio.mp3',is_published:true}
  const file=new NodeFile([new Uint8Array([0x49,0x44,0x33,4,0,0,0,0,0,0])],'chapter.mp3',{type:'audio/mp3'})
  const data={get:(key:string)=>key==='chapterId'?chapter:file} as unknown as FormData
  mocks.list.mockImplementation(async(_folder,options)=>({data:[{name:options.search}],error:null}))
  const path=await uploadAudiobookAudio(data)
  expect(path).toMatch(new RegExp('^'+chapter+'/ar/[a-f0-9-]{36}\\.mp3$'))
  expect(events).toEqual(['persist-reference'])
  expect(mocks.remove).not.toHaveBeenCalled()
  expect((await fetchChapterAudioForAdmin(chapter))?.storagePath).toBe(path)
  expect(mocks.upload.mock.calls[0][1].type).toBe('audio/mpeg')
  expect(mocks.upload.mock.calls[0][2].upsert).toBe(false)
 })
 it.each([null,false])('legacy upload preserves explicit false and defaults absent Arabic audio (%s)',async(published)=>{
  vi.stubGlobal('File',NodeFile);mocks.upload.mockResolvedValue({error:null})
  row=published===null?null:{chapter_id:chapter,language:'ar',source_type:'supabase_storage',storage_path:chapter+'/audio.mp3',is_published:published}
  const file=new NodeFile([new Uint8Array([0x49,0x44,0x33,4,0,0,0,0,0,0])],'chapter.mp3',{type:'audio/mpeg'})
  await uploadAudiobookAudio({get:(key:string)=>key==='chapterId'?chapter:file} as unknown as FormData)
  expect((await fetchChapterAudioForAdmin(chapter))?.isPublished).toBe(published??true)
 })
 it.each(['ar','en'] as const)('accepts omitted, blank, and supplied metadata for %s',async(language)=>{
  await saveChapterAudioForAdmin({chapterId:chapter,language,sourceType:'youtube',externalVideoId:'https://youtu.be/yFeE2MvsrJM',isPublished:false})
  expect(await fetchChapterAudioForAdmin(chapter,language)).toEqual(expect.objectContaining({externalVideoId:'yFeE2MvsrJM',narrator:null,durationSeconds:null}))
  await saveChapterAudioForAdmin({chapterId:chapter,language,sourceType:'youtube',externalVideoId:'https://www.youtube.com/watch?v=yFeE2MvsrJM',narrator:'  ',durationSeconds:null,isPublished:false})
  expect((await fetchChapterAudioForAdmin(chapter,language))?.narrator).toBeNull()
  await saveChapterAudioForAdmin({chapterId:chapter,language,sourceType:'youtube',externalVideoId:'yFeE2MvsrJM',narrator:' Narrator ',durationSeconds:120,isPublished:false})
  expect(await fetchChapterAudioForAdmin(chapter,language)).toEqual(expect.objectContaining({narrator:'Narrator',durationSeconds:120}))
 })
 it('leaves the previous audio intact on a database failure',async()=>{
  row={chapter_id:chapter,language:'ar',source_type:'supabase_storage',storage_path:chapter+'/audio.mp3',is_published:true}
  const original=mocks.from.getMockImplementation()!
  mocks.from.mockImplementation((table:string)=>{const query=original(table);if(table==='book_chapter_audio')query.upsert.mockResolvedValue({error:{message:'database unavailable'}});return query})
  await expect(saveChapterAudioForAdmin({chapterId:chapter,sourceType:'youtube',externalVideoId:'yFeE2MvsrJM',isPublished:false})).rejects.toThrow('database unavailable')
  expect(mocks.remove).not.toHaveBeenCalled()
  expect(row.storage_path).toBe(chapter+'/audio.mp3')
 })
 it('direct file deletion refuses a saved chapter reference',async()=>{row={chapter_id:chapter,source_type:'supabase_storage',storage_path:chapter+'/audio.mp3',is_published:true};await expect(removeAudiobookAudio(chapter+'/audio.mp3')).rejects.toThrow('reference');expect(mocks.remove).not.toHaveBeenCalled()})
 it('returns no player availability for chapters without audio',async()=>{expect(await fetchPublishedChapterAudio(chapter)).toBeNull()})
 it('requires audiobook entitlement before generating a playback URL',async()=>{mocks.entitlement.mockRejectedValue(new Error('AWM+ required'));await expect(requestChapterAudio(chapter)).rejects.toThrow('AWM+ required');expect(mocks.from).not.toHaveBeenCalled();expect(mocks.sign).not.toHaveBeenCalled()})
 it('does not confuse an English source with Arabic playback',async()=>{row={chapter_id:chapter,language:'en',source_type:'supabase_storage',storage_path:chapter+'/en/11111111-1111-4111-8111-111111111111.mp3',is_published:true};await expect(requestChapterAudio(chapter,'ar')).rejects.toThrow('not available');expect(mocks.sign).not.toHaveBeenCalled();expect(await requestChapterAudio(chapter,'en')).toEqual(expect.objectContaining({sourceType:'supabase_storage'}));expect(mocks.sign).toHaveBeenCalledWith(row.storage_path,7200)})
 it('normalizes signed URLs on save and resolves external URLs through the same player',async()=>{
  await saveChapterAudioForAdmin({chapterId:chapter,sourceType:'supabase_storage',storagePath:'https://example.supabase.co/storage/v1/object/sign/audiobooks/arabic/book/audio?token=temporary',isPublished:true})
  expect(row?.storage_path).toBe('arabic/book/audio');expect(row?.storage_bucket).toBe('audiobooks')
  await saveChapterAudioForAdmin({chapterId:chapter,language:'en',sourceType:'external_url',externalUrl:'https://audio.example.com/file.mp3',isPublished:true})
  expect(await requestChapterAudio(chapter,'en')).toEqual(expect.objectContaining({url:'https://audio.example.com/file.mp3',expiresIn:0}))
  expect(mocks.remove).not.toHaveBeenCalled()
 })

})

it.each(['AWM+ is required for this feature.','Sign in to continue.'])('returns an upgrade offering for expected restriction: %s',async(message)=>{
 mocks.entitlement.mockRejectedValue(new Error(message))
 expect(await requestChapterAudioResult(chapter,'en')).toEqual({status:'upgrade'})
 expect(mocks.sign).not.toHaveBeenCalled();expect(mocks.from).not.toHaveBeenCalled()
})
it('does not write the previous listener position to a newly signed-in account',async()=>{
 mocks.user.mockResolvedValue('new-listener')
 await saveAudioProgress(chapter,12,false,'en','old-listener')
 expect(mocks.from).not.toHaveBeenCalled()
})

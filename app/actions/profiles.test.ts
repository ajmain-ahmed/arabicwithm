// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
const mocks=vi.hoisted(()=>({identity:vi.fn(),from:vi.fn(),rpc:vi.fn(),revalidate:vi.fn(),info:vi.fn(),media:vi.fn()}))
vi.mock('server-only',()=>({}))
vi.mock('@/app/actions/auth',()=>({getAuthenticatedUserId:mocks.identity}))
vi.mock('@/app/lib/supabase',()=>({serviceClient:{from:mocks.from,storage:{from:()=>({info:mocks.info})}}}))
vi.mock('@/app/lib/supabase/server',()=>({getAuthClient:async()=>({rpc:mocks.rpc,auth:{updateUser:mocks.media}})}))
vi.mock('next/cache',()=>({revalidatePath:mocks.revalidate}))
vi.mock('@/app/actions/books',()=>({fetchBooksForPublic:vi.fn(),fetchChaptersForBookPublic:vi.fn()}))
vi.mock('@/app/lib/accountPremium',()=>({accountHasPremium:vi.fn()}))
vi.mock('@/app/lib/learningSnapshot',()=>({loadLearningSnapshot:vi.fn()}))
import { checkUsernameAvailability,updateProfile } from './profiles'
beforeEach(()=>{vi.resetAllMocks();mocks.identity.mockResolvedValue('owner');mocks.media.mockResolvedValue({error:null});mocks.info.mockResolvedValue({data:{id:'object',size:100,contentType:'image/avif'},error:null})})
it('checks the mobile handle column, normalizing whitespace and case',async()=>{
 const query={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),maybeSingle:vi.fn().mockResolvedValue({data:{user_id:'other'},error:null})}
 mocks.from.mockReturnValue(query)
 expect(await checkUsernameAvailability(' Learner_one ')).toBe(false)
 expect(mocks.from).toHaveBeenCalledWith('leaderboard_public_profiles');expect(query.eq).toHaveBeenCalledWith('handle','learner_one')
 query.maybeSingle.mockResolvedValueOnce({data:{user_id:'owner'},error:null})
 expect(await checkUsernameAvailability('learner_one')).toBe(true)
})
it('uses the authenticated existing handle RPC and rejects race-time duplicates',async()=>{
 mocks.rpc.mockResolvedValue({error:{message:'PUBLIC_ID_TAKEN'}})
 await expect(updateProfile({displayName:'Learner',username:' Learner_one ',isPublic:false,shareReading:false})).rejects.toThrow('already taken')
 expect(mocks.rpc).toHaveBeenCalledWith('set_public_handle',{p_handle:'learner_one'})
 expect(mocks.from).not.toHaveBeenCalled()
})
it('persists a normalized unique username and the existing profile preferences',async()=>{
 mocks.rpc.mockResolvedValue({data:'learner_one',error:null})
 const query={upsert:vi.fn().mockResolvedValue({error:null})};mocks.from.mockReturnValue(query)
 await updateProfile({displayName:' Learner ',username:' Learner_one ',isPublic:true,shareReading:false})
 expect(query.upsert).toHaveBeenCalledWith({user_id:'owner',display_name:'Learner',is_public:true,share_reading:false})
 expect(mocks.revalidate).toHaveBeenCalledWith('/profile')
})
it('requires sign-in before username lookup or mutation',async()=>{
 mocks.identity.mockResolvedValue(null)
 await expect(checkUsernameAvailability('learner')).rejects.toThrow('Sign in')
 await expect(updateProfile({displayName:'Learner',username:'learner',isPublic:false,shareReading:false})).rejects.toThrow('Sign in')
 expect(mocks.from).not.toHaveBeenCalled();expect(mocks.rpc).not.toHaveBeenCalled()
})
it('saves only validated presets to the existing metadata fields and targets the authenticated owner',async()=>{
 const query={upsert:vi.fn().mockResolvedValue({error:null})};mocks.from.mockReturnValue(query)
 await updateProfile({displayName:'Learner',isPublic:false,shareReading:false,avatarPreset:'profile-pictures/fox.avif',bannerPreset:'profile-banners/oasis.avif'})
 expect(query.upsert).toHaveBeenCalledWith(expect.objectContaining({user_id:'owner'}))
 expect(mocks.media).toHaveBeenCalledWith({data:{avatar_url:'/api/profile-presets/profile-pictures/fox.avif',avatar_crop:{x:50,y:50,zoom:1},banner_url:'/api/profile-presets/profile-banners/oasis.avif'}})
})
it.each(['https://example.com/arbitrary.png','profile-media/other/private.avif','profile-banners/oasis.avif','profile-pictures/../secret.avif'])('rejects invalid avatar reference before any mutation: %s',async(ref)=>{
 await expect(updateProfile({displayName:'Learner',isPublic:false,shareReading:false,avatarPreset:ref})).rejects.toThrow()
 expect(mocks.from).not.toHaveBeenCalled();expect(mocks.rpc).not.toHaveBeenCalled();expect(mocks.media).not.toHaveBeenCalled()
})
it('leaves existing images untouched when no new presets are submitted',async()=>{
 mocks.from.mockReturnValue({upsert:vi.fn().mockResolvedValue({error:null})})
 await updateProfile({displayName:'Learner',isPublic:false,shareReading:false})
 expect(mocks.info).not.toHaveBeenCalled();expect(mocks.media).not.toHaveBeenCalled()
})

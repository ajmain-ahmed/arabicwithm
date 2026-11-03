// @vitest-environment node
import {beforeEach,expect,it,vi} from 'vitest'
const mocks=vi.hoisted(()=>({user:vi.fn(),read:vi.fn()}))
vi.mock('@/app/actions/auth',()=>({getAuthenticatedUserId:mocks.user}))
vi.mock('@/app/lib/profilePresetStorage',()=>({readProfilePresets:mocks.read}))
import {listProfilePresets} from './profilePresets'
beforeEach(()=>{vi.resetAllMocks();mocks.user.mockResolvedValue('owner');mocks.read.mockResolvedValue([])})
it('requires authentication and an allowed collection before an elevated listing',async()=>{
 mocks.user.mockResolvedValue(null);await expect(listProfilePresets('profile-pictures')).rejects.toThrow('Sign in');expect(mocks.read).not.toHaveBeenCalled()
 mocks.user.mockResolvedValue('owner');await expect(listProfilePresets('profile-media' as never)).rejects.toThrow('Invalid');expect(mocks.read).not.toHaveBeenCalled()
})
it('reads the current Storage collection on each refresh without a deployed filename list',async()=>{
 await expect(listProfilePresets('profile-banners')).resolves.toEqual([])
 mocks.read.mockResolvedValue([{ref:'profile-banners/new.png'}]);await expect(listProfilePresets('profile-banners')).resolves.toHaveLength(1)
 expect(mocks.read).toHaveBeenCalledTimes(2)
})
it('does not expose raw Storage errors',async()=>{
 mocks.read.mockRejectedValue(new Error('Secret service response'))
 await expect(listProfilePresets('profile-pictures')).rejects.toThrow('Profile presets could not be loaded. Please try again.')
})

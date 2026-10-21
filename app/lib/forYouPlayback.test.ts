import {beforeEach,expect,it,vi} from 'vitest'
beforeEach(()=>{localStorage.clear();vi.resetModules()})
it('remembers permanent source failures after a new browser session module loads',async()=>{
 let playback=await import('./forYouPlayback')
 playback.excludeForYouSource('blocked-video',150)
 vi.resetModules();playback=await import('./forYouPlayback')
 expect(playback.blockedForYouSources().has('blocked-video')).toBe(true)
})
it('keeps infrastructure errors session-only and tolerates malformed storage',async()=>{
 const playback=await import('./forYouPlayback')
 localStorage.setItem('awm-for-you-unplayable-v1','broken')
 playback.excludeForYouSource('temporary',153)
 expect(playback.blockedForYouSources().has('temporary')).toBe(true)
 vi.resetModules()
 expect((await import('./forYouPlayback')).blockedForYouSources().has('temporary')).toBe(false)
})

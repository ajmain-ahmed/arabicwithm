// @vitest-environment node
import {beforeEach,afterEach,expect,it,vi} from 'vitest'
vi.mock('server-only',()=>({}))
let helpers:typeof import('./youtubeVideoDuration')
const fetcher=vi.fn()
const id='Dgj9fQYbCZY'
const page=(details:Record<string,unknown>={})=>`<script>var ytInitialPlayerResponse = ${JSON.stringify({playabilityStatus:{status:'OK'},videoDetails:{videoId:id,lengthSeconds:'657',isLiveContent:false,...details}})};</script>`
beforeEach(async()=>{vi.resetModules();fetcher.mockReset();vi.stubGlobal('fetch',fetcher);vi.stubEnv('YOUTUBE_DATA_API_KEY','');helpers=await import('./youtubeVideoDuration')})
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs()})
it('retrieves actual public player duration without a transcription or API key',async()=>{
 fetcher.mockResolvedValue(new Response(page()))
 expect(await helpers.getYouTubeVideoDuration(id)).toBe(657)
 expect(fetcher.mock.calls[0][0]).toBe(`https://www.youtube.com/watch?v=${id}&hl=en`)
 expect(fetcher.mock.calls[0][1]).toMatchObject({redirect:'error',cache:'no-store'})
 expect(await helpers.getYouTubeVideoDuration(id)).toBe(657);expect(fetcher).toHaveBeenCalledTimes(1)
})
it('uses the official contentDetails duration when a server API key is configured',async()=>{
 vi.stubEnv('YOUTUBE_DATA_API_KEY','fixture-key')
 fetcher.mockResolvedValue(new Response(JSON.stringify({items:[{id,contentDetails:{duration:'PT1H3M22S'}}]})))
 expect(await helpers.getYouTubeVideoDuration(id)).toBe(3802)
 expect(String(fetcher.mock.calls[0][0])).toContain('https://www.googleapis.com/youtube/v3/videos?')
 expect(fetcher).toHaveBeenCalledTimes(1)
})
it('falls back to public metadata after an API error',async()=>{
 vi.stubEnv('YOUTUBE_DATA_API_KEY','fixture-key')
 fetcher.mockResolvedValueOnce(new Response('',{status:403})).mockResolvedValueOnce(new Response(page()))
 expect(await helpers.getYouTubeVideoDuration(id)).toBe(657)
})
it('fails closed for inaccessible, mismatched, live or malformed metadata',async()=>{
 for(const details of [{videoId:'OTHER000001'},{isLiveContent:true},{lengthSeconds:'0'},{lengthSeconds:'NaN'},{lengthSeconds:'43201'}])expect(helpers.youtubeWatchDuration(page(details),id)).toBeNull()
 expect(helpers.youtubeWatchDuration(page().replace('"OK"','"ERROR"'),id)).toBeNull()
 fetcher.mockRejectedValue(new Error('Network unavailable'))
 expect(await helpers.getYouTubeVideoDuration(id)).toBeNull()
})
it('does not guess duration from unrelated HTML and handles quoted braces',()=>{
 expect(helpers.youtubeWatchDuration('lengthSeconds: 657',id)).toBeNull()
 expect(helpers.youtubeWatchDuration(page({title:'A } brace and "quote"'}),id)).toBe(657)
})
it.each([['PT10M57S',657],['PT1H3M22S',3802],['PT0.123S',0.123],['PT',null],['PT0S',null],['P1D',null]])('parses official duration %s',(value,expected)=>{expect(helpers.youtubeIsoDuration(value)).toBe(expected)})
it('rejects an invalid ID before making any network request',async()=>{await expect(helpers.getYouTubeVideoDuration('../bad')).rejects.toThrow('Invalid YouTube');expect(fetcher).not.toHaveBeenCalled()})

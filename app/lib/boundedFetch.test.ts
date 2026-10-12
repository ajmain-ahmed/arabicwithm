// @vitest-environment node
import {afterEach,expect,it,vi} from 'vitest'
import {boundedFetch,withDataDeadline} from './boundedFetch'
afterEach(()=>vi.unstubAllGlobals())
it('retries one transient read but never a write',async()=>{const fetch=vi.fn().mockResolvedValueOnce(new Response(null,{status:522})).mockResolvedValueOnce(new Response('ok'));vi.stubGlobal('fetch',fetch);expect((await boundedFetch('https://example.com')).status).toBe(200);expect(fetch).toHaveBeenCalledTimes(2);fetch.mockReset().mockResolvedValue(new Response(null,{status:522}));expect((await boundedFetch('https://example.com',{method:'POST'})).status).toBe(522);expect(fetch).toHaveBeenCalledTimes(1)})
it('propagates the route-wide deadline to the upstream request',async()=>{vi.stubGlobal('fetch',(_input:unknown,init:RequestInit)=>new Promise((_resolve,reject)=>init.signal!.addEventListener('abort',()=>reject(init.signal!.reason))));await expect(withDataDeadline(20,()=>boundedFetch('https://example.com'))).rejects.toThrow();})

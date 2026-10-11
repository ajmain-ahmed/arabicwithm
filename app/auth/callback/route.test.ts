import {beforeEach,expect,it,vi} from 'vitest'
import {NextRequest} from 'next/server'
vi.mock('@supabase/ssr',()=>({createServerClient:()=>({auth:{exchangeCodeForSession:vi.fn().mockResolvedValue({error:null})}})}))
import {GET} from './route'
beforeEach(()=>{vi.stubEnv('SUPABASE_URL','https://fixture.supabase.co');vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','fixture-publishable')})
it.each(['/memory','/memory?scope=saved','/grammar'])('keeps a successful OAuth sign-in on %s',async destination=>{const response=await GET(new NextRequest(`https://example.com/auth/callback?code=fixture&next=${encodeURIComponent(destination)}`));expect(response.headers.get('location')).toBe(`https://example.com${destination}`)})
it.each(['https://elsewhere.example/memory','//elsewhere.example/memory','/admin/users'])('rejects an unauthorised OAuth return destination: %s',async destination=>{const response=await GET(new NextRequest(`https://example.com/auth/callback?code=fixture&next=${encodeURIComponent(destination)}`));expect(response.headers.get('location')).toBe('https://example.com/')})

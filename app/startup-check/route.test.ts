// @vitest-environment node
import {expect,it} from 'vitest'
import {GET} from './route'
it('serves an independent diagnostic without React, account data or a cached response',async()=>{
 const response=GET(),html=await response.text()
 expect(response.headers.get('cache-control')).toContain('no-store')
 expect(response.headers.get('content-type')).toContain('text/html')
 expect(html).toContain('diagnostic v2');expect(html).toContain('Copy diagnostic report')
 expect(html).not.toContain('service_role');expect(html).not.toContain('document.cookie')
 expect(html).not.toContain('unregister(');expect(html).not.toContain('localStorage.clear')
})
it('provides a plain response and only safe metadata even with a malformed session',async()=>{
 const response=GET(new Request('https://www.arabicwithm.com/startup-check?plain=1',{headers:{cookie:'sb-project-auth-token=private-secret; personal=hidden'}}))
 const body=await response.text()
 expect(response.headers.get('content-type')).toContain('text/plain')
 expect(body).toContain('Document loaded: YES');expect(body).toContain('parseSuccess')
 expect(body).not.toContain('private-secret');expect(body).not.toContain('hidden');expect(body).not.toContain('<script')
})

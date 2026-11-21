// @vitest-environment node
import {expect,it} from 'vitest'
import {GET} from './route'
it('serves an independent diagnostic without React, account data or a cached response',async()=>{
 const response=GET(),html=await response.text()
 expect(response.headers.get('cache-control')).toBe('no-store')
 expect(response.headers.get('content-type')).toContain('text/html')
 expect(html).toContain('diagnostic v1');expect(html).toContain('Inline JavaScript: running')
 expect(html).not.toContain('service_role');expect(html).not.toContain('document.cookie')
 expect(html).not.toContain('unregister(');expect(html).not.toContain('localStorage.clear')
})

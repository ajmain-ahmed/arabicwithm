// @vitest-environment node
import {expect,it} from 'vitest'
import {matchesURL} from './runtimeDiagnostics'
it('recognises only the same resource, with Next cache hash differences allowed',()=>{
 expect(matchesURL('/127.0.0.1:3068/grammar/context?_rsc=old due to access control checks.','http://127.0.0.1:3068/grammar/context?_rsc=new')).toBe(true)
 expect(matchesURL('/127.0.0.1:3068/grammar/context/A1 due to access control checks.','http://127.0.0.1:3068/grammar/context/A2')).toBe(false)
 expect(matchesURL('/127.0.0.1:3068/books/b/chapter-10 due to access control checks.','http://127.0.0.1:3068/books/b/chapter-1')).toBe(false)
 expect(matchesURL('/127.0.0.1:3068/grammar?activity=one&_rsc=old due to access control checks.','http://127.0.0.1:3068/grammar?activity=two&_rsc=new')).toBe(false)
 expect(matchesURL('Uncaught TypeError: broken application','http://127.0.0.1:3068/books')).toBe(false)
})

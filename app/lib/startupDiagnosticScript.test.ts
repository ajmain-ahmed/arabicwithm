import { afterEach, expect, it, vi } from 'vitest'
import { startupDiagnosticScript } from './startupDiagnosticScript'

afterEach(() => { sessionStorage.clear(); document.body.innerHTML=''; vi.unstubAllGlobals(); vi.useRealTimers() })
function run() {
  vi.useFakeTimers()
  vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => new Response('')))
  document.body.innerHTML='<pre id="output">Cookie metadata: safe</pre><a id="home"></a><button id="copy"></button>'
  new Function(startupDiagnosticScript)()
  return document.getElementById('output')!.textContent!
}
it('excludes raw legacy errors, unknown stages and unrelated route/user information',()=>{
  sessionStorage.setItem('awm-startup-trace',JSON.stringify({version:2,startedAt:1,path:'/',trace:[{stage:'auth-start',at:1,token:'secret'},{stage:'private-user-id',at:2}],firstError:{kind:'runtime-error',message:'private email/token',source:'/profile/private-user-id?token=secret'},failedAssets:['/_next/static/entry.js?token=secret','https://outside.test/private-user-id']}))
  const report=run()
  expect(report).toContain('Homepage auth-start: YES')
  expect(report).toContain('/_next/static/entry.js')
  expect(report).not.toContain('secret');expect(report).not.toContain('private-user-id');expect(report).not.toContain('private email')
})
it('does not count a successful old Homepage trace as the latest navigation',()=>{
  sessionStorage.setItem('awm-startup-navigation','2')
  sessionStorage.setItem('awm-startup-trace',JSON.stringify({version:2,startedAt:1,path:'/',trace:[{stage:'homepage-ready',at:5}]}))
  expect(run()).toContain('Homepage homepage-ready: NO (not recorded)')
})
it('does not copy the unstructured legacy trace',()=>{
  sessionStorage.setItem('awm-startup-trace',JSON.stringify({firstError:{message:'private-token'}}))
  expect(run()).not.toContain('private-token')
})
it('reads the new Homepage trace when Safari restores the diagnostic from its back cache',()=>{
  run()
  sessionStorage.setItem('awm-startup-navigation','2')
  sessionStorage.setItem('awm-startup-trace',JSON.stringify({version:2,startedAt:3,path:'/',trace:[{stage:'auth-start',at:2}]}))
  window.dispatchEvent(new Event('pageshow'))
  expect(document.getElementById('output')!.textContent).toContain('Homepage auth-start: YES')
})

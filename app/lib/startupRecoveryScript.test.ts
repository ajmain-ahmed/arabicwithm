import { afterEach, expect, it, vi } from 'vitest'
import { startupRecoveryScript } from './startupRecoveryScript'

function boot({ url = 'https://arabicwithm.com/?from=home#top', denied = false, storage = new Map<string, string>() } = {}) {
  const listeners = new Map<string, ((event: unknown) => void)[]>()
  const location = { href: url, origin: new URL(url).origin, replace: vi.fn(), reload: vi.fn() }
  const sessionStorage = { getItem: (key: string) => { if (denied) throw new Error('Denied'); return storage.get(key) ?? null },
    setItem: (key: string, value: string) => { if (denied) throw new Error('Denied'); storage.set(key, value) } }
  const window = { addEventListener: (key: string, fn: (event: unknown) => void) => listeners.set(key, [...listeners.get(key) ?? [], fn]),
    location, setTimeout, clearTimeout, fetch: vi.fn().mockResolvedValue({ status: 404 }), AbortController }
  const navigator = { onLine: true }
  const history = { state: { preserved: true }, replaceState: vi.fn() }
  new Function('window', 'document', 'navigator', 'location', 'history', 'performance', 'sessionStorage', 'URL', 'AbortController', startupRecoveryScript)(
    window, document, navigator, location, history, performance, sessionStorage, URL, AbortController)
  return { window, location, storage, navigator, history, emit: (type: string, event = {}) => listeners.get(type)?.forEach(fn => fn(event)) }
}
afterEach(() => { vi.useRealTimers(); document.body.innerHTML = ''; delete document.documentElement.dataset.awmHydrated })
const missingChunk = () => ({ target: { tagName: 'SCRIPT', src: 'https://arabicwithm.com/_next/static/chunks/missing.js' }, preventDefault: vi.fn() })

it('catches a first-entry chunk failure before hydration, retries once and preserves the destination', async () => {
  vi.useFakeTimers()
  const first = boot(), event = missingChunk()
  first.emit('error', event)
  await vi.advanceTimersByTimeAsync(0)
  expect(first.location.replace).toHaveBeenCalledExactlyOnceWith('https://arabicwithm.com/?from=home&__awm_recovery=1#top')
  expect(event.preventDefault).not.toHaveBeenCalled()
  first.emit('error', event)
  expect(first.location.replace).toHaveBeenCalledTimes(1)
  document.body.innerHTML = ''
  const retry = boot({ storage: first.storage, url: first.location.replace.mock.calls[0][0] })
  retry.emit('error', missingChunk())
  await vi.advanceTimersByTimeAsync(0)
  expect(retry.location.replace).not.toHaveBeenCalled()
  expect(document.querySelector('[role="alert"]')?.textContent).toContain('This page took a little detour')
  expect(document.querySelector('button')?.textContent).toContain('Reload')
})

it('keeps the reload bound when Safari denies storage and never clears cookies', async () => {
  vi.useFakeTimers()
  const first = boot({ denied: true })
  first.emit('error', missingChunk())
  await vi.advanceTimersByTimeAsync(0)
  const retry = boot({ denied: true, url: first.location.replace.mock.calls[0][0] })
  retry.emit('error', missingChunk())
  await vi.advanceTimersByTimeAsync(0)
  expect(retry.location.replace).not.toHaveBeenCalled()
  document.documentElement.dataset.awmHydrated = 'true'; retry.emit('awm-hydrated')
  expect(retry.history.replaceState).not.toHaveBeenCalled()
})

it('does not reload for a font, third-party failure, arbitrary runtime error or offline startup', () => {
  vi.useFakeTimers()
  const state = boot()
  state.emit('error', { target: { tagName: 'LINK', rel: 'preload', href: 'https://arabicwithm.com/_next/static/font.woff2' } })
  state.emit('error', { target: { tagName: 'SCRIPT', src: 'https://third-party.example/chunk.js' } })
  state.emit('error', { message: 'ReferenceError: actual app failure' })
  expect(state.location.replace).not.toHaveBeenCalled()
  state.navigator.onLine = false; state.emit('error', missingChunk())
  expect(state.location.replace).not.toHaveBeenCalled()
  state.emit('offline'); expect(document.querySelector('[role="alert"]')?.textContent).toContain('offline')
})

it('recovers an entry-module stall even when WebKit omits its resource error event', async () => {
  vi.useFakeTimers()
  const asset = document.createElement('script'); asset.src = 'https://arabicwithm.com/_next/static/chunks/old.js'; document.body.appendChild(asset)
  const state = boot()
  state.window.fetch.mockResolvedValue({ status: 404 })
  await vi.advanceTimersByTimeAsync(15000)
  expect(state.window.fetch).toHaveBeenCalledWith(asset.src, expect.objectContaining({ cache: 'reload' }))
  expect(state.location.replace).toHaveBeenCalledTimes(1)
})

it('bounds entry-cache repair even when a fetch ignores cancellation', async () => {
  vi.useFakeTimers()
  const asset = document.createElement('script'); asset.src = 'https://arabicwithm.com/_next/static/chunks/old.js'; document.body.appendChild(asset)
  const state = boot(); state.window.fetch.mockImplementation(() => new Promise(() => {}))
  await vi.advanceTimersByTimeAsync(18000)
  expect(state.location.replace).toHaveBeenCalledTimes(1)
})

it('refreshes real entry scripts ahead of a long modulepreload list', async () => {
  vi.useFakeTimers()
  for (let i=0;i<30;i++) { const link=document.createElement('link');link.rel='modulepreload';link.href=`https://arabicwithm.com/_next/static/chunks/dependency-${i}.js`;document.body.appendChild(link) }
  const entry=document.createElement('script');entry.src='https://arabicwithm.com/_next/static/chunks/entry.js';document.body.appendChild(entry)
  const state=boot();await vi.advanceTimersByTimeAsync(15000)
  expect(state.window.fetch.mock.calls[0][0]).toBe(entry.src)
  expect(state.window.fetch).toHaveBeenCalledTimes(24)
  expect(state.location.replace).toHaveBeenCalledTimes(1)
})

it('always includes the failed entry even when more than 24 scripts precede it', async () => {
  vi.useFakeTimers()
  for (let i=0;i<30;i++) { const script=document.createElement('script');script.src=`https://arabicwithm.com/_next/static/chunks/script-${i}.js`;document.body.appendChild(script) }
  const entry=document.createElement('script');entry.src=missingChunk().target.src;document.body.appendChild(entry)
  const state=boot();state.emit('error',missingChunk());await vi.advanceTimersByTimeAsync(0)
  expect(state.window.fetch.mock.calls[1][0]).toBe(entry.src)
  expect(state.window.fetch.mock.calls[1][1]).toEqual(expect.objectContaining({cache:'reload'}))
  expect(state.location.replace).toHaveBeenCalledTimes(1)
})

it('does not redirect a navigation because a prefetch or departing document was cancelled', async () => {
  vi.useFakeTimers()
  const state = boot()
  state.emit('error', { target: { tagName: 'LINK', rel: 'modulepreload', href: 'https://arabicwithm.com/_next/static/chunks/prefetch.js' } })
  state.window.fetch.mockResolvedValue({ status: 200 })
  state.emit('error', missingChunk()); await vi.advanceTimersByTimeAsync(0)
  expect(state.location.replace).not.toHaveBeenCalled()
  state.emit('pagehide'); state.emit('error', missingChunk()); await vi.advanceTimersByTimeAsync(15000)
  expect(state.location.replace).not.toHaveBeenCalled()
})

it('clears the watchdog and preserves router history on a successful retry', async () => {
  vi.useFakeTimers()
  const state = boot({ url: 'https://arabicwithm.com/?__awm_recovery=1', storage: new Map([['awm-startup-recovery-attempt', String(Date.now())]]) })
  document.documentElement.dataset.awmHydrated = 'true'; state.emit('awm-hydrated')
  await vi.advanceTimersByTimeAsync(18000)
  expect(document.querySelector('[role="alert"]')).toBeNull()
  expect(state.window.fetch).not.toHaveBeenCalled()
  expect(state.history.replaceState).toHaveBeenCalledWith(state.history.state, '', 'https://arabicwithm.com/')
})

it('records an opt-in local first error without query strings or long token values', () => {
  vi.useFakeTimers()
  const storage=new Map([['awm-startup-diagnostics','1']]),state=boot({storage})
  state.emit('error',{message:'Failed https://example.test/module?token=private '+ 'a'.repeat(60),filename:'https://arabicwithm.com/_next/static/chunks/start.js?private=value'})
  const recorded=storage.get('awm-startup-trace')!
  expect(recorded).toContain('runtime-error');expect(recorded).toContain('/_next/static/chunks/start.js')
  expect(recorded).not.toContain('token=private');expect(recorded).not.toContain('private=value');expect(recorded).not.toContain('a'.repeat(60))
})

it('bounds startup stages and ignores unknown diagnostic payloads', () => {
  vi.useFakeTimers()
  const storage=new Map([['awm-startup-diagnostics','1']]),state=boot({storage})
  const mark=(state.window as typeof state.window & {__awmStartupMark:(stage:string)=>void}).__awmStartupMark
  mark('react-start');mark('hydration-start');mark('auth-start');mark('private-token')
  for(let i=0;i<100;i++)state.emit('load',{target:{tagName:'SCRIPT',src:`https://arabicwithm.com/_next/static/chunks/entry-${i}.js?secret=value`}})
  const report=JSON.parse(storage.get('awm-startup-trace')!)
  expect(report.trace).toHaveLength(64)
  expect(report.trace[0].stage).toBe('document-start');expect(report.trace[1].stage).toBe('inline-recovery-loaded')
  expect(report.trace.map((event:{stage:string})=>event.stage)).toEqual(expect.arrayContaining(['react-start','hydration-start','auth-start']))
  expect(JSON.stringify(report)).not.toContain('private-token');expect(JSON.stringify(report)).not.toContain('secret=value')
})

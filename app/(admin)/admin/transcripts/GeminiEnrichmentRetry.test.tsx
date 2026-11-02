import React,{act} from 'react'
import {createRoot,type Root} from 'react-dom/client'
import {beforeEach,afterEach,it,expect,vi} from 'vitest'
const mocks=vi.hoisted(()=>({retry:vi.fn()}))
vi.mock('@/app/actions/transcripts',()=>({retryAdminGeminiEnrichment:mocks.retry}))
import GeminiEnrichmentRetry from './GeminiEnrichmentRetry'
import type {TranscriptRow} from '@/app/actions/transcripts'
let host:HTMLDivElement,root:Root
const row={id:'77777777-7777-4777-8777-777777777777',updated_at:'2026-11-02T09:00:00Z',enrichment_retry_kind:'legacy'} as TranscriptRow
beforeEach(()=>{Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});mocks.retry.mockReset();host=document.createElement('div');document.body.appendChild(host);root=createRoot(host)})
afterEach(async()=>{await act(async()=>root.unmount());host.remove()})
async function click(text:string){await act(async()=>{[...document.querySelectorAll('button')].find(b=>b.textContent===text)!.click()})}
it('shows the raw-preservation and cost warning and requires confirmation',async()=>{
 const queued=vi.fn();mocks.retry.mockResolvedValue({ok:true})
 await act(async()=>root.render(<GeminiEnrichmentRetry row={row} onQueued={queued}/>))
 await click('Retry Enrichment')
 expect(document.body.textContent).toContain('The raw transcript is safe')
 expect(document.body.textContent).toContain('may incur a new Gemini enrichment charge')
 expect(mocks.retry).not.toHaveBeenCalled()
 await click('Cancel');expect(mocks.retry).not.toHaveBeenCalled()
 await click('Retry Enrichment');await click('Confirm paid enrichment retry')
 expect(mocks.retry).toHaveBeenCalledExactlyOnceWith(row.id,row.updated_at,true)
 expect(queued).toHaveBeenCalledTimes(1)
})
it('does not offer operator controls for an ineligible row',async()=>{
 await act(async()=>root.render(<GeminiEnrichmentRetry row={{...row,enrichment_retry_kind:null}} onQueued={vi.fn()}/>))
 expect(host.querySelector('button')).toBeNull()
})
it('keeps failure visible without automatically repeating a paid retry',async()=>{
 mocks.retry.mockResolvedValue({ok:false,error:'This transcript changed. Refresh before retrying.'})
 const queued=vi.fn();await act(async()=>root.render(<GeminiEnrichmentRetry row={row} onQueued={queued}/>))
 await click('Retry Enrichment');await click('Confirm paid enrichment retry')
 expect(document.body.textContent).toContain('This transcript changed')
 expect(queued).not.toHaveBeenCalled();expect(mocks.retry).toHaveBeenCalledTimes(1)
})

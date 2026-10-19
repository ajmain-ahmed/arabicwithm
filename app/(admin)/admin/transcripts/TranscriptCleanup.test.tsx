import React,{act} from 'react'
import {createRoot,type Root} from 'react-dom/client'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
const mocks=vi.hoisted(()=>({manage:vi.fn(),load:vi.fn(),retry:vi.fn(),close:vi.fn(),saved:vi.fn()}))
vi.mock('@/app/actions/transcripts',()=>({manageAdminTranscriptGroup:mocks.manage,loadAdminManualEnrichment:mocks.load,retryAdminManualEnrichment:mocks.retry}))
import {GroupBrowser,GroupEditDialog} from './TranscriptGroups'
import EnrichmentDetails from './EnrichmentDetails'

let host:HTMLDivElement,root:Root
const group={id:'group',name:'Podcast',parent_id:null,direct_count:2,transcript_count:2}
beforeEach(()=>{
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});vi.resetAllMocks()
 mocks.manage.mockResolvedValue({ok:true,id:group.id});mocks.saved.mockResolvedValue(undefined)
 mocks.load.mockResolvedValue({status:'partial',diagnostics:[{token:1,reason:'Missing optional metadata'}],originalJson:'[]'})
 mocks.retry.mockResolvedValue({ok:true,status:'ready'})
 host=document.createElement('div');document.body.appendChild(host);root=createRoot(host)
})
afterEach(async()=>{await act(async()=>root.unmount());host.remove()})
const button=(text:string)=>[...document.querySelectorAll('button')].find(b=>b.textContent===text)!
async function fill(value:string){await act(async()=>{
 const input=document.querySelector('input')!;Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}))
})}
async function edit(){await act(async()=>root.render(<GroupEditDialog group={group} onClose={mocks.close} onSaved={mocks.saved}/>))}
async function expand(){await act(async()=>{
 const details=host.querySelector('details')!;details.open=true;details.dispatchEvent(new Event('toggle'))
})}
it('shows matching Add Transcript and Edit Group actions for actual groups only',async()=>{
 const onEdit=vi.fn()
 await act(async()=>root.render(<GroupBrowser groups={[group,{...group,id:'drafts',name:'Drafts'}]} ungrouped={0} filter="group" onFilter={vi.fn()} results={null} onAdd={vi.fn()} onEdit={onEdit}/>))
 expect([...host.querySelectorAll('button')].filter(b=>b.textContent==='Edit Group')).toHaveLength(1)
 await act(async()=>button('Edit Group').click());expect(onEdit).toHaveBeenCalledWith(group)
})
it('trims names and waits for persistence and refreshed data before closing',async()=>{
 let resolve!:(value:unknown)=>void;mocks.manage.mockImplementation(()=>new Promise(r=>{resolve=r}))
 await edit();await fill('  Arabic Podcasts  ')
 await act(async()=>button('Save Changes').click())
 expect(button('Saving…').disabled).toBe(true);expect(mocks.close).not.toHaveBeenCalled()
 expect(mocks.manage).toHaveBeenCalledExactlyOnceWith({id:'group',name:'Arabic Podcasts'})
 await act(async()=>resolve({ok:true,id:'group'}))
 expect(mocks.saved).toHaveBeenCalledOnce();expect(mocks.close).toHaveBeenCalledOnce()
})
it('rejects whitespace and retains the dialog and edited name on persistence failure',async()=>{
 await edit();await fill('   ');expect(button('Save Changes').disabled).toBe(true)
 await fill('New name');mocks.manage.mockResolvedValue({ok:false,error:'Could not rename group. Please try again.'})
 await act(async()=>button('Save Changes').click())
 expect(document.querySelector('input')?.value).toBe('New name');expect(document.body.textContent).toContain('Could not rename group')
 expect(mocks.saved).not.toHaveBeenCalled();expect(mocks.close).not.toHaveBeenCalled()
})
it('handles rejected rename requests without claiming success',async()=>{
 mocks.manage.mockRejectedValue(new Error('Offline'));await edit();await act(async()=>button('Save Changes').click())
 expect(document.body.textContent).toContain('Could not rename group');expect(mocks.close).not.toHaveBeenCalled()
})
it('keeps diagnostics collapsed and lazy, with token dumps behind a second disclosure',async()=>{
 await act(async()=>root.render(<EnrichmentDetails id="transcript"/>))
 expect(host.querySelector('details')!.open).toBe(false);expect(mocks.load).not.toHaveBeenCalled()
 await expand();expect(mocks.load).toHaveBeenCalledWith('transcript')
 expect(host.querySelectorAll('details')[1].open).toBe(false)
 expect(host.querySelector('pre')?.textContent).toContain('Missing optional metadata')
})
it('gives retries a loading state, prevents duplicates, then refreshes diagnostics',async()=>{
 let resolve!:(value:unknown)=>void;mocks.retry.mockImplementation(()=>new Promise(r=>{resolve=r}))
 await act(async()=>root.render(<EnrichmentDetails id="transcript"/>));await expand()
 await act(async()=>button('Retry Enrichment').click())
 expect(button('Retrying…').disabled).toBe(true)
 mocks.load.mockResolvedValue({status:'ready',diagnostics:[],originalJson:'[]'})
 await act(async()=>resolve({ok:true,status:'ready'}))
 expect(mocks.retry).toHaveBeenCalledExactlyOnceWith('transcript');expect(mocks.load).toHaveBeenCalledTimes(2)
 expect(host.textContent).toContain('Enrichment completed.');expect(host.querySelector('pre')).toBeNull()
})
it.each([false,true])('shows returned/thrown retry errors without an unhandled rejection (throws=%s)',async throws=>{
 if(throws)mocks.retry.mockRejectedValue(new Error('Offline'));else mocks.retry.mockResolvedValue({ok:false,error:'Retry permission denied.'})
 await act(async()=>root.render(<EnrichmentDetails id="transcript"/>));await expand();await act(async()=>button('Retry Enrichment').click())
 expect(host.textContent).toContain(throws?'Enrichment retry failed.':'Retry permission denied.')
 expect(button('Retry Enrichment').disabled).toBe(false);expect(host.textContent).not.toContain('Enrichment completed.')
})
it('explains unchanged optional status without calling imported content invalid',async()=>{
 mocks.retry.mockResolvedValue({ok:true,status:'partial'})
 await act(async()=>root.render(<EnrichmentDetails id="transcript"/>));await expand();await act(async()=>button('Retry Enrichment').click())
 expect(host.textContent).toContain('Retry completed; optional enrichment remains partial. Imported transcript content is retained.')
})

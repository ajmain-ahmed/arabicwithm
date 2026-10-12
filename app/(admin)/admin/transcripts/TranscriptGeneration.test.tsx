import React,{act} from 'react'
import {createRoot,type Root} from 'react-dom/client'
import {beforeEach,afterEach,it,expect,vi} from 'vitest'
const mocks=vi.hoisted(()=>({generate:vi.fn(),load:vi.fn(),save:vi.fn()}))
vi.mock('@/app/actions/transcripts',()=>({generateAdminTranscript:mocks.generate,loadAdminGeneration:mocks.load,saveAdminGeneratedTranscript:mocks.save}))
import TranscriptGeneration from './TranscriptGeneration'
let host:HTMLDivElement,root:Root
const id='33333333-3333-4333-8333-333333333333'
const json=JSON.stringify({content:[{text:'مرحبا',offset:84200,duration:5500,english:'Hello',tokens:[{arabic:'مرحبا',english:'hello',pos:'noun',headword:null,entry_type:'word',transliteration:'marhaban'}]}]})
beforeEach(()=>{Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});vi.resetAllMocks();mocks.generate.mockResolvedValue({ok:true,id,duplicate:false});mocks.load.mockResolvedValue({video:{id,title:'Arabic video',updated_at:'2026-10-08T12:00:00Z',status:'ready',searchable:false},json});mocks.save.mockResolvedValue({ok:true,updatedAt:'2026-10-08T12:01:00Z',json});host=document.createElement('div');document.body.appendChild(host);root=createRoot(host)})
afterEach(async()=>{await act(async()=>root.unmount());host.remove()})
async function fill(label:string,value:string){const input=[...host.querySelectorAll('input,textarea')].find(input=>[...host.querySelectorAll('label')].some(item=>item.htmlFor===input.id&&item.textContent?.startsWith(label))) as HTMLInputElement;await act(async()=>{Object.getOwnPropertyDescriptor(input.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value')!.set!.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}))})}
async function click(label:string){await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent===label)!.click())}
async function generate(){await act(async()=>root.render(<TranscriptGeneration/>));await fill('Generate from YouTube','3S3cFw0hvLs');await click('Generate Transcript')}
it('reviews real timing and edits JSON before explicitly saving and publishing',async()=>{
 await generate();expect(mocks.generate).toHaveBeenCalledWith('3S3cFw0hvLs');expect(mocks.save).not.toHaveBeenCalled()
 expect(host.querySelector('textarea')!.value).toBe(json);expect((host.querySelector('input[type="checkbox"]') as HTMLInputElement).checked).toBe(false)
 await fill('Transcript JSON',json.replace('Hello','Welcome'));await fill('Generated video title','Reviewed title');await click('Save reviewed JSON')
 expect(mocks.save).toHaveBeenCalledWith(id,expect.objectContaining({json:json.replace('Hello','Welcome'),title:'Reviewed title',searchable:false}))
 expect(host.textContent).toContain('Generated transcript saved.')
})
it('keeps edited JSON after a save failure and reloads the same cached video on a repeated request',async()=>{
 await generate();await fill('Transcript JSON','{broken');mocks.save.mockResolvedValue({ok:false,error:'Invalid JSON. Your edits are still here.'});await click('Save reviewed JSON')
 expect(host.querySelector('textarea')!.value).toBe('{broken');expect(host.textContent).toContain('Invalid JSON')
 await click('Generate Transcript');expect(mocks.load).toHaveBeenCalledTimes(2);expect(host.querySelector('textarea')!.value).toBe(json)
})
it('shows provider failures and offers downloads without changing unsaved JSON',async()=>{
 mocks.load.mockResolvedValueOnce({video:{id,status:'failed',error_code:'provider_not_configured'},json:null})
 await generate();expect(host.textContent).toContain('Supadata is not configured')
 await click('Generate Transcript');await fill('Transcript JSON',json.replace('Hello','Welcome'))
 const create=vi.fn(()=> 'blob:test'),revoke=vi.fn();Object.assign(URL,{createObjectURL:create,revokeObjectURL:revoke});const anchor=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{})
 await click('Download generated JSON');expect(create).toHaveBeenCalledWith(expect.any(Blob));expect(host.querySelector('textarea')!.value).toContain('Welcome');anchor.mockRestore()
})

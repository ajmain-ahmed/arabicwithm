import React, {act} from 'react'
import {createRoot,type Root} from 'react-dom/client'
import {beforeEach,afterEach,expect,it,vi} from 'vitest'
const mocks=vi.hoisted(()=>({list:vi.fn(),import:vi.fn(),remove:vi.fn(),validate:vi.fn(),download:vi.fn(),save:vi.fn()}))
vi.mock('@/app/actions/transcripts',()=>({listAdminTranscripts:mocks.list,importAdminManualTranscriptResult:mocks.import,validateAdminManualTranscript:mocks.validate,generateAdminTranscript:vi.fn(),deleteAdminTranscript:mocks.remove,updateAdminTranscript:vi.fn(),downloadAdminTranscriptJson:mocks.download,saveAdminTranscriptJson:mocks.save}))
import AdminTranscripts from './AdminTranscripts'
let host:HTMLDivElement,root:Root
beforeEach(()=>{Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});vi.resetAllMocks();mocks.list.mockResolvedValue({rows:[],total:0});mocks.import.mockResolvedValue({ok:true,id:'saved'});mocks.validate.mockResolvedValue({ok:true,segments:1,durationSource:'transcript'});host=document.createElement('div');document.body.appendChild(host);root=createRoot(host)})
afterEach(async()=>{await act(async()=>root.unmount());host.remove()})
async function open(){await act(async()=>root.render(<AdminTranscripts/>));await act(async()=>Array.from(host.querySelectorAll('button')).find(button=>button.textContent==='Add Transcript')!.click())}
async function fill(label:string,value:string){const input=[...document.querySelectorAll('input,textarea')].find(element=>{const id=element.id;return [...document.querySelectorAll('label')].some(item=>item.htmlFor===id&&item.textContent?.startsWith(label))}) as HTMLInputElement|HTMLTextAreaElement;await act(async()=>{const prototype=input.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(prototype,'value')!.set!.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}))})}
async function validForm(){await fill('YouTube URL or video ID','ZBynl03Vp-w');await fill('Video Title','A video');await fill('Transcript JSON','[{"arabic":"\\u0645\\u0631\\u062d\\u0628\\u0627","start_ms":1000,"end_ms":5000}]');await act(async()=>{await new Promise(resolve=>setTimeout(resolve,800))})}
const importButton=()=>[...document.querySelectorAll('button')].find(button=>button.textContent==='Import') as HTMLButtonElement
it('uses one JSON box, defaults publication on, and retains an explicit opt-out',async()=>{
  await open();expect(document.querySelector('input[type="file"]')).toBeNull();expect(document.querySelector('textarea')?.getAttribute('placeholder')).toBe('Paste transcript JSON here...');
  const checkbox=document.querySelector('input[type="checkbox"]') as HTMLInputElement;expect(checkbox.checked).toBe(true);
  await act(async()=>checkbox.click());expect(checkbox.checked).toBe(false);
  expect(importButton().disabled).toBe(true);await validForm();await act(async()=>importButton().click());expect(mocks.import).toHaveBeenCalledWith(expect.objectContaining({searchable:false,duration:''}));
  await act(async()=>Array.from(host.querySelectorAll('button')).find(button=>button.textContent==='Add Transcript')!.click());expect((document.querySelector('input[type="checkbox"]') as HTMLInputElement).checked).toBe(true)
})
it('shows useful server validation errors without closing the JSON editor',async()=>{mocks.import.mockResolvedValue({ok:false,error:'Segment 1: duration must be a positive integer.'});await open();await validForm();await act(async()=>importButton().click());expect(document.body.textContent).toContain('Segment 1: duration');expect(document.querySelector('textarea')).not.toBeNull()})

it('offers only the essential manual-import inputs',async()=>{
  await open()
  const dialog=document.querySelector('[role="dialog"]')!
  expect([...dialog.querySelectorAll('label')].map(label=>label.textContent?.replace(/\s*\*$/, ''))).toEqual(['YouTube URL or video ID','Video Title','Transcript JSON','Video duration','Publish to the shared searchable transcript library'])
  expect(dialog.textContent).not.toMatch(/Channel \/ source|Arabic SRT|English SRT|VTT|Import Transcript/)
  expect([...dialog.querySelectorAll('button')].map(button=>button.textContent)).toContain('Import')
})
it('shows the missing final duration before Import and submits clock-style duration after checking',async()=>{
 mocks.validate.mockResolvedValue({ok:false,needsDuration:true,error:'This transcript uses start-only timestamps. Enter the video duration (MM:SS or HH:MM:SS) so the final segment can be timed.'})
 await open();await validForm();expect(document.body.textContent).toContain('This transcript uses start-only timestamps');expect(importButton().disabled).toBe(true);expect(mocks.import).not.toHaveBeenCalled()
 mocks.validate.mockResolvedValue({ok:true,segments:98,durationSource:'manual'});await fill('Video duration','10:57');expect(importButton().disabled).toBe(true);await act(async()=>{await new Promise(resolve=>setTimeout(resolve,800))});expect(importButton().disabled).toBe(false)
 await act(async()=>importButton().click());expect(mocks.import).toHaveBeenCalledWith(expect.objectContaining({url:'ZBynl03Vp-w',duration:'10:57'}))
})
it('rejects raw seconds in the duration field immediately and prevents Import',async()=>{
 await open();await validForm();await fill('Video duration','657');expect(document.body.textContent).toContain('Enter a time as MM:SS or HH:MM:SS');expect(importButton().disabled).toBe(true);expect(mocks.import).not.toHaveBeenCalled()
})
it('confirms deletion for legacy and generated rows, keeps Cancel safe, then refreshes',async()=>{
  const row={id:'11111111-1111-4111-8111-111111111111',title:'Legacy video',thumbnail:'test.jpg',status:'ready',translation_status:'ready',provider:'manual',created_at:'2026-10-04',updated_at:'2026-10-04',searchable:true}
  mocks.list.mockResolvedValue({rows:[row,{...row,id:'22222222-2222-4222-8222-222222222222',title:'Generated video',status:'failed',provider:'gladia'}],total:2})
  mocks.remove.mockResolvedValue({ok:true})
  await act(async()=>root.render(<AdminTranscripts/>))
  const deletes=[...host.querySelectorAll('button')].filter(button=>button.textContent==='Delete')
  expect(deletes).toHaveLength(2)
  await act(async()=>deletes[0].click())
  expect(mocks.remove).not.toHaveBeenCalled()
  expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Legacy video')
  await act(async()=>[...document.querySelectorAll('[role="dialog"] button')].find(button=>button.textContent==='Cancel')!.dispatchEvent(new MouseEvent('click',{bubbles:true})))
  expect(mocks.remove).not.toHaveBeenCalled()
  await act(async()=>deletes[0].click())
  mocks.list.mockResolvedValue({rows:[],total:0})
  await act(async()=>[...document.querySelectorAll('[role="dialog"] button')].find(button=>button.textContent==='Delete')!.dispatchEvent(new MouseEvent('click',{bubbles:true})))
  expect(mocks.remove).toHaveBeenCalledWith(row.id)
  expect(host.textContent).not.toContain('Legacy video')
})

const editRow={id:'11111111-1111-4111-8111-111111111111',title:'Saved video',channel:'Channel',thumbnail:'test.jpg',status:'ready',translation_status:'ready',provider:'manual',created_at:'2026-10-04',updated_at:'2026-10-04T00:00:00Z',searchable:true}
const savedJson=JSON.stringify({content:[{text:'مرحبا',offset:1234,duration:4000,english:'Hello',tokens:[{ar:'مرحبا',plain:'مرحبا',gloss:'hello',start_ms:1234,end_ms:2234}]}]})
async function openEdit(){
 mocks.list.mockResolvedValue({rows:[editRow],total:1})
 mocks.download.mockResolvedValue({json:savedJson,filename:'Saved_video_transcript.json',updatedAt:editRow.updated_at,durationSeconds:10})
 await act(async()=>root.render(<AdminTranscripts/>))
 await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent==='Edit / Publish')!.click())
}
const editSave=()=>[...document.querySelectorAll('[role="dialog"] button')].find(button=>button.textContent==='Save Changes') as HTMLButtonElement
it('populates Edit with current JSON, keeps unsaved changes through list refresh, and formats without changing data',async()=>{
 await openEdit();expect(document.querySelector('textarea')?.value).toBe(savedJson)
 const corrected=savedJson.replace('Hello','Welcome');await fill('Transcript JSON',corrected)
 await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent==='Refresh')!.click())
 expect(document.querySelector('textarea')?.value).toBe(corrected)
 await act(async()=>[...document.querySelectorAll('button')].find(button=>button.textContent==='Format JSON')!.click())
 expect(JSON.parse(document.querySelector('textarea')!.value)).toEqual(JSON.parse(corrected))
 expect(mocks.download).toHaveBeenCalledTimes(1)
})
it('keeps invalid edits and returns from Saving on failure, then permits correction and save',async()=>{
 await openEdit();await fill('Transcript JSON','{broken')
 mocks.save.mockResolvedValueOnce({ok:false,error:'Invalid transcript JSON near line 1.'})
 await act(async()=>editSave().click());expect(editSave().disabled).toBe(false)
 expect(document.body.textContent).toContain('Invalid transcript JSON');expect(document.querySelector('textarea')!.value).toBe('{broken')
 await fill('Transcript JSON',savedJson)
 mocks.save.mockResolvedValueOnce({ok:true,json:savedJson,updatedAt:'2026-10-08T12:00:00Z'})
 await act(async()=>editSave().click())
 expect(mocks.save).toHaveBeenLastCalledWith(editRow.id,{json:savedJson,title:editRow.title,channel:editRow.channel,searchable:true,updatedAt:editRow.updated_at,duration:'',durationFormat:'clock'})
 expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Saved')
 await fill('Transcript JSON',savedJson.replace('Hello','Welcome'))
 mocks.save.mockResolvedValueOnce({ok:true,json:savedJson,updatedAt:'2026-10-08T12:01:00Z'})
 await act(async()=>editSave().click())
 expect(mocks.save.mock.calls.at(-1)?.[1].updatedAt).toBe('2026-10-08T12:00:00Z')
})
it('downloads saved canonical JSON without replacing current unsaved edits',async()=>{
 await openEdit();await fill('Transcript JSON',savedJson.replace('Hello','Welcome'))
 const create=vi.fn(()=> 'blob:transcript'),revoke=vi.fn()
 Object.assign(URL,{createObjectURL:create,revokeObjectURL:revoke})
 const click=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{})
 await act(async()=>[...document.querySelectorAll('button')].find(button=>button.textContent==='Download JSON')!.click())
 expect(create).toHaveBeenCalledWith(expect.any(Blob));expect(click).toHaveBeenCalled()
 expect(document.querySelector('textarea')!.value).toContain('Welcome');click.mockRestore()
})
it('prevents duplicate saves and re-enables Save after a thrown request',async()=>{
 await openEdit();let reject!:(error:Error)=>void
 mocks.save.mockImplementation(()=>new Promise((_,fail)=>{reject=fail}))
 const button=editSave();await act(async()=>{button.click();button.click()})
 expect(mocks.save).toHaveBeenCalledTimes(1);expect(button.disabled).toBe(true);expect(button.textContent).toBe('Saving…')
 await act(async()=>reject(new Error('Could not save transcript.')))
 expect(editSave().disabled).toBe(false);expect(document.body.textContent).toContain('Could not save transcript.')
})

it('allows minutes / HH:MM fallback without changing existing clock interpretation',async()=>{
 await open();await validForm()
 await act(async()=>[...document.querySelectorAll('button')].find(button=>button.textContent==='MM / HH:MM')!.click())
 await fill('Video duration','11');await act(async()=>{await new Promise(resolve=>setTimeout(resolve,800))})
 await act(async()=>importButton().click())
 expect(mocks.import).toHaveBeenCalledWith(expect.objectContaining({duration:'11',durationFormat:'minutes'}))
})

import React, {act} from 'react'
import {createRoot,type Root} from 'react-dom/client'
import {beforeEach,afterEach,expect,it,vi} from 'vitest'
const mocks=vi.hoisted(()=>({list:vi.fn(),import:vi.fn(),remove:vi.fn()}))
vi.mock('@/app/actions/transcripts',()=>({listAdminTranscripts:mocks.list,importAdminManualTranscriptResult:mocks.import,generateAdminTranscript:vi.fn(),deleteAdminTranscript:mocks.remove,updateAdminTranscript:vi.fn()}))
import AdminTranscripts from './AdminTranscripts'
let host:HTMLDivElement,root:Root
beforeEach(()=>{Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});vi.resetAllMocks();mocks.list.mockResolvedValue({rows:[],total:0});mocks.import.mockResolvedValue({ok:true,id:'saved'});host=document.createElement('div');document.body.appendChild(host);root=createRoot(host)})
afterEach(async()=>{await act(async()=>root.unmount());host.remove()})
async function open(){await act(async()=>root.render(<AdminTranscripts/>));await act(async()=>Array.from(host.querySelectorAll('button')).find(button=>button.textContent==='Add Transcript')!.click())}
it('uses one JSON box, defaults publication on, and retains an explicit opt-out',async()=>{
  await open();expect(document.querySelector('input[type="file"]')).toBeNull();expect(document.querySelector('textarea')?.getAttribute('placeholder')).toBe('Paste transcript JSON here...');
  const checkbox=document.querySelector('input[type="checkbox"]') as HTMLInputElement;expect(checkbox.checked).toBe(true);
  await act(async()=>checkbox.click());expect(checkbox.checked).toBe(false);
  await act(async()=>Array.from(document.querySelectorAll('button')).find(button=>button.textContent==='Import')!.click());expect(mocks.import).toHaveBeenCalledWith(expect.objectContaining({json:'',searchable:false}));
  await act(async()=>Array.from(host.querySelectorAll('button')).find(button=>button.textContent==='Add Transcript')!.click());expect((document.querySelector('input[type="checkbox"]') as HTMLInputElement).checked).toBe(true)
})
it('shows useful server validation errors without closing the JSON editor',async()=>{mocks.import.mockResolvedValue({ok:false,error:'Segment 1: duration must be a positive integer.'});await open();await act(async()=>Array.from(document.querySelectorAll('button')).find(button=>button.textContent==='Import')!.click());expect(document.body.textContent).toContain('Segment 1: duration');expect(document.querySelector('textarea')).not.toBeNull()})

it('offers only the essential manual-import inputs',async()=>{
  await open()
  const dialog=document.querySelector('[role="dialog"]')!
  expect([...dialog.querySelectorAll('label')].map(label=>label.textContent?.replace(/\s*\*$/, ''))).toEqual(['YouTube URL','Video Title','Transcript JSON','Video duration in seconds (optional)','Publish to the shared searchable transcript library'])
  expect(dialog.textContent).not.toMatch(/Channel \/ source|Arabic SRT|English SRT|VTT|Import Transcript/)
  expect([...dialog.querySelectorAll('button')].map(button=>button.textContent)).toContain('Import')
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

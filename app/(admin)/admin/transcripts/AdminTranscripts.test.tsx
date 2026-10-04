import React, {act} from 'react'
import {createRoot,type Root} from 'react-dom/client'
import {beforeEach,afterEach,expect,it,vi} from 'vitest'
const mocks=vi.hoisted(()=>({list:vi.fn(),import:vi.fn()}))
vi.mock('@/app/actions/transcripts',()=>({listAdminTranscripts:mocks.list,importAdminManualTranscriptResult:mocks.import,generateAdminTranscript:vi.fn(),deleteAdminTranscript:vi.fn(),updateAdminTranscript:vi.fn()}))
import AdminTranscripts from './AdminTranscripts'
let host:HTMLDivElement,root:Root
beforeEach(()=>{Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});vi.resetAllMocks();mocks.list.mockResolvedValue({rows:[],total:0});mocks.import.mockResolvedValue({ok:true,id:'saved'});host=document.createElement('div');document.body.appendChild(host);root=createRoot(host)})
afterEach(async()=>{await act(async()=>root.unmount());host.remove()})
async function open(){await act(async()=>root.render(<AdminTranscripts/>));await act(async()=>Array.from(host.querySelectorAll('button')).find(button=>button.textContent==='Add Transcript')!.click())}
it('uses one JSON box, defaults publication on, and retains an explicit opt-out',async()=>{
  await open();expect(document.querySelector('input[type="file"]')).toBeNull();expect(document.querySelector('textarea')?.getAttribute('placeholder')).toBe('Paste transcript JSON here...');
  const checkbox=document.querySelector('input[type="checkbox"]') as HTMLInputElement;expect(checkbox.checked).toBe(true);
  await act(async()=>checkbox.click());expect(checkbox.checked).toBe(false);
  await act(async()=>Array.from(document.querySelectorAll('button')).find(button=>button.textContent==='Import Transcript')!.click());expect(mocks.import).toHaveBeenCalledWith(expect.objectContaining({json:'',searchable:false}));
  await act(async()=>Array.from(host.querySelectorAll('button')).find(button=>button.textContent==='Add Transcript')!.click());expect((document.querySelector('input[type="checkbox"]') as HTMLInputElement).checked).toBe(true)
})
it('shows useful server validation errors without closing the JSON editor',async()=>{mocks.import.mockResolvedValue({ok:false,error:'Segment 1: duration must be a positive integer.'});await open();await act(async()=>Array.from(document.querySelectorAll('button')).find(button=>button.textContent==='Import Transcript')!.click());expect(document.body.textContent).toContain('Segment 1: duration');expect(document.querySelector('textarea')).not.toBeNull()})

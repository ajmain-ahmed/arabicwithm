import React, {act} from 'react'
import {createRoot,type Root} from 'react-dom/client'
import {beforeEach,afterEach,expect,it,vi} from 'vitest'
const mocks=vi.hoisted(()=>({list:vi.fn(),import:vi.fn(),remove:vi.fn(),validate:vi.fn(),download:vi.fn(),save:vi.fn(),group:vi.fn(),move:vi.fn(),saveDraft:vi.fn(),loadDraft:vi.fn(),deleteDraft:vi.fn()}))
vi.mock('@/app/actions/transcripts',()=>({saveAdminManualDraft:mocks.saveDraft,loadAdminManualDraft:mocks.loadDraft,deleteAdminManualDraft:mocks.deleteDraft,loadAdminManualEnrichment:vi.fn().mockResolvedValue(null),retryAdminManualEnrichment:vi.fn().mockResolvedValue({ok:true,status:'unavailable'}),listAdminTranscripts:mocks.list,prepareAdminManualImport:async(input:unknown)=>{const result=await mocks.import(input);return result.ok?{ok:true,state:{importId:'99999999-9999-4999-8999-999999999999',id:result.id??'saved',expected:1,committed:0,tokens:0,completed:false,enrichment:result.enrichment??'unavailable'}}:{...result,retryable:false}},appendAdminManualImport:async()=> ({ok:true,state:{importId:'99999999-9999-4999-8999-999999999999',id:'saved',expected:1,committed:1,tokens:1,completed:false,enrichment:'unavailable'}}),finishAdminManualImport:async()=> ({ok:true,state:{importId:'99999999-9999-4999-8999-999999999999',id:'saved',expected:1,committed:1,tokens:1,completed:true,enrichment:'unavailable'}}),resumeAdminManualImport:vi.fn(),validateAdminManualTranscript:mocks.validate,generateAdminTranscript:vi.fn(),deleteAdminTranscript:mocks.remove,updateAdminTranscript:vi.fn(),downloadAdminTranscriptJson:mocks.download,saveAdminTranscriptJson:mocks.save,manageAdminTranscriptGroup:mocks.group,moveAdminTranscriptGroup:mocks.move}))
import AdminTranscripts from './AdminTranscripts'
let host:HTMLDivElement,root:Root
beforeEach(()=>{Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});vi.resetAllMocks();mocks.list.mockResolvedValue({rows:[],total:0});mocks.import.mockResolvedValue({ok:true,id:'saved'});mocks.saveDraft.mockImplementation(async(id:string)=>({ok:true,id,updatedAt:'2026-10-09T17:00:00Z'}));mocks.deleteDraft.mockResolvedValue({ok:true});mocks.validate.mockResolvedValue({ok:true,segments:1,durationSource:'transcript'});host=document.createElement('div');document.body.appendChild(host);root=createRoot(host)})
afterEach(async()=>{await act(async()=>root.unmount());host.remove()})
async function open(){await act(async()=>root.render(<AdminTranscripts/>));await act(async()=>Array.from(host.querySelectorAll('button')).find(button=>button.textContent==='Add Transcript')!.click())}
async function fill(label:string,value:string){const input=[...document.querySelectorAll('input,textarea')].find(element=>{const id=element.id;return [...document.querySelectorAll('label')].some(item=>item.htmlFor===id&&item.textContent?.startsWith(label))}) as HTMLInputElement|HTMLTextAreaElement;await act(async()=>{const prototype=input.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(prototype,'value')!.set!.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}))})}
async function validForm(){await fill('YouTube URL or video ID','ZBynl03Vp-w');await fill('Video Title','A video');await fill('Transcript JSON','[{"arabic":"\\u0645\\u0631\\u062d\\u0628\\u0627","start_ms":1000,"end_ms":5000}]');await act(async()=>{await new Promise(resolve=>setTimeout(resolve,800))})}
const importButton=()=>[...document.querySelectorAll('button')].find(button=>button.textContent==='Import') as HTMLButtonElement
const draftButton=()=>[...document.querySelectorAll('button')].find(button=>button.textContent==='Save draft') as HTMLButtonElement
it('offers Save draft alongside Cancel and Import and saves unfinished inputs without import validation',async()=>{
 await open();expect(draftButton().disabled).toBe(false)
 const actions=[...document.querySelectorAll('[role="dialog"] button')].map(b=>b.textContent)
 expect(actions.slice(-3)).toEqual(['Cancel','Save draft','Import'])
 await fill('Video Title','  My unfinished draft  ');await fill('Transcript JSON','{ incomplete');await fill('Video duration','unfinished')
 expect(importButton().disabled).toBe(true);expect(draftButton().disabled).toBe(false)
 await act(async()=>draftButton().click())
 expect(mocks.saveDraft).toHaveBeenCalledWith(expect.stringMatching(/^[a-f0-9-]{36}$/),expect.objectContaining({title:'  My unfinished draft  ',url:'',json:'{ incomplete',duration:'unfinished',durationFormat:'clock',searchable:true,groupId:null}),null)
 expect(mocks.import).not.toHaveBeenCalled();expect(document.body.textContent).toContain('Draft saved in Drafts.')
})
it('opens saved drafts with exact input and can update the same draft without duplicates',async()=>{
 const id='77777777-7777-4777-8777-777777777777',version='2026-10-09T17:00:00Z',group='66666666-6666-4666-8666-666666666666'
 const row={id,draft_id:id,draft_version:version,title:'Saved draft',status:'draft',provider:'manual',created_at:version,updated_at:version,searchable:false}
 mocks.list.mockResolvedValue({rows:[row],total:1,groups:[{id:'drafts',name:'Drafts',direct_count:1,transcript_count:1},{id:group,name:'Destination',direct_count:0,transcript_count:0}]})
 mocks.loadDraft.mockResolvedValue({id,updatedAt:version,payload:{title:'Saved draft',url:'incomplete URL',channel:'Hidden source',json:'  {not yet JSON',duration:'11',durationFormat:'minutes',searchable:false,groupId:group}})
 await act(async()=>root.render(<AdminTranscripts/>));await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent==='Open draft')!.click())
 const json=document.querySelector('textarea') as HTMLTextAreaElement;expect(json.value).toBe('  {not yet JSON')
 expect((document.querySelector('input[type="checkbox"]') as HTMLInputElement).checked).toBe(false)
 expect((document.querySelector('[role="dialog"] select') as HTMLSelectElement).value).toBe(group)
 await fill('Video Title','Updated draft');await act(async()=>draftButton().click())
 expect(mocks.saveDraft).toHaveBeenCalledWith(id,expect.objectContaining({title:'Updated draft',url:'incomplete URL',channel:'Hidden source',json:'  {not yet JSON',duration:'11',durationFormat:'minutes',searchable:false,groupId:group}),version)
})
it('keeps draft inputs intact on save failure and never discards a draft after a failed import',async()=>{
 mocks.saveDraft.mockResolvedValue({ok:false,error:'Draft changed in another tab.'});await open();await fill('Transcript JSON','  {unfinished')
 await act(async()=>draftButton().click());expect(document.querySelector('textarea')?.value).toBe('  {unfinished');expect(document.body.textContent).toContain('Draft changed in another tab.')
 expect(mocks.deleteDraft).not.toHaveBeenCalled()
})
it('removes a saved draft only after verified import and retains it after an import failure',async()=>{
 const id='77777777-7777-4777-8777-777777777777',version='2026-10-09T17:00:00Z'
 const row={id,draft_id:id,draft_version:version,title:'Saved draft',status:'draft',provider:'manual',created_at:version,updated_at:version,searchable:false}
 mocks.list.mockResolvedValue({rows:[row],total:1,groups:[{id:'drafts',name:'Drafts',direct_count:1,transcript_count:1}]})
 mocks.loadDraft.mockResolvedValue({id,updatedAt:version,payload:{title:'Saved draft',url:'ZBynl03Vp-w',channel:'',json:'[{"text":"hello","offset":0,"duration":1000}]',duration:'',durationFormat:'clock',searchable:true,groupId:null}})
 await act(async()=>root.render(<AdminTranscripts/>));await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent==='Open draft')!.click())
 await act(async()=>{await new Promise(resolve=>setTimeout(resolve,800))})
 mocks.import.mockResolvedValueOnce({ok:false,error:'Simulated failure'});await act(async()=>importButton().click());expect(mocks.deleteDraft).not.toHaveBeenCalled()
 await act(async()=>importButton().click());expect(mocks.deleteDraft).toHaveBeenCalledWith(id,version)
})
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
  expect([...dialog.querySelectorAll('label')].map(label=>label.textContent?.replace(/\s*\*$/, ''))).toEqual(['Video Title','YouTube URL or video ID','Group (optional)','Video duration','Transcript JSON','Publish to the shared searchable transcript library'])
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
 await fill('Transcript JSON',savedJson.replace('Hello','Corrected'))
 mocks.save.mockResolvedValueOnce({ok:true,json:savedJson,updatedAt:'2026-10-08T12:00:00Z'})
 await act(async()=>editSave().click())
 expect(mocks.save).toHaveBeenLastCalledWith(editRow.id,{json:savedJson.replace('Hello','Corrected'),title:editRow.title,channel:editRow.channel,searchable:true,updatedAt:editRow.updated_at,duration:'0:10',durationFormat:'clock',url:'',groupId:null})
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
 await openEdit();await fill('Video Title','Edited title');let reject!:(error:Error)=>void
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

const parentGroup={id:'33333333-3333-4333-8333-333333333333',name:'Arabic Learning',parent_id:null,direct_count:2,transcript_count:41}
const childGroup={id:'44444444-4444-4444-8444-444444444444',name:'Grammar',parent_id:parentGroup.id,direct_count:39,transcript_count:39}
async function select(label:string,value:string){const input=[...document.querySelectorAll('select')].find(element=>[...document.querySelectorAll('label')].some(item=>item.htmlFor===element.id&&item.textContent?.startsWith(label)))!;await act(async()=>{Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value')!.set!.call(input,value);input.dispatchEvent(new Event('change',{bubbles:true}))})}
it('searches beyond the current page, resets group filters, and reveals matches without expanding groups',async()=>{
 mocks.list.mockImplementation(async(page:number,search:string)=>({rows:search?[{...editRow,title:'قصة إبراهيم',group_id:childGroup.id}]:[],total:search?1:41,groups:[parentGroup,childGroup],ungrouped:0}))
 await act(async()=>root.render(<AdminTranscripts/>))
 await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent==='Next')!.click())
 expect(mocks.list).toHaveBeenLastCalledWith(1,'','ungrouped')
 await fill('Search transcripts by title','قصة إبراهيم')
 await act(async()=>{await new Promise(resolve=>setTimeout(resolve,400))})
 expect(mocks.list).toHaveBeenLastCalledWith(0,'قصة إبراهيم','')
 expect(host.textContent).toContain('قصة إبراهيم')
 expect(host.textContent).toContain('Arabic Learning (41)')
 expect(host.querySelector('[aria-expanded="true"]')).toBeNull()
 await select('Filter by group',childGroup.id)
 expect(mocks.list).toHaveBeenLastCalledWith(0,'قصة إبراهيم',childGroup.id)
 await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent==='Clear filter')!.click())
 expect(mocks.list).toHaveBeenLastCalledWith(0,'قصة إبراهيم','')
})
it('loads saved group and duration, changes assignment and keeps channel metadata out of the visible form',async()=>{
 mocks.list.mockResolvedValue({rows:[{...editRow,youtube_id:'ZBynl03Vp-w',group_id:childGroup.id}],total:1,groups:[parentGroup,childGroup],ungrouped:0})
 mocks.download.mockResolvedValue({json:savedJson,updatedAt:editRow.updated_at,title:editRow.title,channel:editRow.channel,groupId:childGroup.id,youtubeId:'ZBynl03Vp-w',durationSeconds:4257})
 mocks.move.mockResolvedValue({ok:true,updatedAt:editRow.updated_at})
 await act(async()=>root.render(<AdminTranscripts/>));await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent==='Edit / Publish')!.click())
 const dialog=document.querySelector('[role="dialog"]')!
 expect(dialog.textContent).not.toContain('Channel / source')
 expect((dialog.querySelector('select') as HTMLSelectElement).value).toBe(childGroup.id)
 expect([...dialog.querySelectorAll('input')].map(input=>input.value)).toContain('1:10:57')
 expect(dialog.querySelector('textarea')!.compareDocumentPosition(dialog.querySelector('select')!)&Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy()
 await select('Group','');await act(async()=>editSave().click())
 expect(mocks.move).toHaveBeenCalledWith(editRow.id,{groupId:null,previousGroupId:childGroup.id,updatedAt:editRow.updated_at});expect(mocks.save).not.toHaveBeenCalled();expect(document.querySelector('textarea')!.value).toBe(savedJson)
})
it('creates a group from Import without losing unsaved JSON and makes it immediately selectable',async()=>{
 await open();await validForm();const json=document.querySelector('textarea')!.value
 mocks.group.mockResolvedValue({ok:true,id:parentGroup.id})
 mocks.list.mockResolvedValue({rows:[],total:0,groups:[parentGroup],ungrouped:0})
 await act(async()=>[...document.querySelectorAll('button')].find(button=>button.textContent==='Create a group')!.click())
 await fill('Group name','Arabic Learning')
 await act(async()=>[...document.querySelectorAll('button')].find(button=>button.textContent==='Create group')!.click())
 expect(mocks.group).toHaveBeenCalledWith(expect.objectContaining({name:'Arabic Learning',parentId:null}))
 await act(async()=>[...document.querySelectorAll('button')].find(button=>button.textContent==='Done')!.click())
 expect(document.querySelector('textarea')!.value).toBe(json)
 expect((document.querySelector('[role="dialog"] select') as HTMLSelectElement).value).toBe(parentGroup.id)
 await act(async()=>importButton().click())
 expect(mocks.import).toHaveBeenCalledWith(expect.objectContaining({groupId:parentGroup.id,json}))
})

it('opens Add Transcript inside a flat group with that group preselected',async()=>{
 mocks.list.mockResolvedValue({rows:[],total:0,groups:[parentGroup,childGroup],ungrouped:0})
 await act(async()=>root.render(<AdminTranscripts/>))
 await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent?.includes('Arabic Learning (41)'))!.click())
 expect(host.textContent).toContain('No transcripts in this group yet.')
 const section=[...host.querySelectorAll('.MuiAccordion-root')].find(node=>node.textContent?.includes('Arabic Learning (41)'))!
 await act(async()=>[...section.querySelectorAll('button')].find(button=>button.textContent==='Add Transcript')!.click())
 expect((document.querySelector('[role="dialog"] select') as HTMLSelectElement).value).toBe(parentGroup.id)
 expect(document.body.textContent).not.toContain('Parent group')
 const selector=document.querySelector('[role="dialog"] select')!
 expect(document.querySelector(`label[for="${selector.id}"]`)?.getAttribute('data-shrink')).toBe('true')
})
it('places duration formats below the input and exposes help by tap',async()=>{
 await open()
 const dialog=document.querySelector('[role="dialog"]')!
 const label=[...dialog.querySelectorAll('label')].find(item=>item.textContent==='Video duration')!
 const duration=document.getElementById(label.htmlFor)!
 const button=[...dialog.querySelectorAll('button')].find(item=>item.textContent==='Minutes & Seconds')!
 expect(duration.compareDocumentPosition(button)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
 expect(dialog.textContent).not.toContain('optional when the transcript JSON')
 await act(async()=>dialog.querySelector<HTMLButtonElement>('[aria-label="Video duration information"]')!.click())
 expect(document.body.textContent).toContain('MM:SS or HH:MM:SS')
 expect(document.body.textContent).toContain('optional when the transcript JSON already contains complete timing information')
})
it('moves an old unassigned transcript without re-saving its content, even after JSON formatting',async()=>{
 await openEdit();mocks.move.mockResolvedValue({ok:true,updatedAt:editRow.updated_at})
 await act(async()=>[...document.querySelectorAll('button')].find(button=>button.textContent==='Format JSON')!.click())
 await act(async()=>editSave().click())
 expect(mocks.move).toHaveBeenCalledWith(editRow.id,{groupId:null,previousGroupId:null,updatedAt:editRow.updated_at})
 expect(mocks.save).not.toHaveBeenCalled()
 expect(JSON.parse(document.querySelector('textarea')!.value)).toEqual(JSON.parse(savedJson))
})

it('uses the latest null assignment from Edit rather than an older list assignment',async()=>{
 mocks.list.mockResolvedValue({rows:[{...editRow,group_id:childGroup.id}],total:1,groups:[parentGroup,childGroup],ungrouped:1})
 mocks.download.mockResolvedValue({json:savedJson,updatedAt:editRow.updated_at,groupId:null,durationSeconds:10})
 mocks.move.mockResolvedValue({ok:true,updatedAt:editRow.updated_at})
 await act(async()=>root.render(<AdminTranscripts/>))
 await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent==='Edit / Publish')!.click())
 await select('Group',parentGroup.id);await act(async()=>editSave().click())
 expect(mocks.move).toHaveBeenCalledWith(editRow.id,{groupId:parentGroup.id,previousGroupId:null,updatedAt:editRow.updated_at})
 expect(mocks.save).not.toHaveBeenCalled()
})

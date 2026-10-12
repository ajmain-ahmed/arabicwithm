import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const mocks=vi.hoisted(()=>({catalogue:vi.fn(),source:vi.fn(),submit:vi.fn(),comments:vi.fn(),adminComments:vi.fn(),list:vi.fn(),edit:vi.fn(),review:vi.fn(),clipboard:vi.fn()}))
vi.mock('@/app/actions/reviews',()=>({reviewCatalogue:mocks.catalogue,loadReviewSource:mocks.source,submitSuggestion:mocks.submit,loadReviewerComments:mocks.comments,loadAdminBookCorrections:mocks.adminComments,listSuggestions:mocks.list,editSuggestion:mocks.edit,reviewSuggestion:mocks.review}))
import ReviewerWorkspace from './ReviewerWorkspace'
import SuggestionsList from './SuggestionsList'
let host:HTMLDivElement,root:Root
beforeEach(()=>{
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});host=document.createElement('div');document.body.appendChild(host);root=createRoot(host)
 vi.spyOn(window,'scrollTo').mockImplementation(()=>{})
 mocks.catalogue.mockImplementation(async(_type:string,parent?:string)=>parent?[{id:'chapter',title:'Arrival',chapter_number:3}]:[{id:'book',title:'Reader'}])
 mocks.source.mockResolvedValue({location:'Reader / Chapter 03',parent:'book',document:[{tokens:[{arabic:'مرحبا'}],translation:'Hello'}]})
 mocks.list.mockResolvedValue({suggestions:[],total:0});mocks.submit.mockResolvedValue('suggestion');mocks.edit.mockResolvedValue(undefined)
 mocks.comments.mockResolvedValue([])
 mocks.adminComments.mockResolvedValue([]);mocks.clipboard.mockResolvedValue(undefined)
 Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:mocks.clipboard}})
})
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.clearAllMocks();vi.restoreAllMocks();vi.useRealTimers()})
async function select(index:number,title:string){
 await act(async()=>{host.querySelectorAll('[role="combobox"]')[index].dispatchEvent(new MouseEvent('mousedown',{bubbles:true}))})
 await act(async()=>{[...document.querySelectorAll<HTMLElement>('[role="option"]')].find(o=>o.textContent===title)!.click()})
}
async function button(text:string){await act(async()=>{[...document.querySelectorAll<HTMLButtonElement>('button')].find(b=>b.textContent===text)!.click()})}
async function comment(index:number,text:string){
 const textarea=host.querySelector<HTMLTextAreaElement>(`textarea[aria-label="Comment for line ${index}"]`)!
 await act(async()=>{Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value')!.set!.call(textarea,text);textarea.dispatchEvent(new Event('input',{bubbles:true}))})
 return textarea
}
it('submits an inline Editor comment with the exact source snapshot, without a modal, reload or scroll',async()=>{
 await act(async()=>root.render(<ReviewerWorkspace/>));expect(host.textContent).not.toContain('Manage Suggestions & Exports')
 await select(0,'Reader');await select(1,'Chapter 3 — Arrival')
 expect(host.textContent).toContain('مرحبا');expect(host.textContent).not.toContain('Suggest Edit');expect(document.querySelector('[role="dialog"]')).toBeNull()
 const textarea=await comment(1,'Review this greeting');vi.mocked(window.scrollTo).mockClear()
 await button('Comment')
 expect(mocks.submit).toHaveBeenCalledWith('book','chapter',0,[{tokens:[{arabic:'مرحبا'}],translation:'Hello'}],{arabic:'',english:'',comment:'Review this greeting',reason:''})
 expect(textarea.value).toBe('');expect(host.textContent).toContain('Comment added.');expect(host.textContent).toContain('Review this greeting')
 expect(mocks.source).toHaveBeenCalledTimes(1);expect(window.scrollTo).not.toHaveBeenCalled()
 await select(0,'Choose…');expect(document.querySelector('[role="dialog"]')).toBeNull();expect(host.textContent).not.toContain('مرحبا')
})
it('preserves independent drafts and failed comments, prevents duplicate clicks, and restores previous comments',async()=>{
 mocks.source.mockResolvedValue({location:'Reader',parent:'book',document:Array.from({length:26},()=>({tokens:[{arabic:'مرحبا'}],translation:'Hello'}))})
 mocks.comments.mockResolvedValue([{id:'old',line_index:0,comment:'Previously saved',status:'accepted',created_at:'2026-10-02T12:00:00Z',admin_response:'Reviewed'}])
 await act(async()=>root.render(<ReviewerWorkspace/>));await select(0,'Reader');await select(1,'Chapter 3 — Arrival')
 expect(host.textContent).toContain('Previously saved');expect(host.textContent).toContain('Admin: Reviewed')
 await comment(1,'First draft');await comment(2,'Second draft')
 await button('Next');await comment(26,'Later page');await button('Previous')
 expect(host.querySelector<HTMLTextAreaElement>('[aria-label="Comment for line 1"]')?.value).toBe('First draft')
 expect(host.querySelector<HTMLTextAreaElement>('[aria-label="Comment for line 2"]')?.value).toBe('Second draft')
 let finish!:(value:unknown)=>void;mocks.submit.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve}))
 const action=[...host.querySelectorAll<HTMLButtonElement>('button')].find(b=>b.textContent==='Comment')!
 await act(async()=>{action.click();action.click()});expect(mocks.submit).toHaveBeenCalledTimes(1)
 expect(host.querySelector<HTMLTextAreaElement>('[aria-label="Comment for line 2"]')?.disabled).toBe(false)
 await act(async()=>finish('new'));expect(host.textContent).toContain('Comment added.')
 mocks.submit.mockRejectedValueOnce(new Error('Try again'));const second=host.querySelector<HTMLTextAreaElement>('[aria-label="Comment for line 2"]')!
 await act(async()=>{second.closest('.MuiCard-root')!.querySelector<HTMLButtonElement>('button')!.click()})
 expect(second.value).toBe('Second draft');expect(host.textContent).toContain('Try again')
 mocks.submit.mockResolvedValueOnce('retry');await act(async()=>{second.closest('.MuiCard-root')!.querySelector<HTMLButtonElement>('button')!.click()})
 expect(second.value).toBe('');expect(host.textContent).not.toContain('Try again')
})
it('ignores late comment completions after changing chapter scope',async()=>{
 let finish!:(value:unknown)=>void;mocks.submit.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve}))
 await act(async()=>root.render(<ReviewerWorkspace/>));await select(0,'Reader');await select(1,'Chapter 3 — Arrival')
 await comment(1,'Old chapter comment');await button('Comment');await select(0,'Choose…')
 await act(async()=>finish('old-chapter'))
 expect(host.textContent).not.toContain('Comment added.');expect(host.textContent).not.toContain('Old chapter comment')
})
it('lets Admin copy exact saved passages, all chapter corrections and selections across pages with brief feedback',async()=>{
 const records=[
  {id:'one',author_id:'editor-one',parent_id:'book',target_id:'chapter',line_index:0,original_arabic:'Original saved passage',comment:'First correction',status:'pending',created_at:'2026-10-03T10:00:00Z',admin_response:null},
  {id:'two',author_id:'editor-two',parent_id:'book',target_id:'chapter',line_index:0,original_arabic:'Original saved passage',comment:'Second correction',status:'accepted',created_at:'2026-10-03T10:01:00Z',admin_response:null},
  {id:'three',author_id:'editor-two',parent_id:'book',target_id:'chapter',line_index:25,original_arabic:'Later passage',comment:'Later correction',status:'rejected',created_at:'2026-10-03T10:02:00Z',admin_response:null},
 ]
 mocks.adminComments.mockImplementation(async(_book:string,_chapter:string,ids?:string[])=>ids?records.filter(record=>ids.includes(record.id)):[...records].reverse())
 mocks.source.mockResolvedValue({location:'Reader',parent:'book',document:Array.from({length:26},()=>({tokens:[{arabic:'Current source wording'}],translation:'Hello'}))})
 await act(async()=>root.render(<ReviewerWorkspace admin/>));await select(0,'Reader');await select(1,'Chapter 3 — Arrival')
 expect(host.textContent).toContain('First correction');expect(host.textContent).toContain('Second correction');expect(host.textContent).toContain('3 comments across all chapter pages')
 expect(host.querySelectorAll('[type="checkbox"]')).toHaveLength(0)
 vi.mocked(window.scrollTo).mockClear();vi.useFakeTimers()
 const copy=host.querySelector<HTMLButtonElement>('button[aria-label="Copy correction"]')!
 expect(copy.disabled).toBe(false)
 await act(async()=>{copy.click();await Promise.resolve();await Promise.resolve()})
 expect(mocks.clipboard).toHaveBeenLastCalledWith('Original:\nOriginal saved passage\n\nSuggestion:\nSecond correction')
 expect(host.querySelector('[aria-label="Copied correction"]')).not.toBeNull()
 await act(async()=>vi.advanceTimersByTime(1801));expect(host.querySelector('[aria-label="Copied correction"]')).toBeNull()
 vi.useRealTimers()
 await button('Copy All Corrections')
 const all=mocks.clipboard.mock.lastCall![0] as string
 expect(all).toContain('### Correction 3');expect(all.indexOf('First correction')).toBeLessThan(all.indexOf('Second correction'));expect(all.indexOf('Second correction')).toBeLessThan(all.indexOf('Later correction'))
 expect(all.match(/Original saved passage/g)).toHaveLength(2);expect(all).not.toContain('editor-one');expect(all).not.toContain('Current source wording')
 expect(window.scrollTo).not.toHaveBeenCalled();expect(mocks.source).toHaveBeenCalledTimes(1)
 await button('Select corrections')
 await act(async()=>host.querySelector<HTMLInputElement>('[type="checkbox"]')!.click())
 await button('Next');await act(async()=>host.querySelector<HTMLInputElement>('[type="checkbox"]')!.click())
 await button('Copy Selected (2)')
 const selected=mocks.clipboard.mock.lastCall![0] as string
 expect(selected).toContain('Second correction');expect(selected).toContain('Later correction');expect(selected).not.toContain('First correction')
 expect(mocks.adminComments).toHaveBeenLastCalledWith('book','chapter',['two','three']);expect(mocks.submit).not.toHaveBeenCalled()
})
it('keeps Editor comments visible without exposing individual, bulk or selection collection controls',async()=>{
 mocks.comments.mockResolvedValue([{id:'own',line_index:0,comment:'My feedback',status:'pending',created_at:'2026-10-03T10:00:00Z',admin_response:null}])
 await act(async()=>root.render(<ReviewerWorkspace/>));await select(0,'Reader');await select(1,'Chapter 3 — Arrival')
 expect(host.textContent).toContain('My feedback');expect(host.querySelector('[aria-label="Copy correction"]')).toBeNull();expect(host.textContent).not.toContain('Copy All Corrections');expect(host.textContent).not.toContain('Select corrections')
 expect(mocks.adminComments).not.toHaveBeenCalled()
})
it('retains Admin copy access in My Suggestions while keeping the list in its existing own-record mode',async()=>{
 mocks.list.mockResolvedValue({suggestions:[{id:'own',author_id:'admin',content_type:'book',parent_id:'book',target_id:'chapter',line_index:0,location:'Reader',original_arabic:'Original',original_english:'Hello',comment:'Own feedback',reason:'',status:'pending',created_at:'2026-10-03T10:00:00Z'}],total:1})
 await act(async()=>root.render(<ReviewerWorkspace admin/>));await button('My Suggestions')
 expect(host.querySelector('button[aria-label="Copy correction"]')).not.toBeNull();expect(host.textContent).toContain('Edit / Withdraw');expect(host.textContent).not.toContain('Review / Reply')
 expect(mocks.list).toHaveBeenCalledWith(false,expect.anything(),0)
})
it('rechecks Admin access on copy and leaves the clipboard untouched when backend access is revoked',async()=>{
 mocks.adminComments.mockResolvedValueOnce([{id:'saved',author_id:'editor',parent_id:'book',target_id:'chapter',line_index:0,original_arabic:'Saved original',comment:'Feedback',status:'pending',created_at:'2026-10-03T10:00:00Z',admin_response:null}])
 await act(async()=>root.render(<ReviewerWorkspace admin/>));await select(0,'Reader');await select(1,'Chapter 3 — Arrival')
 mocks.adminComments.mockRejectedValueOnce(new Error('Forbidden'))
 const copy=host.querySelector<HTMLButtonElement>('button[aria-label="Copy correction"]')!
 expect(copy.disabled).toBe(false)
 await act(async()=>{copy.click();await Promise.resolve();await Promise.resolve()})
 expect(host.textContent).toContain('Forbidden');expect(mocks.clipboard).not.toHaveBeenCalled();expect(host.querySelector('[aria-label="Copied correction"]')).toBeNull();expect(host.textContent).toContain('Feedback')
})
it('offers Admin scope/export controls inside Reviewer Workspace and requires selection before querying all suggestions',async()=>{
 await act(async()=>root.render(<ReviewerWorkspace admin/>))
 await button('Manage Suggestions & Exports')
 expect(mocks.list).not.toHaveBeenCalled();expect(host.textContent).toContain('Choose a book or show')
 await select(1,'Reader')
 expect(mocks.list).toHaveBeenCalledWith(true,expect.objectContaining({type:'book',parent:'book'}),0)
 expect(host.textContent).toContain('Export Suggestions · CSV');expect(host.textContent).toContain('Export Suggestions · PDF');expect(host.textContent).toContain('Download Source · JSON')
})
it('shows query failures as errors with retry rather than stale cards or a false empty result',async()=>{
 mocks.list.mockRejectedValueOnce(new Error('Service unavailable'))
 await act(async()=>root.render(<SuggestionsList admin={false}/>))
 expect(host.textContent).toContain('Service unavailable');expect(host.textContent).not.toContain('No suggestions match')
 await button('Retry');expect(host.textContent).toContain('No suggestions match');expect(host.textContent).not.toContain('Service unavailable')
 expect(host.textContent).not.toContain('Download Source')
})
it('keeps chapter selection when switching views and scrolls after each source page renders',async()=>{
 mocks.source.mockResolvedValue({location:'Reader / Arrival',parent:'book',document:Array.from({length:60},(_,index)=>({tokens:[{arabic:`سطر ${index+1}`}],translation:`Line ${index+1}`}))})
 await act(async()=>root.render(<ReviewerWorkspace/>));await select(0,'Reader');await select(1,'Chapter 3 — Arrival')
 expect(host.textContent).toContain('Chapter 3 — Arrival');expect(window.scrollTo).toHaveBeenCalledTimes(1)
 await button('Scroll View');expect(host.querySelector('[aria-label="Chapter list"] button[aria-pressed="true"]')?.textContent).toBe('Chapter 3 — Arrival')
 await comment(1,'Keep this draft');await button('Chapter 3 — Arrival')
 expect(host.querySelector<HTMLTextAreaElement>('[aria-label="Comment for line 1"]')?.value).toBe('Keep this draft');expect(mocks.source).toHaveBeenCalledTimes(1)
 await button('Dropdown View');expect(host.querySelectorAll('[role="combobox"]')[1].textContent).toContain('Chapter 3 — Arrival')
 expect(window.scrollTo).toHaveBeenCalledTimes(1)
 await button('Next');expect(host.textContent).toContain('Line 26');expect(host.textContent).not.toContain('Line 1Comment');expect(window.scrollTo).toHaveBeenCalledTimes(2)
 await button('Previous');expect(host.textContent).toContain('Page 1');expect(window.scrollTo).toHaveBeenCalledTimes(3)
})
it('allows Admin Accept/Reject with immediate status updates and blocks duplicate mutations',async()=>{
 const suggestion={id:'suggestion',author_id:'admin',content_type:'book',parent_id:'book',target_id:'chapter',line_index:0,location:'Reader / Arrival',unit_label:'Chapter 3 — Arrival',original_block:{tokens:[{arabic:'مرحبا'}]},original_arabic:'مرحبا',original_english:'Hello',suggested_arabic:null,suggested_english:'Greetings',comment:'Natural wording',reason:'Translation',status:'pending',created_at:'2026-10-02',updated_at:'2026-10-02',admin_response:null,reviewed_at:null}
 mocks.list.mockImplementation(async(_admin:boolean,filters:{status:string})=>({suggestions:filters.status===suggestion.status?[suggestion]:[],total:filters.status===suggestion.status?1:0}))
 let finish!:(value:unknown)=>void;mocks.review.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve}))
 await act(async()=>root.render(<SuggestionsList admin/>));await button('Review / Reply')
 const accept=[...document.querySelectorAll<HTMLButtonElement>('button')].find(b=>b.textContent==='Accept')!
 expect(accept.disabled).toBe(false);expect(document.body.textContent).not.toContain('Confirm Accept')
 await act(async()=>{accept.click();accept.click()});expect(mocks.review).toHaveBeenCalledTimes(1)
 suggestion.status='accepted';await act(async()=>finish({ok:true}));expect(host.textContent).toContain('Suggestion accepted.')
 await button('accepted');expect(host.textContent).toContain('Chapter 3 — Arrival');expect(host.textContent).toContain('accepted')
 suggestion.status='pending';await button('pending');await button('Review / Reply');mocks.review.mockImplementationOnce(async()=>{suggestion.status='rejected';return{ok:true}})
 await button('Reject');expect(mocks.review).toHaveBeenLastCalledWith('suggestion','reject','',null);expect(host.textContent).toContain('Suggestion rejected.')
 await button('rejected');expect(host.textContent).toContain('Chapter 3 — Arrival')
})

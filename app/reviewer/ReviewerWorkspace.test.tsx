import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const mocks=vi.hoisted(()=>({catalogue:vi.fn(),source:vi.fn(),submit:vi.fn(),comments:vi.fn(),list:vi.fn(),edit:vi.fn(),review:vi.fn()}))
vi.mock('@/app/actions/reviews',()=>({reviewCatalogue:mocks.catalogue,loadReviewSource:mocks.source,submitSuggestion:mocks.submit,loadReviewerComments:mocks.comments,listSuggestions:mocks.list,editSuggestion:mocks.edit,reviewSuggestion:mocks.review}))
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
})
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.clearAllMocks();vi.restoreAllMocks()})
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

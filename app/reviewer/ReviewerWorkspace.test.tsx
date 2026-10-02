import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const mocks=vi.hoisted(()=>({catalogue:vi.fn(),source:vi.fn(),submit:vi.fn(),list:vi.fn(),edit:vi.fn(),review:vi.fn()}))
vi.mock('@/app/actions/reviews',()=>({reviewCatalogue:mocks.catalogue,loadReviewSource:mocks.source,submitSuggestion:mocks.submit,listSuggestions:mocks.list,editSuggestion:mocks.edit,reviewSuggestion:mocks.review}))
import ReviewerWorkspace from './ReviewerWorkspace'
import SuggestionsList from './SuggestionsList'
let host:HTMLDivElement,root:Root
beforeEach(()=>{
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});host=document.createElement('div');document.body.appendChild(host);root=createRoot(host)
 mocks.catalogue.mockImplementation(async(_type:string,parent?:string)=>parent?[{id:'chapter',title:'Chapter 03'}]:[{id:'book',title:'Reader'}])
 mocks.source.mockResolvedValue({location:'Reader / Chapter 03',parent:'book',document:[{tokens:[{arabic:'مرحبا'}],translation:'Hello'}]})
 mocks.list.mockResolvedValue({suggestions:[],total:0});mocks.submit.mockResolvedValue('suggestion');mocks.edit.mockResolvedValue(undefined)
})
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.clearAllMocks()})
async function select(index:number,title:string){
 await act(async()=>{host.querySelectorAll('[role="combobox"]')[index].dispatchEvent(new MouseEvent('mousedown',{bubbles:true}))})
 await act(async()=>{[...document.querySelectorAll<HTMLElement>('[role="option"]')].find(o=>o.textContent===title)!.click()})
}
async function button(text:string){await act(async()=>{[...document.querySelectorAll<HTMLButtonElement>('button')].find(b=>b.textContent===text)!.click()})}
it('keeps the Editor review form working, submits the exact source snapshot and clears it when scope changes',async()=>{
 await act(async()=>root.render(<ReviewerWorkspace/>));expect(host.textContent).not.toContain('Manage Suggestions & Exports')
 await select(0,'Reader');await select(1,'Chapter 03')
 expect(host.textContent).toContain('مرحبا');await button('Comment / Suggest Edit')
 const textarea=document.querySelector<HTMLTextAreaElement>('textarea')!
 await act(async()=>{Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value')!.set!.call(textarea,'Review this greeting');textarea.dispatchEvent(new Event('input',{bubbles:true}))})
 await button('Submit suggestion')
 expect(mocks.submit).toHaveBeenCalledWith('book','chapter',0,[{tokens:[{arabic:'مرحبا'}],translation:'Hello'}],expect.objectContaining({comment:'Review this greeting'}))
 expect(host.textContent).toContain('Suggestion submitted')
 await button('Comment / Suggest Edit')
 await button('Cancel')
 await select(0,'Choose…');await act(async()=>{await new Promise(resolve=>setTimeout(resolve,250))});expect(document.querySelector('[role="dialog"]')).toBeNull();expect(host.textContent).not.toContain('مرحبا')
})
it('offers Admin scope/export controls inside Reviewer Workspace and requires selection before querying all suggestions',async()=>{
 await act(async()=>root.render(<ReviewerWorkspace admin actorId="admin"/>))
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

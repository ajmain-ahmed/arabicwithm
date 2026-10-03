import React,{act} from 'react'
import {createRoot,type Root} from 'react-dom/client'
import {beforeEach,afterEach,it,expect,vi} from 'vitest'
const mocks=vi.hoisted(()=>({search:vi.fn()}))
vi.mock('@/app/actions/transcripts',()=>({searchTranscriptWord:mocks.search}))
vi.mock('next/link',()=>({default:({href,children,...props}:{href:string;children:React.ReactNode})=><a href={href} {...props}>{children}</a>}))
import TranscriptSearch from './TranscriptSearch'
let host:HTMLDivElement,root:Root
beforeEach(()=>{vi.resetAllMocks();Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});host=document.createElement('div');document.body.appendChild(host);root=createRoot(host)})
afterEach(async()=>{await act(async()=>root.unmount());host.remove()})
async function submit(){await act(async()=>root.render(<TranscriptSearch/>));const input=host.querySelector('input')!;await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,'test');input.dispatchEvent(new Event('input',{bubbles:true}))});await act(async()=>{host.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))})}
it('shows stored English/match data and links to fractional source timestamp',async()=>{mocks.search.mockResolvedValue([{segment_id:99,transcript_id:'11111111-1111-4111-8111-111111111111',youtube_id:'Dgj9fQYbCZY',title:'Stored video',channel:'Channel',thumbnail:'',start_seconds:300.18,end_seconds:305,original_text:'match in source',english_text:'Stored English',matched_surfaces:['match'],match_type:'exact',match_rank:0}]);await submit();expect(host.textContent).toContain('Stored English');expect(host.querySelector('mark')?.textContent).toBe('match');expect(host.querySelector('a[href*="?t="]')?.getAttribute('href')).toBe('/transcripts/11111111-1111-4111-8111-111111111111?t=300.18')})
it('shows a truthful empty state',async()=>{mocks.search.mockResolvedValue([]);await submit();expect(host.textContent).toContain('No matching occurrences.')})
it('shows search errors without inventing results',async()=>{mocks.search.mockRejectedValue(new Error('Network unavailable'));await submit();expect(host.textContent).toContain('Network unavailable');expect(host.querySelector('a[href*="?t="]')).toBeNull()})

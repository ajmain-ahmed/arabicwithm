import {act} from 'react'
import {createRoot,type Root} from 'react-dom/client'
import {beforeEach,afterEach,expect,it,vi} from 'vitest'
const mocks=vi.hoisted(()=>({params:{chapterId:'a',episodeId:'a'},chapter:vi.fn(),episode:vi.fn(),hans:vi.fn(),phrases:vi.fn(),push:vi.fn()}))
vi.mock('next/navigation',()=>({useParams:()=>mocks.params,useRouter:()=>({push:mocks.push})}))
vi.mock('next/dynamic',()=>({default:()=>()=>null}))
vi.mock('@/app/actions/admin',()=>({fetchChapterForAdmin:mocks.chapter,fetchEpisodeForAdmin:mocks.episode,fetchHansWehrEntries:mocks.hans,fetchPhrases:mocks.phrases,updateChapterContent:vi.fn(),updateEpisodeTranscript:vi.fn(),updateHansWehrDefinition:vi.fn(),updatePhrase:vi.fn()}))
vi.mock('@/app/actions/cartoons',()=>({fetchShowsForEpisodeEdit:vi.fn()}))
vi.mock('./components/TokenHeadwordDialog',()=>({default:()=>null}))
import ChapterPage from './books/[chapterId]/page'
import EpisodePage from './episodes/[episodeId]/page'
let host:HTMLDivElement,root:Root
beforeEach(()=>{Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});host=document.createElement('div');root=createRoot(host);mocks.params={chapterId:'a',episodeId:'a'};mocks.hans.mockResolvedValue([]);mocks.phrases.mockResolvedValue([])})
afterEach(async()=>{await act(async()=>root.unmount());vi.clearAllMocks()})
it.each(['chapter','episode'] as const)('discards a late %s response after navigating to a new editor URL',async type=>{
 const fetch=type==='chapter'?mocks.chapter:mocks.episode,Page=type==='chapter'?ChapterPage:EpisodePage
 let finish!:(value:unknown)=>void;fetch.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve})).mockResolvedValueOnce({id:'b',title:'New content B',slug:'b',content:[],transcript:[]})
 await act(async()=>root.render(<Page/>));expect(fetch).toHaveBeenCalledWith('a')
 mocks.params={chapterId:'b',episodeId:'b'};await act(async()=>root.render(<Page/>))
 expect(fetch).toHaveBeenCalledWith('b');expect(host.textContent).toContain('New content B')
 await act(async()=>finish({id:'a',title:'Stale content A',slug:'a',content:[],transcript:[]}))
 expect(host.textContent).toContain('New content B');expect(host.textContent).not.toContain('Stale content A')
})

import {expect,it,vi} from 'vitest'
import {renderToStaticMarkup} from 'react-dom/server'
const mocks=vi.hoisted(()=>({audio:vi.fn()}))
vi.mock('@/app/actions/books',()=>({fetchBooksForPublic:async()=>[{id:'book'}]}))
vi.mock('@/app/actions/audiobooks',()=>({fetchBookIdsWithPublishedAudio:mocks.audio}))
vi.mock('./BooksLibrary',()=>({default:()=> <p>Readable book catalogue</p>}))
import BooksPage from './page'
it('keeps reading available when optional audiobook metadata fails',async()=>{
 mocks.audio.mockRejectedValue(new Error('Backend unavailable'));const log=vi.spyOn(console,'error').mockImplementation(()=>{})
 try{const html=renderToStaticMarkup(await BooksPage());expect(html).toContain('Readable book catalogue');expect(html).toContain('Reading is still available.');expect(log).toHaveBeenCalled()}
 finally{log.mockRestore()}
})

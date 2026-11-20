// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
const reads=vi.hoisted(()=>({shows:vi.fn(),episodes:vi.fn()}))
vi.mock('@/app/actions/cartoons',()=>({fetchShowsForPublic:reads.shows,fetchAllEpisodesForPublic:reads.episodes}))
vi.mock('./CartoonsPage',()=>({default:()=>null}))
vi.mock('@/app/components/PageLoading',()=>({CataloguePageLoading:()=>null}))
import Page from './page'

beforeEach(()=>{
 reads.shows.mockResolvedValue([{id:'show',slug:'show',title:'A Show',level:'A1',category:'Cartoons',tags:[]}])
 reads.episodes.mockResolvedValue([{id:'episode',showId:'show',slug:'episode',title:'An Episode',level:'A1',tags:[]}])
})
async function catalogue(params:Record<string,string>){
 const boundary=Page({searchParams:Promise.resolve(params)})
 return boundary.props.children.type(boundary.props.children.props)
}
it('treats an explicit All Categories bookmark as an unfiltered catalogue',async()=>{
 const result=await catalogue({category:'All Categories'})
 expect(result.props.filters).toEqual({category:'',level:''})
 expect(result.props.totalShows).toBe(1);expect(result.props.totalEpisodes).toBe(1)
})
it('retains supported filters and ignores obsolete filter values',async()=>{
 expect((await catalogue({category:'Unknown',level:'obsolete'})).props.totalShows).toBe(1)
 expect((await catalogue({category:'Cartoons',level:'A1',view:'shows'})).props.shows).toHaveLength(1)
})

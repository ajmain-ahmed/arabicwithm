import {expect,it} from 'vitest'
import {featuredPool,selectFeaturedShows} from './featuredShows'
import type {ShowMeta} from './cartoons'
const slugs=['arc','bb','mov','cotp','dbz','hxh','misc']
const shows=slugs.map(slug=>({id:slug,slug,title:slug.toUpperCase(),cover:'/cover',level:'B1',episodeCount:1} satisfies ShowMeta))
const images=slugs.map((slug,i)=>({name:slug.toUpperCase()+['.webp','.avif','.jpg'][i%3],url:'https://storage.test/'+slug}))
it('joins supplied filenames by canonical slug and derives each image and route from the same record',()=>{
 const {pairs,orphans}=featuredPool(shows,images)
 expect(pairs).toHaveLength(7);expect(orphans).toEqual([])
 for(const pair of pairs)expect(pair.featuredImage).toBe('https://storage.test/'+pair.show.slug)
 expect(pairs.map(p=>p.show.slug)).toEqual([...slugs].sort())
})
it('ignores unmatched images, non-images, missing files, and chooses duplicate formats consistently',()=>{
 const result=featuredPool(shows,[...images.slice(0,2),{name:'ORPHAN.png',url:'orphan'},{name:'arc.jpg',url:'alternate'},{name:'folder',url:'folder'},{name:'arc.txt',url:'text'}])
 expect(result.pairs.map(p=>p.show.slug)).toEqual(['arc','bb']);expect(result.orphans).toEqual(['ORPHAN.png'])
 expect(featuredPool(shows,[...images].reverse()).pairs).toEqual(featuredPool(shows,images).pairs)
 expect(featuredPool(shows,images).pairs).toHaveLength(7)
})
for(const count of [0,1,2,3,4,7])it(`selects at most three unique eligible Shows from ${count}`,()=>{
 const {pairs}=featuredPool(shows.slice(0,count),images)
 const selected=selectFeaturedShows(pairs,new Date('2026-11-06T12:00:00Z'))
 expect(selected).toHaveLength(Math.min(count,3));expect(new Set(selected.map(p=>p.show.id)).size).toBe(selected.length)
})
it('stays stable for two London days across requests and input order, then can rotate',()=>{
 const {pairs}=featuredPool(shows,images)
 const day=Math.floor(Date.parse('2026-11-06T00:00:00Z')/86400000),start=day-day%2
 const now=(offset:number)=>new Date((start+offset)*86400000+12*3600000)
 const first=selectFeaturedShows(pairs,now(0))
 for(const offset of [0,.4,1])expect(selectFeaturedShows([...pairs].reverse(),now(offset))).toEqual(first)
 expect(selectFeaturedShows(pairs,now(2))).not.toEqual(first)
})
it('uses London calendar days through the DST boundary',()=>{
 const {pairs}=featuredPool(shows,images)
 expect(selectFeaturedShows(pairs,new Date('2026-10-24T23:30:00Z'))).toEqual(selectFeaturedShows(pairs,new Date('2026-10-25T12:00:00Z')))
})
it('excludes a removed record and retains replacement artwork and framing',()=>{
 const before=featuredPool(shows,images).pairs,selected=selectFeaturedShows(before)
 expect(selectFeaturedShows(before.filter(p=>p.show.id!==selected[0].show.id)).some(p=>p.show.id===selected[0].show.id)).toBe(false)
 const updated=featuredPool(shows,[{name:'arc.webp',url:'replacement?v=2',position:{x:23,y:45}}]).pairs
 expect(selectFeaturedShows(updated)[0]).toMatchObject({featuredImage:'replacement?v=2',featuredPosition:{x:23,y:45}})
})

it('carries saved framing with the same Show/image and excludes ambiguous slugs',()=>{
 const result=featuredPool(shows,[{name:'ARC.webp',url:'arc',position:{x:45,y:22}},{name:'BB.webp',url:'bb',eligible:false}])
 expect(result.pairs).toHaveLength(1);expect(result.pairs[0]).toMatchObject({show:{slug:'arc'},featuredImage:'arc',featuredPosition:{x:45,y:22}})
 expect(featuredPool([...shows,{...shows[0],id:'other',slug:'ARC'}],images).pairs.some(pair=>pair.show.slug==='arc')).toBe(false)
})

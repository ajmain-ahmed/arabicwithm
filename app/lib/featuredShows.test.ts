import {expect,it} from 'vitest'
import {featuredPool,selectFeaturedShow} from './featuredShows'
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
it('stays stable for three London days, advances, wraps, and handles an empty pool',()=>{
 const {pairs}=featuredPool(shows,images)
 // 2026-10-27 is a UTC-epoch-aligned three-day boundary.
 const day=Math.floor(Date.parse('2026-10-27T00:00:00Z')/86400000),start=day-day%3
 const now=(offset:number)=>new Date((start+offset)*86400000+12*3600000)
 const first=selectFeaturedShow(pairs,now(0))!
 for(const offset of [0,.4,1,2])expect(selectFeaturedShow(pairs,now(offset))).toBe(first)
 expect(selectFeaturedShow(pairs,now(3))).not.toBe(first)
 expect(selectFeaturedShow(pairs,now(21))).toBe(first)
 expect(selectFeaturedShow([],now(0))).toBeNull()
})

it('carries saved framing with the same Show/image and excludes ambiguous slugs',()=>{
 const result=featuredPool(shows,[{name:'ARC.webp',url:'arc',position:{x:45,y:22}},{name:'BB.webp',url:'bb',eligible:false}])
 expect(result.pairs).toHaveLength(1);expect(result.pairs[0]).toMatchObject({show:{slug:'arc'},featuredImage:'arc',featuredPosition:{x:45,y:22}})
 expect(featuredPool([...shows,{...shows[0],id:'other',slug:'ARC'}],images).pairs.some(pair=>pair.show.slug==='arc')).toBe(false)
})

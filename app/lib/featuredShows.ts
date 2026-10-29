import type {ShowMeta} from '@/app/lib/cartoons'
import {platformDate} from '@/app/lib/entitlements'

export interface FeaturedImage {name:string;url:string}
export interface FeaturedPair {show:ShowMeta;featuredImage:string}
/** Storage order and filename case must not change the selected record. */
export function featuredPool(shows:ShowMeta[],images:FeaturedImage[]){
 const bySlug=new Map(shows.map(show=>[show.slug.toLowerCase(),show]))
 const pairs=new Map<string,FeaturedPair>(),orphans:string[]=[]
 for(const image of [...images].sort((a,b)=>a.name.localeCompare(b.name,'en'))){
  const match=/^([^/]+)\.(avif|webp|jpe?g|png|gif)$/i.exec(image.name)
  if(!match)continue
  const show=bySlug.get(match[1].toLowerCase())
  if(!show){orphans.push(image.name);continue}
  if(!pairs.has(show.slug))pairs.set(show.slug,{show,featuredImage:image.url})
 }
 return {pairs:[...pairs.values()].sort((a,b)=>a.show.slug.localeCompare(b.show.slug,'en')),orphans}
}
/** Three London calendar days per window, independent of DST hour changes. */
export function selectFeaturedShow(pairs:FeaturedPair[],now=new Date()):FeaturedPair|null{
 if(!pairs.length)return null
 const day=Math.floor(Date.parse(platformDate(now)+'T00:00:00Z')/86400000)
 return pairs[((Math.floor(day/3)%pairs.length)+pairs.length)%pairs.length]
}

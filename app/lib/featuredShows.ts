import { featuredFileSlug } from '@/app/lib/featuredFile'
import {DEFAULT_FEATURED_POSITION,type FeaturedPosition} from '@/app/lib/featuredFraming'
import type {ShowMeta} from '@/app/lib/cartoons'
import {seededShuffled} from '@/app/lib/explore'
import {homeCalendarDay} from '@/app/lib/homeRotation'

export interface FeaturedImage {name:string;url:string;position?:FeaturedPosition;eligible?:boolean}
export interface FeaturedPair {show:ShowMeta;featuredImage:string;featuredPosition:FeaturedPosition}
/** Storage order and filename case must not change the selected record. */
export function featuredPool(shows:ShowMeta[],images:FeaturedImage[]){
 const bySlug=new Map(shows.filter(show=>shows.filter(other=>other.slug.toLowerCase()===show.slug.toLowerCase()).length===1).map(show=>[show.slug.toLowerCase(),show]))
 const pairs=new Map<string,FeaturedPair>(),orphans:string[]=[]
 for(const image of [...images].sort((a,b)=>a.name.localeCompare(b.name,'en'))){
  const match=/^([^/]+)\.(avif|webp|jpe?g|png|gif)$/i.exec(image.name)
  if(!match || image.eligible===false)continue
  const show=bySlug.get(featuredFileSlug(image.name).toLowerCase())
  if(!show){orphans.push(image.name);continue}
  if(!pairs.has(show.slug))pairs.set(show.slug,{show,featuredImage:image.url,featuredPosition:image.position??DEFAULT_FEATURED_POSITION})
 }
 return {pairs:[...pairs.values()].sort((a,b)=>a.show.slug.localeCompare(b.show.slug,'en')),orphans}
}
/** Three London calendar days per epoch-aligned window, including DST changes. */
export function selectFeaturedShows<T extends {show:{id:string;slug:string}}>(pairs:readonly T[],now=new Date()):T[]{
 const ordered=[...new Map(pairs.map(pair => [pair.show.id, pair])).values()].sort((a,b)=>a.show.id.localeCompare(b.show.id,'en'))
 const cycle=seededShuffled(ordered,'homepage-featured-cycle-v1')
 if(!cycle.length)return []
 const window=Math.floor(homeCalendarDay(now)/3)
 const start=((window%cycle.length)+cycle.length)%cycle.length
 return Array.from({length:Math.min(cycle.length,3)},(_,index)=>cycle[(start+index)%cycle.length])
}

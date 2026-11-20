import { featuredFileSlug } from '@/app/lib/featuredFile'
import 'server-only'
import {withDataDeadline} from '@/app/lib/boundedFetch'
import {unstable_cache} from 'next/cache'
import {loadFeaturedAssets} from '@/app/lib/featuredStorage'
import {featuredPool,selectFeaturedShows} from '@/app/lib/featuredShows'
import type {ShowMeta} from '@/app/lib/cartoons'

const loadFeaturedImages=unstable_cache(loadFeaturedAssets,['homepage-featured-images-v3'],{revalidate:3600,tags:['homepage-featured']})

export async function fetchHomeFeatured(showsInput:ShowMeta[]|Promise<ShowMeta[]>,now=new Date()){
 try{
  // Artwork and the catalogue are independent. Begin both reads immediately.
  const [shows,assets]=await Promise.all([showsInput,withDataDeadline(4000,loadFeaturedImages)])
  const {pairs,orphans}=featuredPool(shows,assets.map(asset=>{
   const show=shows.find(show=>show.slug.toLowerCase()===featuredFileSlug(asset.name).toLowerCase())
   const config=asset.configs.find(row=>row.show_id===show?.id)
   return {...asset,eligible:(!config||config.storage_path===asset.path)&&(!asset.configShowId||asset.configShowId===show?.id)}
  }))
  if(orphans.length)console.warn('[featured artwork] No matching show:',orphans.join(', '))
  return selectFeaturedShows(pairs,now)
 }catch(error){console.warn('[featured artwork] Keeping the Featured presentation without curated artwork.',error instanceof Error?error.message:'Storage unavailable');return []}
}

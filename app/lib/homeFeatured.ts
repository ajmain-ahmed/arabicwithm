import 'server-only'
import {withDataDeadline} from '@/app/lib/boundedFetch'
import {unstable_cache} from 'next/cache'
import {loadFeaturedAssets} from '@/app/lib/featuredStorage'
import {featuredPool,selectFeaturedShow} from '@/app/lib/featuredShows'
import type {ShowMeta} from '@/app/lib/cartoons'

const loadFeaturedImages=unstable_cache(loadFeaturedAssets,['homepage-featured-images-v2'],{revalidate:60,tags:['homepage-featured']})

export async function fetchHomeFeatured(shows:ShowMeta[],now=new Date()){
 try{
  const {pairs,orphans}=featuredPool(shows,(await withDataDeadline(1200,loadFeaturedImages)).map(asset=>{
   const show=shows.find(show=>show.slug.toLowerCase()===asset.name.replace(/\.[^.]+$/,'').toLowerCase())
   const config=asset.configs.find(row=>row.show_id===show?.id)
   return {...asset,eligible:(!config||config.storage_path===asset.path)&&(!asset.configShowId||asset.configShowId===show?.id)}
  }))
  if(orphans.length)console.warn('[featured artwork] No matching show:',orphans.join(', '))
  return selectFeaturedShow(pairs,now)
 }catch(error){console.warn('[featured artwork] Using existing homepage fallback.',error instanceof Error?error.message:'Storage unavailable');return null}
}

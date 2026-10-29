import 'server-only'
import {withDataDeadline} from '@/app/lib/boundedFetch'
import {unstable_cache} from 'next/cache'
import {serviceClient} from '@/app/lib/supabase'
import {featuredPool,selectFeaturedShow,type FeaturedImage} from '@/app/lib/featuredShows'
import type {ShowMeta} from '@/app/lib/cartoons'

const loadFeaturedImages=unstable_cache(async()=>{
 const storage=serviceClient.storage.from('covers'),images:FeaturedImage[]=[]
 for(let offset=0;;offset+=100){
  const {data,error}=await storage.list('featured',{limit:100,offset,sortBy:{column:'name',order:'asc'}})
  if(error)throw new Error('Unable to list featured artwork.')
  for(const file of data??[]){if(file.id)images.push({name:file.name,url:storage.getPublicUrl(`featured/${file.name}`).data.publicUrl})}
  if((data?.length??0)<100)break
 }
 return images
},['homepage-featured-images-v1'],{revalidate:60})

export async function fetchHomeFeatured(shows:ShowMeta[],now=new Date()){
 try{
  const {pairs,orphans}=featuredPool(shows,await withDataDeadline(1200,loadFeaturedImages))
  if(orphans.length)console.warn('[featured artwork] No matching show:',orphans.join(', '))
  return selectFeaturedShow(pairs,now)
 }catch(error){console.warn('[featured artwork] Using existing homepage fallback.',error instanceof Error?error.message:'Storage unavailable');return null}
}

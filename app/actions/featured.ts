"use server"

import {guardAdmin} from '@/app/actions/auth'
import {serviceClient} from '@/app/lib/supabase'
import {FEATURED_FILE, listFeaturedFiles, loadFeaturedAssets} from '@/app/lib/featuredStorage'
import {revalidatePath,updateTag} from 'next/cache'

export async function fetchFeaturedForAdmin() {
 await guardAdmin()
 const [assets,{data:shows,error}]=await Promise.all([loadFeaturedAssets(),serviceClient.from('shows').select('id,slug,title').order('title')])
 if(error)throw new Error('Unable to load Shows.')
 return {shows:shows??[],assets:assets.map(({configs,...asset})=>{
  const matches=(shows??[]).filter(show=>show.slug.toLowerCase()===asset.name.replace(/\.[^.]+$/,'').toLowerCase())
  const show=matches.length===1?matches[0]:null
  const config=configs.find(row=>row.show_id===show?.id)
  return {...asset,show,status:matches.length>1?'Slug collision':!show?'No matching show':config&&config.storage_path!==asset.path?'Alternate image':'Featured image'}
 })}
}
function invalidateFeatured() { updateTag('homepage-featured');revalidatePath('/');revalidatePath('/admin/featured') }
async function selectedShow(id:string) {
 const {data,error}=await serviceClient.from('shows').select('id,slug,title')
 if(error)throw new Error('Unable to verify Show.')
 const show=data?.find(show=>show.id===id)
 if(!show||/[\\/]/.test(show.slug)||!show.slug||['.','..'].includes(show.slug))throw new Error('Select a valid Show.')
 if(data!.filter(other=>other.slug.toLowerCase()===show.slug.toLowerCase()).length!==1)throw new Error('Show slug collision. Fix the duplicate Shows before saving.')
 return show
}
async function imageFormat(file:Blob) {
 if(!file.size||file.size>5*1024*1024)throw new Error('Choose an image up to 5 MB.')
 const header=new Uint8Array(await file.slice(0,32).arrayBuffer()),text=new TextDecoder('ascii').decode(header)
 if(text.startsWith('RIFF')&&text.slice(8,12)==='WEBP')return {extension:'webp',type:'image/webp'}
 if(header[0]===137&&text.slice(1,4)==='PNG'&&header[4]===13&&header[5]===10&&header[6]===26&&header[7]===10)return {extension:'png',type:'image/png'}
 if(header[0]===255&&header[1]===216&&header[2]===255)return {extension:'jpg',type:'image/jpeg'}
 if(text.slice(4,8)==='ftyp'&&/avif|avis/.test(text.slice(8)))return {extension:'avif',type:'image/avif'}
 throw new Error('Use a WebP, AVIF, JPEG or PNG image.')
}
export async function saveFeaturedForAdmin(form:FormData) {
 await guardAdmin()
 const id=form.get('showId'),rawX=form.get('x'),rawY=form.get('y')
 if(typeof id!=='string'||typeof rawX!=='string'||typeof rawY!=='string'||!rawX.trim()||!rawY.trim())throw new Error('Invalid Featured settings.')
 const x=Number(rawX),y=Number(rawY)
 if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||x>100||y<0||y>100)throw new Error('Position must be between 0 and 100.')
 const show=await selectedShow(id),files=await listFeaturedFiles(),file=form.get('file')
 const existing=files.filter(file=>FEATURED_FILE.exec(file.name)?.[1].toLowerCase()===show.slug.toLowerCase())
 let path:string
 if(file instanceof Blob){
  if(existing.length&&form.get('replace')!=='true')throw new Error('Use Replace for an existing Featured image.')
  const format=await imageFormat(file)
  path=`featured/${show.slug}.${format.extension}`
  const {error}=await serviceClient.storage.from('covers').upload(path,file,{contentType:format.type,upsert:true,cacheControl:'60'})
  if(error)throw new Error('Featured upload failed. Please try again.')
 }else{
  const name=form.get('name')
  if(typeof name!=='string'||!existing.some(file=>file.name===name))throw new Error('Featured image no longer exists. Reload and try again.')
  path=`featured/${name}`
 }
 const {error}=await serviceClient.from('featured_show_config').upsert({show_id:show.id,storage_path:path,position_x:x,position_y:y,updated_at:new Date().toISOString()},{onConflict:'show_id'})
 if(error){invalidateFeatured();throw new Error('Unable to save Featured positioning. Please try again.')}
 // The saved canonical path wins immediately; remove obsolete formats only
 // after config is durable so a failed cleanup cannot select the wrong image.
 const old=existing.map(file=>`featured/${file.name}`).filter(old=>old!==path)
 if(old.length){const {error:cleanup}=await serviceClient.storage.from('covers').remove(old);if(cleanup){invalidateFeatured();throw new Error('Featured image saved, but alternate files could not be removed. Reload to review.')}}
 invalidateFeatured()
}
export async function deleteFeaturedForAdmin(name:string) {
 await guardAdmin()
 if(typeof name!=='string'||!FEATURED_FILE.test(name))throw new Error('Invalid Featured image.')
 const path=`featured/${name}`
 const {error}=await serviceClient.storage.from('covers').remove([path])
 if(error)throw new Error('Unable to delete Featured image.')
 const {error:configError}=await serviceClient.from('featured_show_config').delete().eq('storage_path',path)
 invalidateFeatured()
 if(configError)throw new Error('Image removed, but its saved settings could not be cleared. Please retry.')
}

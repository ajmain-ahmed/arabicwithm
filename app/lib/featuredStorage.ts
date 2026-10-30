import 'server-only'
import {serviceClient} from '@/app/lib/supabase'
import {DEFAULT_FEATURED_POSITION} from '@/app/lib/featuredFraming'

export const FEATURED_FILE = /^([^/\\]+)\.(avif|webp|jpe?g|png|gif)$/i
export async function listFeaturedFiles() {
 const files: {name:string;updated_at?:string|null}[]=[]
 for(let offset=0;;offset+=100){
  const {data,error}=await serviceClient.storage.from('covers').list('featured',{limit:100,offset,sortBy:{column:'name',order:'asc'}})
  if(error)throw new Error('Unable to list featured artwork.')
  for(const file of data??[])if(file.id&&FEATURED_FILE.test(file.name))files.push(file)
  if((data?.length??0)<100)break
 }
 return files
}
export async function loadFeaturedAssets() {
 const [files,{data:configs,error}]=await Promise.all([listFeaturedFiles(),serviceClient.from('featured_show_config').select('*')])
 if(error)throw new Error('Unable to load Featured positioning.')
 return files.map(file=>{
  const path=`featured/${file.name}`,config=configs?.find(row=>row.storage_path===path)
  const version=config?.updated_at??file.updated_at
  const url=serviceClient.storage.from('covers').getPublicUrl(path).data.publicUrl
  return {name:file.name,path,url:`${url}${version?`?v=${encodeURIComponent(version)}`:''}`,
   position:config?{x:config.position_x,y:config.position_y}:DEFAULT_FEATURED_POSITION,
   configShowId:config?.show_id, configs:configs??[]}
 })
}

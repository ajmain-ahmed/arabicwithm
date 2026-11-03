import 'server-only'
import {serviceClient} from '@/app/lib/supabase'
import {isPresetBucket,parsePresetRef,presetImageUrl,presetMime,validPresetPath,type ProfilePreset,type ProfilePresetBucket} from './profilePresets'

const MAX_IMAGE_BYTES=10*1024*1024
export async function verifyProfilePreset(ref:string,bucket?:ProfilePresetBucket){
 const parsed=parsePresetRef(ref,bucket)
 if(!parsed)throw new Error('Choose an available profile preset.')
 const mime=presetMime(parsed.path)
 const {data,error}=await serviceClient.storage.from(parsed.bucket).info(parsed.path)
 if(error||!data?.id||!data.size||data.size>MAX_IMAGE_BYTES||!mime||data.contentType!==mime||('isDeleteMarker' in data&&data.isDeleteMarker))throw new Error('This profile preset is unavailable. Please choose another.')
 return {...parsed,mime,size:data.size,url:presetImageUrl(ref)}
}
/** Traverse folders and pages without exposing folders as selectable assets. */
export async function readProfilePresets(bucket:ProfilePresetBucket):Promise<ProfilePreset[]>{
 if(!isPresetBucket(bucket))throw new Error('Invalid profile collection.')
 const pending=[''],visited=new Set<string>(),result:ProfilePreset[]=[]
 while(pending.length){
  const prefix=pending.shift()!
  if(visited.has(prefix))continue
  visited.add(prefix)
  for(let offset=0;;offset+=100){
   const {data,error}=await serviceClient.storage.from(bucket).list(prefix,{limit:100,offset,sortBy:{column:'name',order:'asc'}})
   if(error||!data)throw new Error('Profile presets could not be loaded. Please try again.')
   for(const object of data){
    if(!object.name||object.name.includes('/')||object.name==='.emptyFolderPlaceholder')continue
    const path=prefix?`${prefix}/${object.name}`:object.name
    if(!validPresetPath(path))continue
    if(!object.id&&!object.metadata){pending.push(path);continue}
    const mime=presetMime(path),size=Number(object.metadata?.size)
    if(!object.id||!mime||object.metadata?.mimetype!==mime||!size||size>MAX_IMAGE_BYTES)continue
    const ref=`${bucket}/${path}`
    result.push({ref,url:presetImageUrl(ref),label:object.name.replace(/\.[^.]+$/,'').replace(/[-_]+/g,' ')})
   }
   if(data.length<100)break
  }
 }
 return result.sort((a,b)=>a.ref.localeCompare(b.ref))
}

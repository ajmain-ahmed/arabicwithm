import {serviceClient} from '@/app/lib/supabase'
import {isPresetBucket,validPresetPath} from '@/app/lib/profilePresets'
import {verifyProfilePreset} from '@/app/lib/profilePresetStorage'
import {rateLimit} from '@/app/lib/rateLimit'

/** Only the two curated collections are readable; never proxy arbitrary URLs/buckets. */
export async function GET(request:Request,{params}:{params:Promise<{bucket:string;path:string[]}>}){
 const {bucket,path}=await params
 if(!isPresetBucket(bucket)||!path.length||path.some(part=>part.includes('/')||!validPresetPath(part)))return new Response(null,{status:404})
 const ip=request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||request.headers.get('x-real-ip')
 if(ip){const limit=rateLimit(`profile-presets:${ip}`,180,60_000);if(!limit.ok)return new Response(null,{status:429,headers:{'Retry-After':String(limit.retryAfterSeconds)}})}
 try{
  const asset=await verifyProfilePreset(`${bucket}/${path.join('/')}`,bucket)
  const {data,error}=await serviceClient.storage.from(bucket).download(asset.path)
  if(error||!data||data.size!==asset.size)return new Response(null,{status:404})
  return new Response(data,{headers:{'Content-Type':asset.mime,'Content-Length':String(data.size),'Cache-Control':'public, max-age=300, s-maxage=300','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"}})
 }catch{return new Response(null,{status:404})}
}

export const PROFILE_PRESET_BUCKETS = ['profile-pictures','profile-banners'] as const
export type ProfilePresetBucket = typeof PROFILE_PRESET_BUCKETS[number]
export interface ProfilePreset {ref:string;url:string;label:string}
const IMAGE_TYPES:Record<string,string>={avif:'image/avif',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif'}
export function isPresetBucket(value:string):value is ProfilePresetBucket{return PROFILE_PRESET_BUCKETS.some(bucket=>bucket===value)}
export function validPresetPath(path:string):boolean{
 return path.length>0&&path.length<=512&&!/[\\%?#:\u0000-\u001f\u007f]/.test(path)&&path.split('/').every(part=>!!part&&part!=='.'&&part!=='..')
}
export function presetMime(path:string):string|undefined{return IMAGE_TYPES[path.split('.').at(-1)?.toLowerCase()??'']}
export function parsePresetRef(ref:string,bucket?:ProfilePresetBucket):{bucket:ProfilePresetBucket;path:string}|null{
 const split=ref.indexOf('/'),kind=ref.slice(0,split),path=ref.slice(split+1)
 return split>0&&isPresetBucket(kind)&&(!bucket||bucket===kind)&&validPresetPath(path)&&presetMime(path)?{bucket:kind,path}:null
}
export function presetImageUrl(ref:string):string{
 const parsed=parsePresetRef(ref)
 if(!parsed)throw new Error('Invalid profile preset.')
 return `/api/profile-presets/${parsed.bucket}/${parsed.path.split('/').map(encodeURIComponent).join('/')}`
}
export function existingProfileImage(value:unknown):string|null{
 if(typeof value!=='string')return null
 if(/^https?:\/\//i.test(value))return value
 if(!value.startsWith('/api/profile-presets/'))return null
 try{
  const ref=value.slice('/api/profile-presets/'.length).split('/').map(decodeURIComponent).join('/')
  return parsePresetRef(ref)&&presetImageUrl(ref)===value?value:null
 }catch{return null}
}
export function presetRefFromUrl(value:string|null):string|undefined{
 if(!value?.startsWith('/api/profile-presets/'))return
 try{const ref=value.slice('/api/profile-presets/'.length).split('/').map(decodeURIComponent).join('/');return parsePresetRef(ref)?ref:undefined}catch{return}
}

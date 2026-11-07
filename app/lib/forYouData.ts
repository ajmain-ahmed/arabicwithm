import {forYouTokens,type ForYouClip,type ForYouSegment} from './forYou'

export const forYouRecord=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value)
const number=(value:unknown)=>typeof value==='number'?value:typeof value==='string'&&value.trim()?Number(value):NaN
export function forYouId(value:unknown):number|null {
 // Reject unsafe IDs rather than rounding a PostgreSQL bigint into another ID.
 const id=typeof value==='bigint'?Number(value):number(value)
 return Number.isSafeInteger(id)&&id>=0?id:null
}
export function normaliseForYouSegment(value:unknown,raw?:unknown):ForYouSegment|null {
 if(!forYouRecord(value))return null
 const id=forYouId(value.id),position=number(value.position),start=number(value.start_seconds),end=number(value.end_seconds)
 if(id===null||!Number.isSafeInteger(position)||position<0||!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start||end>43200||typeof value.original_text!=='string'||!value.original_text.trim())return null
 let tokens=forYouTokens(value.canonical_paragraph,Array.isArray(value.source_tokens)?{tokens:value.source_tokens}:raw)
 if(!tokens.length)tokens=forYouTokens(null,raw)
 if(!tokens.length)return null
 const translation=[value.translation,forYouRecord(value.canonical_paragraph)?value.canonical_paragraph.translation:undefined,forYouRecord(raw)?raw.translation:undefined].find((text):text is string=>typeof text==='string'&&Boolean(text.trim()))
 return {...(translation!==undefined?{translation}:{}),id,position,original_text:value.original_text,english_text:typeof value.english_text==='string'?value.english_text:null,start_seconds:start,end_seconds:end,tokens}
}
export function normaliseForYouClip(value:unknown,raw?:unknown):ForYouClip|null {
 if(!forYouRecord(value)||!forYouRecord(value.video)||!Array.isArray(value.segments)||!value.segments.length)return null
 const video=value.video,start=number(value.clip_start_ms),end=number(value.clip_end_ms)
 if(typeof video.id!=='string'||!/^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/.test(video.id)||typeof video.youtube_id!=='string'||! /^[A-Za-z0-9_-]{11}$/.test(video.youtube_id)||!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start||end>43200000)return null
 const content=forYouRecord(raw)&&Array.isArray(raw.content)?raw.content:[]
 const segments=value.segments.map(segment=>normaliseForYouSegment(segment,forYouRecord(segment)?content[number(segment.position)]:undefined))
 if(segments.some(segment=>!segment||segment.start_seconds*1000<start-1||segment.end_seconds*1000>end+1))return null
 return {video:{id:video.id,youtube_id:video.youtube_id,title:typeof video.title==='string'&&video.title.trim()?video.title:'Arabic video',channel:typeof video.channel==='string'?video.channel:null},clip_start_ms:start,clip_end_ms:end,segments:segments as ForYouSegment[]}
}

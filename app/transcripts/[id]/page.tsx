import {notFound} from 'next/navigation'
import {loadAdminTranscript,loadPublicTranscript} from '@/app/actions/transcripts'
import {getAuthenticatedAccess} from '@/app/actions/auth'
import {transcriptOrigin} from '@/app/lib/transcriptNavigation'
import TranscriptViewer from './TranscriptViewer'
import StructuredData from '@/app/components/StructuredData'
import { breadcrumbJsonLd } from '@/app/lib/seo'
import { getYouTubeThumbnailUrl } from '@/app/lib/cartoons'

export async function generateMetadata({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{from?:string}>}){
 const {id}=await params;const {from}=await searchParams
 if(from==='admin')return {title:'Transcript Administration',robots:{index:false,follow:false}}
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return {title:'Transcript Not Found'}
 const data=await loadPublicTranscript(id,-1,0)
 if(!data)return {title:'Transcript Not Found'}
 const path=`/transcripts/${id}`,description=`Read ${data.video.title} with an interactive transcript and translations${data.video.channel?` from ${data.video.channel}`:''}.`
 const image=data.video.thumbnail||getYouTubeThumbnailUrl(data.video.youtube_id)
 return {title:`${data.video.title} | Arabic Transcript`,description,alternates:{canonical:path},openGraph:{type:'article',title:data.video.title,description,url:path,images:[{url:image,alt:`${data.video.title} thumbnail`}]},twitter:{card:'summary_large_image',title:data.video.title,description,images:[image]}}
}
export default async function TranscriptPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{t?:string;from?:string}>}){
 const {id}=await params;const {t,from}=await searchParams
 const origin=transcriptOrigin(from)
 if(origin==='admin'&&!(await getAuthenticatedAccess())?.admin)notFound()
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))notFound()
 const time=Number(t??0);const start=Number.isFinite(time)&&time>=0?Math.min(time,43200):0
 const data=await (origin==='admin'?loadAdminTranscript:loadPublicTranscript)(id,-1,start);if(!data)notFound()
 const path=`/transcripts/${id}`
 return <>
  <StructuredData data={breadcrumbJsonLd([{name:'Home',path:'/'},{name:'Search',path:'/search'},{name:data.video.title,path}])}/>
  <TranscriptViewer key={id} video={data.video} initialSegments={data.segments} start={start} origin={origin}/>
 </>
}

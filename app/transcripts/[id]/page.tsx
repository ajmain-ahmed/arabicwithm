import {notFound} from 'next/navigation'
import {loadPublicTranscript} from '@/app/actions/transcripts'
import TranscriptViewer from './TranscriptViewer'
export default async function TranscriptPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{t?:string}>}){
 const {id}=await params;const {t}=await searchParams
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))notFound()
 const time=Number(t??0);const start=Number.isFinite(time)&&time>=0?Math.min(time,43200):0
 const data=await loadPublicTranscript(id,-1,start);if(!data)notFound()
 return <TranscriptViewer video={data.video} initialSegments={data.segments} start={start}/>
}

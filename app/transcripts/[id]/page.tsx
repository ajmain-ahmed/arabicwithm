import {notFound} from 'next/navigation'
import {loadAdminTranscript,loadPublicTranscript} from '@/app/actions/transcripts'
import {getAuthenticatedAccess} from '@/app/actions/auth'
import {transcriptOrigin} from '@/app/lib/transcriptNavigation'
import TranscriptViewer from './TranscriptViewer'
export default async function TranscriptPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{t?:string;from?:string}>}){
 const {id}=await params;const {t,from}=await searchParams
 const origin=transcriptOrigin(from)
 if(origin==='admin'&&!(await getAuthenticatedAccess())?.admin)notFound()
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))notFound()
 const time=Number(t??0);const start=Number.isFinite(time)&&time>=0?Math.min(time,43200):0
 const data=await (origin==='admin'?loadAdminTranscript:loadPublicTranscript)(id,-1,start);if(!data)notFound()
 return <TranscriptViewer key={id} video={data.video} initialSegments={data.segments} start={start} origin={origin}/>
}

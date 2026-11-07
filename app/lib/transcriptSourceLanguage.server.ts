import 'server-only'
import {serviceClient} from '@/app/lib/supabase'
import {sourceLanguage,type SourceLanguage} from './transcriptSourceLanguage'
export async function transcriptSourceLanguages(ids:string[],signal=AbortSignal.timeout(1500)):Promise<Map<string,SourceLanguage>>{
 if(!ids.length)return new Map()
 const {data,error}=await serviceClient.from('youtube_transcripts').select('id,source_language:raw_transcript->>source_language').in('id',[...new Set(ids)]).abortSignal(signal)
 if(error)throw new Error('Unable to load original audio language metadata.')
 return new Map((data??[]).map(row=>[row.id,sourceLanguage(row.source_language)]))
}

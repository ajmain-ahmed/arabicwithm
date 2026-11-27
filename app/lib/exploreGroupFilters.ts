import {ENGLISH_TRANSCRIPT_GROUP_ID} from '@/app/lib/transcriptGroupTree'
/** Content filters are independent of the website interface language. */
export const ENGLISH_EXPLORE_GROUP = ENGLISH_TRANSCRIPT_GROUP_ID
export function isEnglishExploreGroup(row:{id:string;name:string}) {
 return row.id===ENGLISH_EXPLORE_GROUP || row.name.trim().toLowerCase()==='english'
}
export function cleanExploreGroups(ids:string[],rows:{id:string;name:string}[]=[]):string[]{
 const excluded=new Set([ENGLISH_EXPLORE_GROUP,'english',...rows.filter(isEnglishExploreGroup).map(row=>row.id)])
 return ids.filter(id=>!excluded.has(id))
}

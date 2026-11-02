import type {TranscriptGroup,TranscriptRow} from '@/app/actions/transcripts'

export const APP_IMPORTS_GROUP_KEY='app_imports'
export function isAppImportsGroup(group:Pick<TranscriptGroup,'id'|'system_key'>|null|undefined):boolean{return group?.system_key===APP_IMPORTS_GROUP_KEY}
export function isAppImport(row:Pick<TranscriptRow,'source_origin'>|null|undefined):boolean{return row?.source_origin==='user_import'}
export function hasDownloadableTranscript(row:TranscriptRow):boolean{return row.status==='ready'&&(!isAppImport(row)||row.has_saved_transcript===true)}
export function canEditTranscript(row:TranscriptRow):boolean{return !isAppImport(row)||(hasDownloadableTranscript(row)&&row.can_edit!==false)}

import type { TranscriptRow } from '@/app/actions/transcripts'
export function transcriptGenerationStatus(row: TranscriptRow): string {
  if (row.error_code) return transcriptGenerationError(row.error_code)
  if (row.status === 'failed') return 'Generation failed. The transcript has not been published.'
  if (row.status === 'queued') return 'Preparing video'
  if (row.status === 'processing') return 'Transcribing Arabic'
  if (row.status === 'indexing') return 'Saving and indexing transcript'
  if (row.website_generation && row.translation_status !== 'ready') {
    if (['unavailable', 'failed', 'partial'].includes(row.translation_status)) return 'English translation is incomplete. The transcript has not been published.'
    return 'Generating English translation'
  }
  return row.searchable ? 'Ready' : 'Unpublished'
}
export function transcriptGenerationPending(row: TranscriptRow): boolean {
  return ['queued', 'processing', 'indexing'].includes(row.status)
    || Boolean(row.website_generation && ['queued', 'processing'].includes(row.translation_status))
}
export function transcriptGenerationError(code: string): string {
  const errors: Record<string, string> = {
    provider_upgrade_required: 'Supadata requires a plan or credit upgrade for this request. Generation is incomplete.',
    provider_not_configured: 'Supadata is not configured on the transcript worker.',
    provider_auth: 'Supadata rejected the configured API key.',
    transcript_unavailable: 'The video is private, inaccessible, or has no usable transcript/audio.',
    arabic_unavailable: 'No usable Arabic transcription was returned.',
    provider_timeout: 'Supadata timed out. The worker will retry when safe.',
    provider_rate_limit: 'Supadata rate limit reached. The worker will retry when safe.',
    request_uncertain: 'Supadata did not confirm the transcription request. Operator reconciliation is required before retrying to avoid duplicate charges.',
    translation_request_uncertain: 'The translation request was interrupted. Operator reconciliation is required before retrying.',
    translation_alignment_required: 'English could not be safely aligned with every Arabic segment. The transcript has not been published.',
    translation_unavailable: 'Supadata did not return a complete English translation.',
    invalid_timing: 'Supadata returned invalid or non-integer millisecond timings.',
    malformed_transcript: 'Supadata returned an empty or malformed transcript.',
    indexing_failed: 'Transcript indexing failed. The worker will retry when safe.',
    translation_persistence_failed: 'English translation could not be saved. The worker will retry saved results when safe.',
  }
  return errors[code] ?? `Transcript processing failed (${code}).`
}

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
    enrichment_not_configured: 'Arabic text is saved, but word-level enrichment needs OPENAI_API_KEY on the Supabase transcript worker. You can review the available JSON.',
    enrichment_auth: 'The enrichment provider rejected OPENAI_API_KEY. Check the Supabase worker secret.',
    enrichment_unavailable: 'Word-level enrichment is temporarily unavailable. The saved Arabic timing is preserved.',
    invalid_enrichment: 'The enrichment response did not match the AWM token schema. Review the available JSON before saving.',
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

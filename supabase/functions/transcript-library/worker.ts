import { ProviderError, type TranscriptProvider } from "./provider.ts";

export interface Work {
  website_generation?: boolean;
  provider?: string;
  id: string;
  lease_id: string;
  canonical_url: string;
  raw_transcript: unknown;
  provider_job_id: string | null;
  request_started_at: string | null;
  attempts: number;
  provider_metadata: unknown;
}
export interface WorkStore {
  save(work: Work, fields: Record<string, unknown>): Promise<void>;
  index(work: Work): Promise<void>;
}
// The raw response is persisted BEFORE indexing. A lost worker lease cannot
// overwrite newer work; the store checks the lease on every write.
export async function processWork(
  work: Work,
  store: WorkStore,
  provider: TranscriptProvider,
) {
  let acquisitionStarted = Boolean(work.request_started_at);
  try {
    if (work.raw_transcript) {
      await store.index(work);
      return;
    }
    if (
      work.provider_job_id && work.request_started_at &&
      provider.maximumJobAgeMs &&
      Date.now() - Date.parse(work.request_started_at) >
        provider.maximumJobAgeMs
    ) {
      throw new ProviderError("provider_job_expired", false, true);
    }
    if (!work.provider_metadata) {
      const metadata = await provider.metadata(work.canonical_url);
      const media = metadata.media as Record<string, unknown> | undefined;
      const author = metadata.author as Record<string, unknown> | undefined;
      await store.save(work, {
        provider_metadata: metadata,
        ...(typeof metadata.title === "string"
          ? { title: metadata.title }
          : {}),
        ...(typeof author?.displayName === "string"
          ? { channel: author.displayName }
          : {}),
        ...(typeof media?.duration === "number" && media.duration > 0
          ? { duration_seconds: media.duration }
          : {}),
        ...(typeof media?.thumbnailUrl === "string" &&
            media.thumbnailUrl.startsWith("https://")
          ? { thumbnail: media.thumbnailUrl }
          : {}),
      });
    }
    if (!work.provider_job_id && work.request_started_at) {
      throw new ProviderError("request_uncertain", true);
    }
    if (!work.provider_job_id) {
      await store.save(work, { request_started_at: new Date().toISOString() });
      acquisitionStarted = true;
    }
    const result = work.provider_job_id
      ? await provider.poll(work.provider_job_id)
      : await provider.request(work.canonical_url);
    if (result.kind === "pending") {
      await store.save(work, {
        provider_job_id: result.jobId,
        status: "processing",
        error_code: null,
        next_attempt_at: new Date(Date.now() + 15000).toISOString(),
        lease_id: null,
        lease_until: null,
      });
      return;
    }
    if (work.website_generation) {
      // Enforce the website's millisecond contract without changing mobile or
      // legacy provider parsing, and without estimating any missing timing.
      const chunks = result.raw.content;
      if (!chunks.length || chunks.some((chunk) => !chunk.text.trim())) {
        throw new ProviderError("malformed_transcript", false, true);
      }
      if (
        chunks.some((chunk) =>
          !Number.isInteger(chunk.offset) ||
          !Number.isInteger(chunk.duration) || chunk.offset < 0 ||
          chunk.duration <= 0
        )
      ) {
        throw new ProviderError("invalid_timing", false, true);
      }
      if (
        (result.raw.lang && result.raw.lang !== "ar") ||
        !chunks.some((chunk) => /[\u0621-\u063a\u0641-\u064a]/.test(chunk.text))
      ) {
        throw new ProviderError("arabic_unavailable", false, true);
      }
    }
    await store.save(work, {
      raw_transcript: result.raw,
      status: "indexing",
      error_code: null,
      ...(typeof result.raw.audio_duration_seconds === "number" &&
          result.raw.audio_duration_seconds > 0
        ? { duration_seconds: result.raw.audio_duration_seconds }
        : {}),
    });
    work.raw_transcript = result.raw;
    await store.index(work);
  } catch (error) {
    const code = error instanceof ProviderError
      ? error.code
      : work.raw_transcript
      ? "indexing_failed"
      : "database_failure";
    // Preserve job ID/raw on all retries. Never blindly acquire after a crash
    // between provider acceptance and durable job/result persistence.
    const uncertain = (error instanceof ProviderError && error.uncertain) ||
      (!work.raw_transcript && !work.provider_job_id && acquisitionStarted &&
        code === "database_failure");
    const retry = !uncertain &&
      !(error instanceof ProviderError && error.terminal) &&
      (work.raw_transcript || work.provider_job_id ||
        [
          "provider_timeout",
          "provider_rate_limit",
          "provider_unavailable",
          "provider_auth",
          "database_failure",
        ].includes(code)) &&
      work.attempts < 8;
    await store.save(work, {
      status: retry
        ? (work.raw_transcript ? "indexing" : "processing")
        : "failed",
      error_code: uncertain ? "request_uncertain" : code,
      attempts: work.attempts + 1,
      ...(!work.provider_job_id &&
          ["provider_auth", "provider_rate_limit", "transcript_unavailable"]
            .includes(code)
        ? { request_started_at: null }
        : {}),
      next_attempt_at: new Date(
        Date.now() + Math.min(300000, 15000 * 2 ** work.attempts),
      ).toISOString(),
      lease_id: null,
      lease_until: null,
    });
  }
}

import {
  parseProviderResult,
  parseYouTubeUrl,
  ProviderError,
  type ProviderResult,
  type Transcript,
  type TranscriptProvider,
} from "./provider.ts";

const endpoint = "https://api.gladia.io/v2/pre-recorded";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type ObjectValue = Record<string, unknown>;
const object = (value: unknown): ObjectValue =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as ObjectValue
    : {};

// Gladia's utterance times are seconds; the existing AWM normalisation contract
// uses milliseconds. Retain the private response for recovery without repaying.
export function normaliseGladia(body: unknown): Transcript {
  const response = object(body);
  const result = object(response.result);
  const transcription = object(result.transcription);
  const source = transcription.utterances;
  if (!Array.isArray(source) || !source.length || source.length > 100000) {
    throw new ProviderError("malformed_response", false, true);
  }
  const translation = object(result.translation);
  const translations =
    Array.isArray(translation.results) && translation.success === true
      ? translation.results.filter((entry) => {
        const value = object(entry);
        return !value.error && Array.isArray(value.languages) &&
          value.languages.includes("en");
      }).flatMap((entry) => {
        const utterances = object(entry).utterances;
        return Array.isArray(utterances) ? utterances : [];
      }).map(object)
      : [];
  const key = (u: ObjectValue) => `${u.start}:${u.end}:${u.channel ?? 0}`;
  const originals = source.map(object);
  const sourceCounts = new Map<string, number>();
  const englishByTime = new Map<string, ObjectValue[]>();
  for (const u of originals) {
    sourceCounts.set(key(u), (sourceCounts.get(key(u)) ?? 0) + 1);
  }
  for (const u of translations) {
    const candidates = englishByTime.get(key(u)) ?? [];
    candidates.push(u);
    englishByTime.set(key(u), candidates);
  }
  const content = originals.map((u) => {
    if (
      typeof u.start !== "number" || typeof u.end !== "number" ||
      u.end < u.start ||
      typeof u.text !== "string" || !u.text.trim() || u.language !== "ar"
    ) {
      throw new ProviderError("malformed_response", false, true);
    }
    const candidates = englishByTime.get(key(u)) ?? [];
    const translated = sourceCounts.get(key(u)) === 1 && candidates.length === 1
      ? candidates[0]
      : undefined;
    const english =
      translated?.language === "en" && typeof translated.text === "string" &&
        translated.text.trim()
        ? translated.text.trim()
        : undefined;
    return {
      text: u.text,
      offset: u.start * 1000,
      duration: (u.end - u.start) * 1000,
      lang: "ar",
      ...(english ? { english } : {}),
    };
  });
  const raw: Transcript = {
    content,
    lang: "ar",
    provider: "gladia",
    provider_response: body,
  };
  const metadata = object(result.metadata);
  if (
    typeof metadata.audio_duration === "number" &&
    Number.isFinite(metadata.audio_duration)
  ) {
    raw.audio_duration_seconds = metadata.audio_duration;
  }
  try {
    parseProviderResult(raw);
  } catch {
    throw new ProviderError("malformed_response", false, true);
  }
  return raw;
}

export class GladiaTranscriptProvider implements TranscriptProvider {
  readonly maximumJobAgeMs = 30 * 60 * 1000;
  constructor(
    private key: string,
    private authoriseAcquisition: () => Promise<boolean>,
    private fetcher: typeof fetch = fetch,
  ) {}

  async metadata(url: string): Promise<ObjectValue> {
    const canonical = parseYouTubeUrl(url);
    try {
      const response = await this.fetcher(
        `https://www.youtube.com/oembed?url=${
          encodeURIComponent(canonical.url)
        }&format=json`,
        { signal: AbortSignal.timeout(10000) },
      );
      if (!response.ok) return {};
      const value = object(await response.json());
      return {
        title: value.title,
        author: { displayName: value.author_name },
        media: { thumbnailUrl: value.thumbnail_url },
      };
    } catch {
      return {};
    }
  }

  private async call(
    path: string,
    payload?: ObjectValue,
  ): Promise<ObjectValue> {
    const acquiring = payload !== undefined;
    let response: Response;
    try {
      response = await this.fetcher(path, {
        method: acquiring ? "POST" : "GET",
        redirect: "error",
        headers: {
          "x-gladia-key": this.key,
          "Content-Type": "application/json",
        },
        ...(acquiring ? { body: JSON.stringify(payload) } : {}),
        signal: AbortSignal.timeout(20000),
      });
    } catch {
      throw new ProviderError(
        acquiring ? "request_uncertain" : "provider_timeout",
        acquiring,
      );
    }
    if (!response.ok) {
      const code = response.status === 401 || response.status === 403
        ? "provider_auth"
        : response.status === 402
        ? "provider_upgrade_required"
        : response.status === 429
        ? "provider_rate_limit"
        : response.status >= 500
        ? (acquiring ? "request_uncertain" : "provider_unavailable")
        : "transcript_unavailable";
      throw new ProviderError(
        code,
        acquiring && response.status >= 500,
        acquiring ||
          (response.status >= 400 && response.status < 500 &&
            response.status !== 429),
      );
    }
    try {
      return object(await response.json());
    } catch {
      throw new ProviderError(
        acquiring ? "request_uncertain" : "malformed_response",
        acquiring,
        !acquiring,
      );
    }
  }

  async request(url: string): Promise<ProviderResult> {
    const canonical = parseYouTubeUrl(url);
    if (!await this.authoriseAcquisition()) {
      throw new ProviderError("gladia_experiment_locked", false, true);
    }
    const body = await this.call(endpoint, {
      audio_url: canonical.url,
      language_config: { languages: ["ar"], code_switching: false },
      translation: true,
      translation_config: {
        target_languages: ["en"],
        model: "base",
        match_original_utterances: true,
        lipsync: false,
        context_adaptation: false,
      },
      diarization: false,
      callback: false,
    });
    if (typeof body.id !== "string" || !uuid.test(body.id)) {
      throw new ProviderError("request_uncertain", true);
    }
    return { kind: "pending", jobId: body.id };
  }

  async poll(jobId: string): Promise<ProviderResult> {
    if (!uuid.test(jobId)) {
      throw new ProviderError("malformed_response", false, true);
    }
    const body = await this.call(`${endpoint}/${jobId}`);
    if (body.id !== jobId) {
      throw new ProviderError("malformed_response", false, true);
    }
    if (body.status === "queued" || body.status === "processing") {
      return { kind: "pending", jobId };
    }
    if (body.status === "error") {
      throw new ProviderError("transcript_unavailable", false, true);
    }
    if (body.status !== "done") {
      throw new ProviderError("malformed_response", false, true);
    }
    return { kind: "transcript", raw: normaliseGladia(body) };
  }
}


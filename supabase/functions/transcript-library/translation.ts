import { ProviderError, type Transcript } from "./provider.ts";

export type TranslationSegment = {
  id: number;
  start_seconds: number;
  end_seconds: number;
  original_text: string;
  english_text: string | null;
};
export type TranslationWork = {
  transcript_id: string;
  lease_id: string;
  request_started_at: string | null;
  raw_translation: Transcript | null;
  attempts: number;
};
export type TranslationPair = {
  id: number;
  start: number;
  end: number;
  original: string;
  english: string;
};
export interface TranslationStore {
  save(work: TranslationWork, fields: Record<string, unknown>): Promise<void>;
  apply(work: TranslationWork, pairs: TranslationPair[]): Promise<void>;
}

/// Pair only real, uniquely contained timing intervals. Never attach an English
/// sentence spanning several Arabic captions to each of them as a fake pairing.
export function pairTranslation(
  segments: TranslationSegment[],
  raw: Transcript,
): TranslationPair[] {
  if (raw.lang !== "en") throw new ProviderError("translation_unavailable");
  const grouped = new Map<number, typeof raw.content>();
  const source = [...segments].sort((a, b) =>
    a.start_seconds - b.start_seconds || a.id - b.id
  );
  const maximumEnds: number[] = [];
  const exact = new Map<string, TranslationSegment[]>();
  for (const s of source) {
    maximumEnds.push(Math.max(maximumEnds.at(-1) ?? 0, s.end_seconds));
    const key = `${Math.round(s.start_seconds * 1000)}:${
      Math.round(s.end_seconds * 1000)
    }`;
    exact.set(key, [...(exact.get(key) ?? []), s]);
  }
  const ordered = [...raw.content].sort((a, b) => a.offset - b.offset);
  for (const chunk of ordered) {
    const start = chunk.offset / 1000,
      end = (chunk.offset + chunk.duration) / 1000;
    const matches =
      exact.get(`${chunk.offset}:${chunk.offset + chunk.duration}`) ?? [];
    // Exact correspondence first; a split translation is safe only if wholly
    // inside one original interval (strict boundaries, no fabricated times).
    const candidates = [...matches];
    if (!matches.length) {
      let low = 0, high = source.length;
      while (low < high) {
        const mid = (low + high) >>> 1;
        if (source[mid].start_seconds <= start) low = mid + 1;
        else high = mid;
      }
      for (let i = low - 1; i >= 0 && maximumEnds[i] >= end; i--) {
        if (source[i].end_seconds >= end && end > start) {
          candidates.push(source[i]);
        }
      }
    }
    if (candidates.length !== 1 || !chunk.text.trim()) continue;
    const id = candidates[0].id;
    const chunks = grouped.get(id) ?? [];
    chunks.push(chunk);
    grouped.set(id, chunks);
  }
  return segments.filter((s) => {
    const chunks = grouped.get(s.id);
    if (s.english_text || !chunks) return false;
    let cursor = s.start_seconds * 1000;
    for (const c of chunks) {
      if (Math.abs(c.offset - cursor) > 2) return false;
      cursor = c.offset + c.duration;
    }
    return Math.abs(cursor - s.end_seconds * 1000) <= 2;
  }).map(
    (s) => ({
      id: s.id,
      start: s.start_seconds,
      end: s.end_seconds,
      original: s.original_text,
      english: grouped.get(s.id)!.map((c) => c.text.trim()).join(" "),
    }),
  );
}

export async function processTranslation(
  work: TranslationWork,
  url: string,
  segments: TranslationSegment[],
  store: TranslationStore,
  provider: { translate(url: string): Promise<Transcript> },
) {
  try {
    if (!work.raw_translation) {
      if (work.request_started_at) {
        throw new ProviderError("translation_request_uncertain", true);
      }
      await store.save(work, {
        request_started_at: new Date().toISOString(),
        status: "processing",
      });
      work.request_started_at = new Date().toISOString();
      const raw = await provider.translate(url);
      await store.save(work, { raw_translation: raw });
      work.raw_translation = raw;
    }
    await store.apply(work, pairTranslation(segments, work.raw_translation));
  } catch (error) {
    const code = error instanceof ProviderError
      ? error.code
      : "translation_persistence_failed";
    // Once a request may have been accepted, never reacquire it automatically.
    const retry = Boolean(work.raw_translation) && work.attempts < 3;
    await store.save(work, {
      status: retry ? "queued" : "unavailable",
      error_code: code,
      attempts: work.attempts + 1,
      next_attempt_at: new Date(Date.now() + 60000).toISOString(),
      release: true,
    });
  }
}


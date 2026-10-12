export type Chunk = {
  text: string;
  offset: number;
  duration: number;
  lang?: string;
  english?: string;
};
export type Transcript = {
  content: Chunk[];
  lang?: string;
  [key: string]: unknown;
};
export type ProviderResult = { kind: "transcript"; raw: Transcript } | {
  kind: "pending";
  jobId: string;
};
export interface TranscriptProvider {
  readonly maximumJobAgeMs?: number;
  metadata(url: string): Promise<Record<string, unknown>>;
  request(url: string): Promise<ProviderResult>;
  poll(jobId: string): Promise<ProviderResult>;
}
export class ProviderError extends Error {
  constructor(
    public code: string,
    public uncertain = false,
    public terminal = false,
  ) {
    super(code);
  }
}
export function parseYouTubeUrl(input: string): { id: string; url: string } {
  let uri: URL;
  try {
    uri = new URL(
      input.trim().match(/^https?:\/\//i)
        ? input.trim()
        : `https://${input.trim()}`,
    );
  } catch {
    throw new ProviderError("invalid_url");
  }
  if (
    !["http:", "https:"].includes(uri.protocol) || uri.username ||
    uri.password || uri.port
  ) throw new ProviderError("invalid_url");
  const host = uri.hostname.toLowerCase();
  const parts = uri.pathname.split("/").filter(Boolean);
  let id: string | null = null;
  if (host === "youtu.be" && parts.length === 1) id = parts[0];
  if (
    [
      "youtube.com",
      "www.youtube.com",
      "m.youtube.com",
      "music.youtube.com",
      "youtube-nocookie.com",
      "www.youtube-nocookie.com",
    ].includes(host)
  ) {
    if (uri.pathname === "/watch") id = uri.searchParams.get("v");
    else if (
      parts.length === 2 && ["shorts", "embed", "live", "v"].includes(parts[0])
    ) id = parts[1];
  }
  if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) {
    throw new ProviderError("invalid_url");
  }
  return { id, url: `https://www.youtube.com/watch?v=${id}` };
}
export function parseProviderResult(
  body: unknown,
  jobId?: string,
): ProviderResult {
  if (!body || typeof body !== "object") {
    throw new ProviderError("malformed_response");
  }
  const data = body as Record<string, unknown>;
  if (data.status === "failed") {
    throw new ProviderError("transcript_unavailable");
  }
  if (data.status === "queued" || data.status === "active") {
    if (!jobId) throw new ProviderError("malformed_response");
    return { kind: "pending", jobId };
  }
  if (typeof data.jobId === "string" && data.jobId) {
    return { kind: "pending", jobId: data.jobId };
  }
  // Supadata SDK uses result; REST documentation also shows flattened content.
  const raw = (data.result ?? data) as Transcript;
  if (
    !Array.isArray(raw.content) || !raw.content.length ||
    raw.content.length > 100000 ||
    raw.content.some((c) =>
      !c || typeof c.text !== "string" || typeof c.offset !== "number" ||
      typeof c.duration !== "number" ||
      !Number.isFinite(c.offset) || !Number.isFinite(c.duration) ||
      c.offset < 0 || c.duration < 0 || c.offset + c.duration > 43200000
    )
  ) {
    throw new ProviderError("malformed_response");
  }
  return { kind: "transcript", raw };
}
export class SupadataTranscriptProvider implements TranscriptProvider {
  constructor(private key: string, private fetcher: typeof fetch = fetch) {}
  private async get(
    path: string,
    acquiring = false,
  ): Promise<Record<string, unknown>> {
    let response: Response;
    try {
      response = await this.fetcher(`https://api.supadata.ai/v1/${path}`, {
        headers: { "x-api-key": this.key },
        // Leave room for metadata + persistence within the Edge wall-time limit.
        signal: AbortSignal.timeout(acquiring ? 110000 : 15000),
      });
    } catch {
      throw new ProviderError(
        acquiring ? "request_uncertain" : "provider_timeout",
        acquiring,
      );
    }
    if (!response.ok) {
      const code = response.status === 402
        ? "provider_upgrade_required"
        : response.status === 401 || response.status === 403
        ? "provider_auth"
        : response.status === 429
        ? "provider_rate_limit"
        : response.status === 404
        ? "transcript_unavailable"
        : acquiring
        ? "request_uncertain"
        : "provider_unavailable";
      throw new ProviderError(code, acquiring && response.status >= 500);
    }
    try {
      return await response.json();
    } catch {
      throw new ProviderError(
        acquiring ? "request_uncertain" : "malformed_response",
        acquiring,
      );
    }
  }
  metadata(url: string) {
    return this.get(`metadata?url=${encodeURIComponent(url)}`);
  }
  async request(url: string) {
    const body = await this.get(
      `transcript?url=${encodeURIComponent(url)}&lang=ar&text=false&mode=auto`,
      true,
    );
    try {
      return parseProviderResult(body);
    } catch {
      throw new ProviderError("request_uncertain", true);
    }
  }
  async poll(jobId: string) {
    return parseProviderResult(
      await this.get(`transcript/${encodeURIComponent(jobId)}`),
      jobId,
    );
  }
  async translate(url: string): Promise<Transcript> {
    const result = parseProviderResult(
      await this.get(
        `youtube/transcript/translate?url=${
          encodeURIComponent(url)
        }&lang=en&text=false`,
        true,
      ),
    );
    if (result.kind !== "transcript" || result.raw.lang !== "en") {
      throw new ProviderError("translation_unavailable");
    }
    return result.raw;
  }
}


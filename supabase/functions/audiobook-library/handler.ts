export type AudioSummary = {
  chapterId: string;
  language: "ar" | "en";
  narrator: string | null;
  durationSeconds: number | null;
};
export type Playback = {
  sourceType: "supabase_storage";
  url: string;
  expiresIn: number;
  positionSeconds: number;
} | { sourceType: "youtube"; videoId: string; positionSeconds: number };
export interface AudioStore {
  authenticate(token: string): Promise<string | null>;
  premium(userId: string): Promise<boolean>;
  availability(chapterId: string): Promise<AudioSummary[]>;
  play(
    chapterId: string,
    language: "ar" | "en",
    userId: string,
  ): Promise<Playback | null>;
  progress(
    chapterId: string,
    language: "ar" | "en",
    userId: string,
    position: number,
    completed: boolean,
  ): Promise<void>;
}
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
export function audiobookHandler(store: AudioStore) {
  return async (req: Request): Promise<Response> => {
    const json = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), {
        status,
        headers: {
          ...cors,
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      });
    if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
    if (req.method !== "POST") return json({ error: "Use POST." }, 405);
    try {
      const token = req.headers.get("authorization")?.match(/^Bearer (.+)$/i)
        ?.[1];
      const userId = token ? await store.authenticate(token) : null;
      if (!userId) return json({ error: "Sign in to listen." }, 401);
      let input: Record<string, unknown>;
      try {
        input = await req.json();
      } catch {
        return json({ error: "Invalid JSON request." }, 400);
      }
      if (
        !input || typeof input !== "object" ||
        typeof input.chapterId !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          input.chapterId,
        )
      ) return json({ error: "Invalid chapter." }, 400);
      if (input.action === "availability") {
        return json({ audio: await store.availability(input.chapterId) });
      }
      if (
        !["play", "progress"].includes(String(input.action)) ||
        !["ar", "en"].includes(String(input.language))
      ) return json({ error: "Invalid audio action or language." }, 400);
      const language = input.language as "ar" | "en";
      if (!await store.premium(userId)) {
        return json({ error: "AWM+ is required for audiobook playback." }, 403);
      }
      if (input.action === "progress") {
        if (
          typeof input.positionSeconds !== "number" ||
          !Number.isFinite(input.positionSeconds) ||
          input.positionSeconds < 0 || input.positionSeconds > 86400 ||
          typeof input.completed !== "boolean"
        ) return json({ error: "Invalid playback progress." }, 400);
        await store.progress(
          input.chapterId,
          language,
          userId,
          Math.trunc(input.positionSeconds),
          input.completed,
        );
        return json({ ok: true });
      }
      const playback = await store.play(input.chapterId, language, userId);
      return playback
        ? json(playback)
        : json({ error: "This audiobook chapter is not available." }, 404);
    } catch {
      return json(
        { error: "Unable to load audiobook audio. Please retry." },
        503,
      );
    }
  };
}

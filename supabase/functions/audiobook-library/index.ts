import { getAudiobookPlaybackUrl, sourceFromAudioRecord } from "../_shared/audiobookSource.ts";
import { createClient } from "@supabase/supabase-js";
import { audiobookHandler, type AudioStore } from "./handler.ts";

const client = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const store: AudioStore = {
  async authenticate(token) {
    const { data, error } = await client.auth.getUser(token);
    return error ? null : data.user?.id ?? null;
  },
  async premium(userId) {
    const { data: role, error: roleError } = await client.rpc("account_role", {
      p_user_id: userId,
    });
    if (roleError) throw roleError;
    if (role === "admin") return true;
    const { data, error } = await client.from("subscriptions").select(
      "status,current_period_end",
    ).eq("user_id", userId).maybeSingle();
    if (error) throw error;
    return Boolean(
      data && ["active", "trialing"].includes(data.status) &&
        Date.parse(data.current_period_end) > Date.now(),
    );
  },
  async availability(chapterId) {
    const { data, error } = await client.from("book_chapter_audio").select(
      "chapter_id,language,narrator,duration_seconds",
    ).eq("chapter_id", chapterId).eq("is_published", true);
    if (error) throw error;
    return (data ?? []).map((row) => ({
      chapterId: row.chapter_id,
      language: row.language,
      narrator: row.narrator,
      durationSeconds: row.duration_seconds,
    }));
  },
  async play(chapterId, language, userId) {
    const { data, error } = await client.from("book_chapter_audio").select(
      "source_type,storage_path,storage_bucket,external_url,external_video_id",
    ).eq("chapter_id", chapterId).eq("language", language).eq(
      "is_published",
      true,
    ).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const { data: progress, error: progressError } = await client.from(
      "book_audio_progress",
    ).select("position_seconds").eq("user_id", userId).eq(
      "chapter_id",
      chapterId,
    ).eq("language", language).maybeSingle();
    if (progressError) throw progressError;
    const positionSeconds = Number(progress?.position_seconds ?? 0);
    if (data.source_type === "youtube" && data.external_video_id) {
      return {
        sourceType: "youtube",
        videoId: data.external_video_id,
        positionSeconds,
      };
    }
    const source = sourceFromAudioRecord(data, Deno.env.get("SUPABASE_URL")!);
    const playback = await getAudiobookPlaybackUrl(source, client.storage);
    return { sourceType: "supabase_storage", ...playback, positionSeconds,
      storageBucket: source.storageBucket, storagePath: source.storagePath,
      urlType: source.externalUrl ? "external" : playback.expiresIn > 0 ? "signed" : "public" };

  },
  async progress(chapterId, language, userId, position, completed) {
    const { error } = await client.from("book_audio_progress").upsert({
      user_id: userId,
      chapter_id: chapterId,
      language,
      position_seconds: position,
      completed,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,chapter_id,language" });
    if (error) throw error;
  },
};
Deno.serve(audiobookHandler(store));

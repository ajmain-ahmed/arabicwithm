import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  parseYouTubeUrl,
  ProviderError,
  SupadataTranscriptProvider,
} from "./provider.ts";
import { processWork, type Work, type WorkStore } from "./worker.ts";
import { GladiaTranscriptProvider } from "./gladia.ts";
import {
  processTranslation,
  type TranslationSegment,
  type TranslationStore,
  type TranslationWork,
} from "./translation.ts";

import { guestToken, isGuestBearer, privateHash, statusIds } from "./guest.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
const publicColumns =
  "id,youtube_id,canonical_url,title,channel,thumbnail,duration_seconds,status,error_code";

async function providerKey(admin: SupabaseClient) {
  const environmentKey = Deno.env.get("SUPADATA_API_KEY");
  if (environmentKey) return environmentKey;
  const { data, error } = await admin.rpc("transcript_provider_key");
  if (error) throw new Error("provider_configuration_unavailable");
  return typeof data === "string" && data ? data : undefined;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }
  if (request.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }
  try {
    if (Number(request.headers.get("content-length") ?? 0) > 4096) {
      return json({ error: "invalid_request" }, 400);
    }
    const text = await request.text();
    if (text.length > 4096) return json({ error: "invalid_request" }, 400);
    const body = JSON.parse(text);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return json({ error: "invalid_request" }, 400);
    }
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      {
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
    if (body.action === "work") {
      const token = request.headers.get("x-transcript-worker");
      if (!token) return json({ error: "unauthorised" }, 401);
      const { data: allowed, error } = await admin.rpc(
        "transcript_worker_authorised",
        { p_token: token },
      );
      if (error || allowed !== true) {
        return json({ error: "unauthorised" }, 401);
      }
      const { data, error: claimError } = await admin.rpc(
        "claim_transcript_work",
      );
      if (claimError) throw claimError;
      const work = data?.[0] as Work | undefined;
      if (!work) {
        const { data: jobs, error: translationError } = await admin.rpc(
          "claim_transcript_translation",
        );
        if (translationError) throw translationError;
        const job = jobs?.[0] as TranslationWork | undefined;
        if (!job) return json({ accepted: true });
        const key = await providerKey(admin);
        const translationStore: TranslationStore = {
          async save(item, fields) {
            const { error } = await admin.rpc("save_transcript_translation", {
              p_id: item.transcript_id,
              p_lease: item.lease_id,
              p_fields: fields,
            });
            if (error) throw new Error("translation_persistence_failed");
          },
          async apply(item, pairs) {
            const { error } = await admin.rpc("apply_transcript_translation", {
              p_id: item.transcript_id,
              p_lease: item.lease_id,
              p_pairs: pairs,
            });
            if (error) throw new Error("translation_persistence_failed");
          },
        };
        if (!key && !job.raw_translation) {
          await translationStore.save(job, {
            status: "queued",
            error_code: "provider_not_configured",
            release: true,
            next_attempt_at: new Date(Date.now() + 300000).toISOString(),
          });
          return json({ accepted: true });
        }
        const { data: video, error: videoError } = await admin.from(
          "youtube_transcripts",
        )
          .select("canonical_url").eq("id", job.transcript_id).single();
        if (videoError) throw videoError;
        const segments: TranslationSegment[] = [];
        // Supabase caps one response at 1,000 rows; page the saved source.
        for (let offset = 0;; offset += 1000) {
          const { data: page, error } = await admin.from("transcript_segments")
            .select("id,start_seconds,end_seconds,original_text,english_text")
            .eq("transcript_id", job.transcript_id).order("position", {
              ascending: true,
            }).range(offset, offset + 999);
          if (error) throw error;
          segments.push(...page);
          if (page.length < 1000) break;
        }
        await processTranslation(
          job,
          video.canonical_url,
          segments,
          translationStore,
          new SupadataTranscriptProvider(key ?? ""),
        );
        return json({ accepted: true });
      }
      const store: WorkStore = {
        async save(item, fields) {
          const { data, error } = await admin.from("youtube_transcripts")
            .update({ ...fields, updated_at: new Date().toISOString() })
            .eq("id", item.id).eq("lease_id", item.lease_id).select("id");
          if (error || !data?.length) throw new Error("persistence_failed");
        },
        async index(item) {
          const { error } = await admin.rpc("index_youtube_transcript", {
            p_id: item.id,
            p_lease: item.lease_id,
          });
          if (error) {
            if (
              item.website_generation &&
              /invalid_timing|malformed_transcript|arabic_unavailable|translated_source_changed/
                .test(error.message)
            ) {
              throw new ProviderError(error.message, false, true);
            }
            throw new Error("indexing_failed");
          }
        },
      };
      const key = work.provider === "gladia"
        ? Deno.env.get("GLADIA_API_KEY")
        : await providerKey(admin);
      if (!key && !work.raw_transcript) {
        await store.save(work, {
          status: "queued",
          error_code: "provider_not_configured",
          next_attempt_at: new Date(Date.now() + 300000).toISOString(),
          lease_id: null,
          lease_until: null,
        });
        return json({ accepted: true });
      }
      if (work.provider && !["supadata", "gladia"].includes(work.provider)) {
        await store.save(work, {
          status: "failed",
          error_code: "unsupported_provider",
          lease_id: null,
          lease_until: null,
        });
        return json({ accepted: true });
      }
      const provider = work.provider === "gladia"
        ? new GladiaTranscriptProvider(key ?? "", async () => {
          const { data, error } = await admin.rpc(
            "authorise_gladia_acquisition",
            { p_id: work.id, p_lease: work.lease_id },
          );
          if (error) {
            throw new ProviderError("gladia_experiment_locked", false, true);
          }
          return data === true;
        })
        : new SupadataTranscriptProvider(key ?? "");
      await processWork(work, store, provider);
      return json({ accepted: true });
    }
    const bearer = request.headers.get("Authorization")?.match(/^Bearer (.+)$/i)
      ?.[1];
    let userId: string | null = null;
    if (!isGuestBearer(bearer, Deno.env.get("SUPABASE_ANON_KEY"))) {
      const { data: { user }, error: authError } = await admin.auth.getUser(
        bearer,
      );
      if (authError || !user) return json({ error: "unauthorised" }, 401);
      userId = user.is_anonymous ? null : user.id;
    }
    const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (body.action === "status") {
      const { data, error } = await admin.rpc("guest_transcript_status", {
        p_capability_hash: await privateHash(guestToken(body), secret),
        p_ids: statusIds(body),
      });
      if (error) throw error;
      return json({ videos: data });
    }
    if (
      body.action !== "submit" || typeof body.url !== "string" ||
      body.url.length > 2048
    ) {
      return json({ error: "invalid_request" }, 400);
    }
    const video = parseYouTubeUrl(body.url);
    // Platform forwarding is a secondary throttle only: the transactional global
    // new-job cap still bounds provider cost if forwarding headers are spoofed.
    const address =
      request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ??
        "unknown";
    const { data: id, error } = userId
      ? await admin.rpc("register_youtube_transcript", {
        p_user: userId,
        p_youtube_id: video.id,
      })
      : await admin.rpc("register_guest_transcript", {
        p_subject: await privateHash(`ip:${address}`, secret),
        p_capability_hash: await privateHash(guestToken(body), secret),
        p_youtube_id: video.id,
      });
    if (error) {
      if (/rate_limit|daily_limit/.test(error.message)) {
        return json({ error: "rate_limit" }, 429);
      }
      throw error;
    }
    const { data, error: readError } = await admin.from("youtube_transcripts")
      .select(`${publicColumns},provider`).eq("id", id).single();
    if (readError) throw readError;
    const { provider, ...videoData } = data;
    const configured = data.status !== "queued" ||
      Boolean(
        provider === "gladia"
          ? Deno.env.get("GLADIA_API_KEY")
          : await providerKey(admin),
      );
    return json({
      video: !configured
        ? { ...videoData, error_code: "provider_not_configured" }
        : videoData,
    });
  } catch (error) {
    const code = error instanceof ProviderError
      ? error.code
      : error instanceof Error && error.message === "invalid_request"
      ? "invalid_request"
      : "request_failed";
    return json(
      { error: code },
      code === "invalid_url" || code === "invalid_request" ||
        error instanceof SyntaxError
        ? 400
        : 500,
    );
  }
});

# Website transcript generation

The website Admin → Transcripts form queues the existing Supadata provider through
the existing canonical transcript library and cron worker. It does not call a new
provider, accept a transcript file, or create a separate search corpus. Manual
timed imports remain available separately.

## Deploy

1. Apply `supabase/migrations/20261004100332_website_transcript_generation.sql`
   through the normal migration workflow. Review pending migrations before using
   `supabase db push`; do not blindly apply unrelated pending migrations.
2. Deploy the existing `transcript-library` Edge Function from
   `supabase/functions/transcript-library` using the project's existing deployment
   process (`supabase functions deploy transcript-library --project-ref
   whbxgwucsoguqzpnpzjd`). Preserve its existing JWT-verification setting and worker
   secret authentication. No new secret, bucket, cron, or provider is required.
3. Deploy the website after the migration. The admin list requires the new column.
4. Confirm the Supadata account supports the existing English translation endpoint.
   The inspected live jobs currently report `provider_upgrade_required`; having a
   configured key alone does not establish that translation is available. Resolve
   the provider plan/credit issue before testing a new video end to end.

No live migration, Edge Function deployment, website deployment, or paid generation
was performed as part of implementing these changes.

## Pipeline and compatibility

An authenticated website server action checks the existing canonical admin role.
The service-only generation RPC repeats that check, locks the stable YouTube ID,
and returns an existing record without replacing it or acquiring it again. New
records use existing registration quotas and worker leases. Only these records
are marked `website_generation`; old mobile, curated and manual records retain
their existing indexing behavior.

The existing Supadata worker persists the raw Arabic response before indexing.
New website generation requires actual integer millisecond offsets and durations,
non-empty Arabic text, and chronological segments. It skips token, POS, CEFR and
dictionary enrichment. Additive generated `start_ms`/`end_ms` columns retain the
existing seconds fields and canonical segment IDs.

The existing translation queue obtains timed English from the existing Supadata
translation endpoint. Translation is saved before pairing; only exact or fully
covered uniquely contained intervals are attached to the same Arabic segment.
Incomplete or ambiguous English is not published. Successful complete pairing
automatically enables the existing search and Explore corpus. The same search RPC
retains its legacy ranked token results and cursor, and adds normalized Arabic
segment text/phrase and English text matches for generated records.

Generation errors distinguish provider configuration, inaccessible videos,
invalid timing, translation alignment, plan requirements and interrupted requests.
An uncertain request is deliberately not purchased again automatically. Persisted
raw results may be retried safely by the existing worker. Existing unavailable jobs
require operator review; changing the provider plan does not reset those records,
and re-entering their URL intentionally returns a duplicate warning.

Admin deletion is service-only and repeats the admin-role check. Existing foreign
keys cascade transcript-owned segments, tokens, translation jobs, guest links and
user-library associations. Shared dictionary data and unrelated transcripts remain.
No RLS policy or storage permission is relaxed.

Viewer origins use explicit whitelisted destinations (`from=admin`, `from=explore`
or default search), rather than browser history. Draft access and pagination remain
admin guarded. Displayed timestamps use MM:SS; seeking retains exact stored timing.

Word Search is in Home Quick Actions for guests and all account types, removed from
the desktop primary navbar. The duplicate Admin Quick Actions tile is removed;
the existing admin-only shortcut remains beside Bookmark. Responsive website card
grids share sizing and spacing. Mobile navigation and Flutter source are unchanged.

## Verification

Website tests cover server authorization, stable URL deduplication, deletion,
search phrases, viewer origins, timing, Home shortcuts and existing functionality.
An isolated PGlite database applies the complete migration and checks service-only
RPC permissions, chronology, untranslated publication rejection, automatic
publication, normalized bilingual search, legacy delegation and cascaded cleanup.
Edge tests check durable raw acquisition, invalid timing rejection, safe English
pairing, the provider plan error and avoiding repeated acquisition.

After deployment and resolving the provider plan issue, generate a new accessible
Arabic YouTube video and verify complete English, saved timing, search hits, seeking,
duplicate warnings and confirmed deletion. Verify admin and regular-user responsive
layouts in a browser; this environment had no connected browser for visual checks.

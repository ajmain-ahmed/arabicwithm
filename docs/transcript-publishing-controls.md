# Standalone transcript publication and For You verification

Implemented 16 October 2026. Database migration applied to the configured
`arabicwithm` Supabase project; website code verified locally, including a
production build. No website deployment was performed.

1. **Search publication:** existing `public.youtube_transcripts.searchable`.
   Public transcript loading still explicitly requires `status='ready'` and
   `searchable=true`; transcript word search is unchanged.
2. **For You publication:** existing `explore_published`, exposed in the website
   as `explorePublished`. No duplicate publication column was introduced.
   The existing `transcript_for_you_groups` RPC uses this flag independently of
   `searchable`, with its existing language, provenance and episode exclusions.
3. **Defaults/backfill:** Add defaults both controls to checked. Existing stored
   search/For You values are preserved, except the explicitly blocked video.
   Resumable import jobs gain `requested_explore_published DEFAULT true`.
   Existing unfinished form drafts lacking the new choice default it to true.
4. **Independent saves:** `website_begin_manual_import`,
   `website_finish_manual_import`, and `website_save_manual_source` wrap the
   existing Admin routines and commit the independent publication choice in the
   same transaction. Edit retains its existing version/conflict checks.
   Delayed finish retries cannot overwrite subsequent publication edits.
   The form baseline includes For You, so a checkbox change cannot accidentally
   take the group-only save path. Draft payloads preserve both choices.
5. **Gloss investigation:** the supplied Episode 10's first segment retains
   `من/from`, `سالف/bygone`, and `الزمان/time` in both `raw_transcript` and
   `canonical_paragraph`. The checked-out Explore page previously consumed
   Shows/Books, rather than the standalone transcript RPC, and its component
   rendered sentence translations without the standalone token/gloss path.
   Additionally, canonical projections require complete enrichment metadata;
   valid source glosses must not depend on successful dictionary enrichment.
6. **Gloss fix:** Explore now exposes a standalone For You view using the existing
   RPC; the previous feed remains under Discover. The server maps preserved
   source tokens, with exact matching canonical-token fallback, into explicit
   Arabic/English pairs. Supported token properties are `english`, `gloss`, and
   token-level `translation`, taking the first nonblank string. Every available
   gloss renders below Arabic regardless of POS or dictionary metadata.
   Missing glosses remain absent; sentence translations stay separate.
7. **Segment exclusions:** centralized private
   `transcript_private.website_for_you_exclusions`, keyed by canonical video ID
   and time range. Triggers apply the existing `for_you_manual_excluded` flag
   to overlapping captions on insert/update, including reindexing and reimport.
   The existing clip query rejects these anchors and stops before excluded
   captions. The YouTube API player now receives the clip end time as well as
   the fallback iframe, preventing playback beyond the chosen clip.
8. **Exact theme target/ranges:** standalone Episode 10, `ru6DAbFzVio`,
   transcript `e9fc99a1-4bd4-4df1-b884-6b0ec1f6fd01`.
   Excluded `[00:08,00:57)` and `[10:35,12:24)` — positions 0–15 and 171–206,
   52 of 207 segments. The ranges include the complete final captions starting
   at 00:49 and 12:21. Normal episode positions 16–170 remain stored and eligible
   under the existing classification rules.
9. **Blocked video origin:** `3S3cFw0hvLs`, transcript
   `ff20fada-815b-4ddf-8716-98fd97f7eb31`, is a legacy `supadata` import with
   `source_origin='website_admin_transcript'`. The earlier provenance migration
   explicitly recognized this video. The Admin manual list requires
   `provider='manual'`, explaining why the feed included it while that list did
   not show it.
10. **Blocked video removal:** persisted `explore_published=false` while
    `searchable=true` remains intact. The centralized full-video exclusion and
    trigger prevent later saves/reimports from republishing it. All 1,131
    source segments remain stored.
11. **Stale data:** no generated clip or recommendation tables were found.
    Clips are selected dynamically by RPC. The new website action uses no
    Next data cache; the Next clip control requests fresh clips rather than serving
    prefetched batches. Admin saves revalidate Explore and transcript paths.
    No transcript/search records or classification data were deleted.
12. **Schema/security:** reused existing public publication and segment flags;
    added one private import-job choice and one private exclusion table with
    RLS and all client/table privileges revoked. New Admin RPCs are restricted
    to `service_role` and check the server-supplied Admin identity. Existing
    public RLS policies were unchanged. Security advisors were reviewed; new
    Admin functions have no public execution grants, and the private table's
    no-policy RLS notice is intentional. Migration history and local filename
    both use `20261015230613_transcript_publishing_controls.sql`.
13. **Files changed:**
    `app/(admin)/admin/transcripts/AdminTranscripts.tsx` and its test;
    `app/actions/transcripts.ts` and its test;
    new `app/actions/forYou.ts`;
    `app/explore/page.tsx`, new `ExploreViews.tsx`, `ForYouFeed.tsx` and its test;
    new `app/lib/forYou.ts` and its test;
    `app/lib/resumableManualImport.test.ts`;
    `app/lib/useYouTubePlayer.ts` and its test;
    `app/lib/supabase/database.types.ts`;
    `e2e/fixture-server.mjs` and `e2e/manual-transcript-import.pw.ts`;
    the migration above; this report and two screenshots in
    `docs/validation/transcript-publishing/`.
14. **Verification:**
    - Real database query tested all four publication combinations inside a
      rolled-back transaction. For You returned the target exactly when
      `explore_published=true`, with either search choice.
    - 20 live RPC seeds produced 100 clips: zero blocked-video clips, zero
      overlaps with the target's theme ranges, and two normal target clips.
    - Global checksum of transcript IDs, searchable flags, raw transcripts and
      canonical transcripts matched before and after the migration:
      `92ade8bef5687ca4acca2a99b76d4a07`.
    - Four mobile Playwright tests passed: every Add combination, persisted
      storage inspection, Edit changes, reload, and checkbox-label nonoverlap.
    - Production browser checks passed: available glosses, next clip, refresh,
      and no horizontal page overflow. Screenshots inspected at 390 and 1440px.
    - Unit suite: 764 passed and three skipped; one unrelated reviewer test
      timed out during concurrent build execution, then its entire 11-test file
      passed in isolation. All 97 final regression tests across the six changed
      test files passed, including database import/edit persistence and player
      boundaries.
    - Production build, TypeScript and ESLint checks passed.

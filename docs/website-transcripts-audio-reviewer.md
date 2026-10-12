# Website, Reviewer, audio and transcript implementation

Scope: ArabicWithM website and shared Supabase project whbxgwucsoguqzpnpzjd. No Flutter code was edited. No files were staged, committed or pushed. The website started with a clean working tree; changes remain available for review. Shared database migrations and the private storage bucket have been applied; the website has not been deployed.

## Reviewer

Visible desktop avatar and mobile menu labels now read Reviewer. Existing /reviewer route, editor/admin roles, guards, scope, workspace and server-action permission contracts are preserved. Existing automated navigation, workspace, editing, refresh, loading/error/empty and review-action tests pass. Inspection found no additional Reviewer defect requiring a redesign. A signed-in visual walkthrough remains pending.

## Existing chapter audio

Reused the existing chapter dialog uploader, audiobook server actions and public ChapterAudioPlayer. Production was missing the already-authored audiobook tables and private bucket; the existing migration was applied rather than adding another audio model. book_chapter_audio stores one optional row per chapter, stable storage_path (chapter UUID/audio.mp3 or audio.m4a), source, publication state and optional metadata. book_audio_progress remains shared user/chapter playback progress.

The uploader now persists its reference immediately after successful upload, before deleting the other file format. Reload reads that durable reference. Replacement preserves narrator/publication state and clears obsolete duration. Removal deletes the reference first, then cleans up the private file; failed cleanup leaves a private orphan rather than a broken public player. Direct file deletion refuses referenced objects. Saved paths must belong to the chapter and resolve to an actual object. Existing Admin guards and premium playback entitlement checks remain intact. Playback signs stable paths for 15 minutes; signed URLs are not stored as content.

Private audiobooks bucket: public=false, 50 MiB limit (52428800 bytes), audio/mpeg, audio/mp4, audio/x-m4a. The previous 100 MiB setup exceeded this project's storage limit. Existing setup script and upload UI are aligned with 50 MiB. Next Server Action request size is 51mb to accommodate multipart overhead. The existing CSP now permits media from the configured Supabase origin. Audio availability still derives from published chapter rows, with no extra book flag and no placeholder media. Current live audio row count is zero: actual uploaded-file playback cannot be claimed as visually verified.

Chapter dialog loading now handles stale requests and chapter/audio loading together. Close, Cancel, Save and upload controls prevent conflicting actions during an upload/save.

## Descriptions and book editor

Initial audit found the two requested descriptions blank. Real chapter content was read before preparing conditional, blank-only backfills. At final verification both contain accurate descriptions and all nine books satisfy the meaningful-description rule. Their saved wording differs from the migration's fallback wording, indicating another write populated them during the task; the guarded backfill preserved these valid values. Existing nonblank descriptions were not intentionally overwritten. No unrelated metadata update was issued.

A Debt of Silence: Nine years after witnessing a killing, accountant Faris Marwan is pressured by powerful Rami Qattan to support a false theft accusation against a dead man. When new records surface, Faris must confront the debt that bought his silence and decide what truth will cost him now.

The Prisoner's Proof: Wrongly convicted of murder, Daniel Mercer enters prison while solicitor Maya Shah re-examines the evidence. Small inconsistencies grow into a chain of proof involving records, timelines and an old friend, forcing Daniel to endure prison politics and months of uncertainty as his case moves towards appeal and release.

Books currently have no draft/publication field and are publicly listed. Client, server and database validation require a trimmed description of at least 20 characters; no new draft workflow was invented. Added the missing optional chapters.reading_time_minutes field already written by the existing book editor, resolving that schema mismatch.

## Canonical transcripts

Admin navigation now includes /admin/transcripts behind existing server authorization. The page offers canonical metadata, pagination, refresh/polling, loading/error/empty states, metadata editing and intentional publication. Default paste-URL import reuses register_youtube_transcript and configured ingestion/quotas. Existing canonical IDs are returned without replacement or a provider call. Supadata remains the default; Gladia was not enabled and no paid provider request was made for testing.

Secondary Manual Import accepts SRT, WebVTT and explicit start --> end timed pasted cues, with optional English cues matched by real offsets/durations. Untimed content is rejected (option B); timestamps are never fabricated. Limits and timing/content validation run on the server and database. New service-only admin_import_youtube_transcript verifies the actor's canonical Admin role, takes a canonical-ID lock, deduplicates, then calls the existing index_youtube_transcript inside a transaction. Existing segment/token generation and enrichment are reused. English is attached to the corresponding generated segments, using existing translation state, without queueing a paid translation job. New manual imports default to unpublished. No manual-only segment/token tables were created, and existing history is returned without overwrite.

Explore links to /explore/search, which uses one existing search_transcript_word RPC with ranked cursor pagination. Existing exact, normalised, lemma and root ranking, including Hans Wehr enrichment, is preserved. Results show stored source snippets, English when available, context, matches and real timestamps. Links open /transcripts/[id]?t=seconds. The public viewer explicitly requires ready + searchable, loads the appropriate segment window, and reuses useYouTubePlayer with the exact fractional timestamp. Earlier/later pagination reads canonical segments. No service credentials, raw provider data or private user library data are returned to the browser.

## Applied migrations and storage

1. Existing 20260930152212_chapter_audiobooks.sql (unchanged): audio and progress tables with RLS and service-only access, previously absent live.
2. New 20261003222308_website_transcript_admin.sql: missing reading_time_minutes, conditional blank descriptions, meaningful-description constraint, service-only canonical manual import RPC.
3. New 20261003224027_website_manual_unicode_integrity.sql: additive correction to the manual RPC Arabic guard, using encoding-independent PostgreSQL Unicode escapes. The initial migration's regex was damaged by Windows shell encoding; tests exposed it and the correction was applied without rewriting migration history.
4. New 20261003224405_audiobook_integrity_indexes.sql: chapter foreign-key index on progress and explicit service-role-only audio RLS policies.

The private bucket was created/configured by the existing npm run setup:audiobooks script, not by a second uploader or bucket system. No Edge Functions were deployed in this task.

## Validation

- Full website Vitest run: 60 files, 320 tests passed.
- Additional final player/audio run: 2 files, 10 tests passed, including two new exact-seek/pagination player tests. These two tests were added after the full run.
- npm run lint: passed; npx tsc --noEmit: passed.
- npm run build: production compilation passed, including new Admin/search/viewer routes.
- supabase/tests/website_transcripts.sql: passed with all fixtures rolled back; covers canonical indexing/tokens, timed input, correct English/time/order, unpublished exclusion, published search for two authenticated identities, duplicate/history preservation, non-Admin rejection, private audio access, descriptions and disabled Gladia.
- Existing shared public_explore.sql: passed (read from the existing mobile repository without modifying it), covering exact/normalised/lemma/root search, control false matches, deduplication/quota and guest isolation.
- Historical Dgj9fQYbCZY transcript still has 170 segments.
- SQL EXECUTE audit: private transcript worker/register/index/translation/provider/guest/manual Admin functions remain unavailable to anon/authenticated. Existing public search RPC retains its intentional public grants.
- Both Supabase security/performance advisors rerun. New audio missing-policy/FK issues resolved; the new unused-index INFO is expected before workload. Existing unrelated findings remain, including mutable get_vocab_level_theme_stats search_path, pg_trgm in public, public execution of existing bump_content_version/rls_auto_enable and memory functions, Auth password protection, existing RLS/init-plan/index notices. They were not expanded into this task.
- Production HTTP checks: search page serves successfully; stored transcript serializes t=300.18 and canonical segments; protected Admin/Reviewer pages emit Next.js redirect to / and no Admin form; nonexistent transcript emits Next.js 404 boundary. Next streaming responses carry HTTP 200 with redirect/not-found markers, so raw status alone was not treated as authorization proof.

Advisor references: [Security Definer grants](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [RLS policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [foreign-key indexes](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys), [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Outstanding browser verification

No browser is connected to this Codex session (browser inventory empty; in-app browser unavailable). Connecting a signed-in Admin browser is required for the remaining on-screen Reviewer/Admin import/upload/refresh walkthrough and real YouTube/MP3 playback. Automated server/DOM/database checks pass, but these are not represented as a completed real-user playback test. No fake audio, permanent SQL test records or paid provider call were used to bypass this limitation.

## Every changed website file

- `app/(admin)/admin/components/AdminNav.tsx`
- `app/(admin)/admin/components/BookEditDialog.tsx`
- `app/(admin)/admin/components/ChapterEditDialog.tsx`
- `app/(admin)/admin/transcripts/AdminTranscripts.tsx`
- `app/(admin)/admin/transcripts/page.tsx`
- `app/actions/admin.ts`
- `app/actions/audiobooks.test.ts`
- `app/actions/audiobooks.ts`
- `app/actions/storage.ts`
- `app/actions/transcripts.test.ts`
- `app/actions/transcripts.ts`
- `app/components/navbar/MobileDrawer.tsx`
- `app/components/navbar/NavigationAccess.test.tsx`
- `app/components/navbar/UserMenu.tsx`
- `app/explore/page.tsx`
- `app/explore/search/TranscriptSearch.test.tsx`
- `app/explore/search/TranscriptSearch.tsx`
- `app/explore/search/page.tsx`
- `app/lib/manualTranscripts.test.ts`
- `app/lib/manualTranscripts.ts`
- `app/lib/supabase/database.types.ts`
- `app/transcripts/[id]/TranscriptViewer.test.tsx`
- `app/transcripts/[id]/TranscriptViewer.tsx`
- `app/transcripts/[id]/page.tsx`
- `docs/website-transcripts-audio-reviewer.md`
- `next.config.ts`
- `scripts/setup-audiobook-storage.mjs`
- `supabase/migrations/20261003222308_website_transcript_admin.sql`
- `supabase/migrations/20261003224027_website_manual_unicode_integrity.sql`
- `supabase/migrations/20261003224405_audiobook_integrity_indexes.sql`
- `supabase/tests/website_transcripts.sql`

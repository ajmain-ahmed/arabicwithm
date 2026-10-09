# Transcript import timeout repair — 9 October 2026

## Confirmed failure

Supabase Postgres logs show SQLSTATE `57014` at 16:17:10 UTC (and repeated earlier failures). The call chain was:

`AdminTranscripts → importAdminManualTranscriptResult → admin_import_manual_source → admin_import_grouped_transcript → admin_import_youtube_transcript → index_youtube_transcript → transcript_private.classify_for_you`.

The canceled statement was the classifier's cohort-wide intro-window comparison and peer segment score update, at line 39 of the old function. It counted distinct matching peer transcripts using correlated fingerprint-array scans, then repeatedly looked up flagged segment IDs during the update. The `unknown channel` cohort had 1,558 windows across 23 transcripts. The existing cohort, transcript-position, fingerprint GIN and dictionary indexes were present. RLS and canonical guards were inspected and preserved. The logs establish the classifier as the failing operation; they do not establish that token payload size or RLS caused this incident.

A diagnostic comparison using the old array intersection and a bounded peer search took 105.75 seconds. Replacing repeated array lookups with materialized fingerprint rows and a set-based shared-hash join found the same 142 qualifying windows in 2.31 seconds. The complete deployed replacement classifier ran in 4.21 seconds on that live cohort, under an 8-second statement limit. These are observations for this database and cohort, not universal latency guarantees.

## Changes

Migration: `20261009164750_resumable_manual_transcript_import.sql`, applied to project `whbxgwucsoguqzpnpzjd`.

* The existing manual import and edit indexer now enqueues classification instead of running cross-transcript classification inside the import transaction. Generated ingestion retains its existing behavior. The existing five-minute classification cron remains in use. New manual transcripts are withheld from For You until classification finishes; explicit existing feed exclusions are preserved. Search publication still requires a complete ready transcript.
* The classifier expands each fingerprint array once, joins shared hashes and compares each window pair once. The original 80% similarity threshold, two distinct peer requirement, music handling, channel cohorts, peer reclassification and `exclude_best_stories_intro` call are preserved.
* Private, RLS-protected job and batch tables track immutable source data and transactionally committed checkpoints. Public RPC wrappers are invokers and executable only by `service_role`; their private implementations verify the authenticated administrator's actor ID and job ownership. The browser never receives a privileged key.
* Preparing creates a staged `indexing` record with publication disabled and infinite worker lease/next-attempt dates. This reserves the video without letting the ingestion worker claim an unfinished manual import. Existing videos and Shows episodes are rejected rather than overwritten.
* Each append saves an ordered batch of segments, bulk search tokens, optional canonical projections, dictionary enrichment and its checkpoint in one transaction. Defaults are 100 segments and 512 KiB of source data; smaller batches are selected by payload size. An individual segment is kept intact even when it exceeds the target size. Dictionary lookups are restricted to the batch's surfaces and lemmas. There are no per-token network calls.
* Search tokens retain the established whitespace-word indexing rules. Uploaded enriched token arrays and arbitrary segment/token metadata remain complete in the saved source, including unusable optional enrichment. Canonical projections retain their existing six-field contract. Arabic diacritics, English, timestamps, duplicate start times and unknown final endpoints are preserved.
* Stable source/settings hashes reuse the same job. Replaying a committed offset is idempotent. A source-free Resume import action continues a staged row after closing the form or reloading the page. Retries affect the failed request only: at most four attempts, with 500/1,000/2,000 ms backoff. A database statement timeout also reduces the batch size. Persistent failures retain committed work and report an error.
* Finalisation independently checks source-word token counts, saved segment/token/canonical counts, original text, translations, positions and timestamps. Only then does it save the original JSON/source snapshot, publish according to the administrator's setting, release the worker lease and mark the job complete.
* The admin form reports Preparing transcript, Importing segments and tokens, committed percentages, Finalising import and Import completed. It only reports 100% and success after verified finalisation.

## Configuration and deployment

Server environment options:

```
TRANSCRIPT_IMPORT_BATCH_SIZE=100     # 1–100
TRANSCRIPT_IMPORT_BATCH_BYTES=524288 # 16384–1048576
```

Invalid values fall back to the conservative defaults. SQL clamps valid bounds independently. No database timeout was raised or disabled. The original JSON format, transcript/group tables and read policies were retained.

The database hotfix is already live and also fixes the currently deployed legacy import RPC's classifier timeout. Deploy the updated website build to expose the batch/progress/resume UI. The old RPC remains available for compatibility; the updated website's import actions and UI use the new batch RPCs. Imports queued for classification may take up to the existing cron interval to appear in For You.

## Verification

* Real PostgreSQL tests cover small imports, a 2,400-segment enriched import with 28,800 source tokens and 4,800 search tokens, original snapshots, grouping, diacritics, nullable and repeated timestamps, byte-aware batches, checkpoint replay, source-free resume, injected `57014` rollback/recovery, missing-record publication failure, duplicate protection and non-admin/client denial. Queries commit between batches in the local PostgreSQL fixture.
* A regression oracle compares the replacement classifier with the original implementation when a third matching transcript arrives.
* Live database verification imported the same large fixture in 24 bounded append statements under an 8-second per-statement limit, replayed the first checkpoint and resumed from the saved row. All 2,400 segments, 28,800 projected source tokens and 4,800 search tokens were present; order, timing and full raw source matched. A small import through the existing legacy RPC also succeeded and enqueued classification. Live test writes were rolled back.
* Live pre/post checks retained 130 transcripts, 7,491 segments, 36,038 search tokens, six groups and 23 memberships. The existing transcript row checksum was identical. No existing records were deleted or overwritten.
* Browser tests cover start-only imports with unknown and supplied duration, repeated timestamps, optional enrichment retry, structural validation, committed progress, an injected timeout leaving an unpublished draft, and source-free resume after a page reload.

Supabase's advisory report was also checked; its cached findings predated this migration. Direct privilege/RLS checks and client-role regression tests verify the new mutation boundary. Private job tables intentionally have no client read policies.

Final validation: 162 tests passed across the 10 import-related suites, six Playwright browser tests passed, ESLint passed, and the final production build passed. The broad suite passed 710 tests with three skipped; its one stale-module result after an in-flight helper edit was covered by the successful final focused rerun.


## Manual import form drafts

The Manual Import dialog also has Save draft beside Cancel and Import. Migration `20261009172655_manual_transcript_form_drafts.sql` is applied to the shared database.

Drafts retain exact form strings: title, URL, channel, JSON, duration, duration format, publication preference and destination group. Incomplete or invalid input can be saved without reserving a YouTube video, creating transcript rows or publishing anything. The admin group browser has a permanent Drafts group; each administrator sees their own drafts. Open draft restores the saved fields, and Save draft updates the same stable identifier. Version checks prevent stale tabs from overwriting or deleting a newer save. A draft is removed only after a verified successful import; failed imports or cleanup conflicts retain it.

Draft storage is private, has RLS enabled and no client grants, and is accessed through authenticated admin server actions and service-only, role-checked RPCs. The Supabase [RLS Enabled No Policy informational notice](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) is expected for this private RPC-only table. A live service-role transaction verified exact incomplete-text round trips and idempotent saves, then rolled back its test writes; existing transcripts and groups were unchanged.

Final validation including form drafts: 173 tests passed across 11 relevant suites; seven browser tests passed, including save/reload/reopen/update/import of an unfinished draft; lint and the production build passed. Website deployment remains pending.

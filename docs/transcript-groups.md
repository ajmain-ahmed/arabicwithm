# Standalone manual transcript groups

Admin → Transcripts lists only `youtube_transcripts` with `provider=manual`, `source_origin=website_admin_transcript`, no `episode_id`, and no matching episode YouTube ID. Shows, Episodes and their JSON/relationships are untouched.

## Restoration

Live inspection found 12 eligible existing manual imports. They had not been deleted. The grouping RPC and tables were missing from production, causing the new page to fail loading. An assignment-first inner join would also have hidden any old records without membership.

Applied `20261008171140_standalone_transcript_groups_restore.sql` adds the missing grouping tables/RPCs and lists from actual transcript rows with a LEFT JOIN to optional assignments. No records are copied or backfilled. Missing assignments and null `group_id` both mean the virtual Ungrouped section, expanded by default. After migration, the RPC returned all 12 old imports with zero assignment rows. Before/after hashes of all 119 transcripts, all segments, Shows and Episodes matched.

## Groups and saves

Groups are flat in the UI. Existing internal `parent_id` is preserved for compatibility; creation always uses null and each group shows only its direct assignments. Parent controls and parent/child display paths are removed. Groups expand/collapse, show an explicit empty state and offer Add Transcript with that group preselected. Import still accepts no group. New groups appear immediately and can be selected without losing form edits.

Tables have RLS and no client-role grants. Service-only RPCs independently verify the database admin role. Group deletion is restricted while referenced; it never deletes transcripts.

Group-only saves use `admin_move_standalone_transcript`, updating only the assignment row, with transcript-version and prior-assignment conflict checks. They never change transcript JSON, timestamps, title, URL, publication, translation, indexing, search rows or transcript `updated_at`. Formatting JSON does not cause a content rewrite. Actual edits use shared server normalization and the existing live canonical indexer in one transaction.

## Search and form

Search normalizes Arabic variants, case, punctuation and whitespace before pagination and clears the group filter to reveal global matches. Counts are database-wide and assignments optional. Dropdown labels always float with an outlined notch; long selected names truncate within the responsive control.

Duration input appears above compact Minutes & Seconds / Hours, Minutes & Seconds toggles and the retained explicit minutes mode. A circular info button supports hover and tap. MM:SS, HH:MM:SS and millisecond precision retain the existing parser. Fully timed JSON does not need duration; start-only JSON uses actual video duration or the explicit fallback.

## Verification and deployment

Regression coverage includes old records without assignments, unrelated/Show exclusion, pagination, flat groups, imports without groups, preselection, moves both ways with complete row snapshots, concurrency conflicts, permissions, JSON/token preservation, duration layout and tap help. Live move and content-edit checks run in a rolled-back transaction. No production transcript records are modified by verification. All 208 focused unit/database tests and seven browser acceptance tests passed, along with lint, TypeScript and the production build. Desktop/mobile screenshots were reviewed.

The database repair is live. Website UI/server-action changes require deployment of this checkout. Do not blindly apply historical pending transcript migrations over the live canonical pipeline; the restoration migration is independently compatible with the inspected live schema.


## Files changed for this repair

- `app/(admin)/admin/transcripts/AdminTranscripts.tsx` and `AdminTranscripts.test.tsx`
- `app/(admin)/admin/transcripts/TranscriptGroups.tsx`
- `app/(admin)/admin/transcripts/TranscriptDurationField.tsx`
- `app/actions/transcripts.ts` and `transcripts.test.ts`
- `app/lib/supabase/database.types.ts`
- `app/lib/standaloneTranscriptGroupsMigration.test.ts`
- `supabase/migrations/20261008171140_standalone_transcript_groups_restore.sql`
- `e2e/fixture-server.mjs`, `e2e/manual-transcript-import.pw.ts`, `e2e/standalone-transcript-groups.pw.ts`
- `docs/transcript-groups.md`

No Shows/Episodes/Books/Flutter source files changed. The migration only adds admin grouping tables and functions; it does not add columns to transcript storage or replace the shared indexer/search functions.

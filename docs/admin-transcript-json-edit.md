# Admin transcript JSON editing

The website's existing Edit Transcript dialog now includes the same large JSON
field as Manual Import, plus Format JSON and Download JSON. It remains open after
saving, with Save Changes / Saving… / Saved states. Editing uses the existing
`normaliseManualTranscriptJson` function and the same accepted AWM formats.

## Storage and reconstruction

Manual Import stores normalised `content[]` in
`public.youtube_transcripts.raw_transcript` (JSONB), not the verbatim pasted text.
`public.transcript_segments` stores ordered Arabic/English and timing;
`public.transcript_tokens` is the existing lexical search index.
Shared generated transcripts can also have `canonical_transcript` and
`canonical_paragraph` token data.

Editor and download JSON come from the complete paginated segment collection.
Exact matching raw chunks supply retained sentence IDs, paragraph grouping,
plain Arabic and complete token objects (including IDs, glosses and timing).
Canonical paragraphs supply tokens when absent from raw chunks. Indexed Arabic,
English and millisecond intervals remain authoritative. The portable output is
`{content:[{text,offset,duration,english,...}]}` and can be pasted back into either
Manual Import or Edit. `offset` and `duration` use milliseconds.

Downloads contain currently saved data, independent of unsaved editor text, as a
UTF-8 JSON Blob with a sanitised title-based filename. Formatting only calls
JSON.parse/JSON.stringify; it never normalises or saves data.

## Atomic save

`saveAdminTranscriptJson` authorises the actor, normalises and validates the JSON,
then calls the service-only `admin_update_transcript_json` RPC. The migration
extracts Manual Import's existing database validation into a private helper used
by both paths. No duplicate transcript is registered.

The transaction locks the existing row and checks its loaded `updated_at` before
replacement. It removes old child segments (search tokens cascade), invokes the
existing indexer, applies current English and canonical tokens, and updates the
same transcript. Stale translation jobs are removed under their worker lock so
old responses cannot overwrite edits. Indexing failure rolls back every change,
including child deletion. Active acquisition/indexing cannot be edited.

Identity, URL/YouTube ID, ownership, creation date, provider/source information,
library associations and feed choices stay intact. Title/channel/publication use
the explicit existing form fields. Generated publication still requires complete
English. The existing publication trigger cannot silently republish an explicit
opt-out. Video duration is preserved or extended to cover edited content.

Search is rebuilt through the existing indexer. Admin, viewer and Explore/Search
paths are revalidated; Explore source is unchanged.

Malformed JSON and multiple malformed sentences are reported before mutation.
Saving disables the editor/button and has a synchronous duplicate-submit guard;
errors leave the text intact and clear the busy state. List refetches do not write
editor state. A request identity prevents a late load overwriting a newer dialog.
Version checks also reject an export assembled across concurrent saves.

## Verification and release

The targeted transcript suite passes 106 tests, including text/timing edits,
segment insertion/deletion, token retention, unchanged identity/metadata,
malformed input, authorisation, rollback after indexing fails, concurrent edits,
publication preservation, downloading, external JSON round-tripping, formatting,
duplicate submissions and preserving unsaved edits during refresh. Database tests
run SQL in isolated PGlite Postgres with the legacy and website indexers and the
new migration. They do not modify production content.

TypeScript, targeted ESLint and the production build pass. Live Admin acceptance tests were not run against production. The full 94-file suite did not complete during the verification window, including a retry with two workers; that run was stopped. The 106 targeted transcript tests, TypeScript, lint and production build completed successfully.

Apply `supabase/migrations/20261008133217_admin_transcript_json_edit.sql` to the
shared database before deploying the website changes. The migration has been
validated locally, not applied to the live Supabase project.

## Files changed

- `app/(admin)/admin/transcripts/AdminTranscripts.tsx`
- `app/(admin)/admin/transcripts/AdminTranscripts.test.tsx`
- `app/actions/transcripts.ts`
- `app/actions/transcripts.test.ts`
- `app/lib/manualTranscriptJson.ts`
- `app/lib/manualTranscriptJson.test.ts`
- `app/lib/supabase/database.types.ts`
- `app/lib/transcriptJsonEditMigration.test.ts`
- `supabase/migrations/20261008133217_admin_transcript_json_edit.sql`
- `docs/admin-transcript-json-edit.md`

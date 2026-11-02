1. Identification: canonical `youtube_transcripts.source_origin = user_import` identifies Import Video transcripts. Admin reuse now preserves this marker. Provider, title, dates and user ownership are not used as substitutes.

2. Persistence: existing `youtube_transcripts` stores canonical JSON, raw timed transcript, metadata and status permanently. Existing `admin_manual_transcripts` stores only the canonical transcript reference/group relationship. Personal `user_video_library` unlinking leaves the canonical transcript and Admin reference intact; rollback SQL verifies this. No local storage or temporary content store was added.

3. Imports implementation: the existing Admin Transcripts group browser, cards, editor, preview, independent publication controls and JSON download are reused. Imports has system key `app_imports`; manual assignment, rename and deletion are protected. Failed/incomplete imports remain diagnostic cards with Edit and Download disabled. Existing groups, including the separate legacy Imported group, remain.

4. Group architecture: database-backed, using existing `transcript_groups` and `admin_manual_transcripts`. The existing service-only Admin query returns full totals and 30-row pages; app-origin records remain eligible even when connected to an episode. Episode-linked content retains the existing edit restriction.

5. Automatic assignment: registration references are routed by canonical origin; successful ready transitions repair membership. Existing app imports are backfilled. The visible Imports group uses the existing five-second refetch, so new imports appear without another frontend deployment. The Gemini pipeline is reused without another generation service or paid regeneration.

6. Existing imports: 2 detected and mapped: 1 ready and 1 failed. The failed item remains failed and cannot download an unfinished transcript. Total canonical transcripts remain 171. All pre-existing group IDs/names were retained.

7. Download: the existing server action, filename utility, Blob download and concurrency checks are reused. Ready app imports serialize the actual saved canonical JSON array, preserving AWM paragraph/token fields. No regeneration, enrichment or duration lookup occurs for download. Unchanged saved previews also use stored timing and canonical tokens. Manual transcript export remains unchanged.

8. Canonical identity: the same transcript IDs, YouTube IDs and saved JSON are reused. No transcript copy was created. Database snapshots confirmed canonical JSON/status/publication data unchanged by grouping.

9. Publication: searchable and For You publication remain independent. Group assignment does not update either field. Both existing app imports retain false for both flags; editor tests verify these are not enabled automatically.

10. Permissions: existing Admin route, server-action role guards and service-only listing RPC remain. Browser tests verify ordinary users are redirected; SQL verifies non-admin rejection and no direct anon/authenticated execution grant. Import cards do not include personal user IDs or account details.

11. Files changed:
    - app/(admin)/admin/transcripts/AdminTranscripts.tsx
    - app/(admin)/admin/transcripts/AdminTranscripts.test.tsx
    - app/(admin)/admin/transcripts/TranscriptGroups.tsx
    - app/actions/transcripts.ts
    - app/actions/transcripts.test.ts
    - app/lib/appImportTranscripts.ts
    - app/lib/appImportTranscripts.test.ts
    - app/lib/transcriptStatus.ts
    - app/lib/supabase/database.types.ts
    - e2e/fixture-server.mjs
    - e2e/app-imports-group.pw.ts
    - supabase/migrations/20261102101224_admin_app_imports_group.sql
    - supabase/migrations/20261102102010_preserve_app_import_origin.sql
    - supabase/tests/admin_app_imports_group.sql
    - docs/admin-app-imports-group.md
    - docs/validation/admin-imports-1280.png
    - docs/validation/admin-imports-390.png

12. Database/RLS: applied migrations `20261102101224_admin_app_imports_group` and `20261102102010_preserve_app_import_origin` to project whbxgwucsoguqzpnpzjd. Changes add the group, backfill reference relationships, protect automatic membership, extend the existing paginated list and preserve source provenance on Admin reuse. No new content table, RLS policy change, public grant or publication change.

13. Validation: 133 targeted unit/component tests passed across 5 files; 9 production-build browser tests passed, including new Imports checks and existing standalone-group regressions at 1280px and 390px. TypeScript, scoped ESLint and git diff whitespace checks passed. Rollback SQL passed before and after the migrations, covering registration, ready completion, manual exclusion, more than 30 rows, unique canonical IDs, personal unlink, provenance, private flags and permissions. Database content snapshots were unchanged. The production fixture build succeeded; screenshots were inspected. No new live paid Gemini generation was run: existing saved production data plus synthetic rollback fixtures validated integration. Database changes are applied; frontend changes are locally validated and have not been deployed. No commit or push was made.

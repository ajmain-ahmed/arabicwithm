# Website transcript generation repair

## Confirmed cause and live change

The error originated in `generateAdminTranscript`: Supabase returned a missing-function error for `admin_generate_youtube_transcript(uuid,text)`. Live inspection of project `whbxgwucsoguqzpnpzjd` confirmed the RPC and `website_generation` column were absent, and `20261004100332_website_transcript_generation.sql` was not in migration history. The active cron worker and a non-empty Vault `SUPADATA_API_KEY` already existed.

Production also contained newer canonical generation/enrichment migrations and Edge Function version 13 that this website checkout did not contain. Applying the old website migration unchanged would rename/wrap the live indexer and search RPC and install automatic publication behaviour. It was therefore **not applied**.

`20261008163950_website_generation_configuration_repair.sql` was applied using the connected Supabase migration workflow. Its local filename matches the version recorded by that workflow. It adds the missing website marker, millisecond reader columns, generation RPC and atomic review/save RPC. It reuses registration quotas, canonical records, the existing cron worker, Supadata credentials and the current indexer. The worker, canonical enrichment and shared-library search functions were not replaced. New drafts remain unpublished until explicit review/save.

Immediately before/after application, all 119 existing transcript records and segment content hashes matched (excluding newly added compatibility columns). The live indexer and search function hashes also matched. Both new RPCs deny `anon`/`authenticated` execution and allow `service_role`; their bodies independently verify the actor's database Admin role. Security advisors reported no findings concerning these new functions; existing unrelated advisories remain outside this change.

## Website changes

- `app/actions/transcripts.ts`: accepts YouTube IDs as well as URLs; distinguishes configuration, provider, permission and video errors; loads all generated JSON pages; saves reviewed JSON atomically with an optimistic version check.
- `app/(admin)/admin/transcripts/TranscriptGeneration.tsx`: generation/status and JSON review panel, explicit publication, saved JSON download and reader link. It remains separate from the manual-import grouping workflow.
- `app/(admin)/admin/transcripts/AdminTranscripts.tsx`: includes the generation panel again.
- `app/lib/transcriptStatus.ts`: actionable messages for missing/invalid enrichment credentials and invalid enrichment results.
- `app/lib/supabase/database.types.ts`: review RPC types.
- Tests and `scripts/check-generation-repair.mjs`: repeatable cached-generation REST verification without another provider purchase.

Manual JSON, duration/timestamp normalisation, Show JSON and the Flutter-compatible shared transcript tables/readers remain in use. The review RPC only permits proven Admin provider transcripts, never Show episodes or manual/curated records. Edits preserve transcript identity and provider/channel/video metadata and regenerate only that reviewed transcript's derived segments inside one transaction. Failures roll back the edit.

## Configuration

The website uses server-only `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`, and browser-safe `NEXT_PUBLIC_SUPABASE_URL` / the existing publishable key. The live REST verification used the configured website URL/service key successfully; no key values were logged.

The worker uses Supabase's server-provided `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`. Supadata resolves `SUPADATA_API_KEY` from its Edge environment or the existing Vault accessor. Vault presence/non-empty value was verified; its authentication against a fresh Supadata request was not tested.

The **deployed** canonical enrichment worker additionally expects `OPENAI_API_KEY` in Supabase Edge Function secrets. Its presence could not be read through the available connector. If enrichment reports `enrichment_not_configured`, configure that exact secret there. `GLADIA_API_KEY` is only required for the separately configured experimental provider; the Supadata workflow does not require it. No credentials were replaced or exposed to client code.

## Verification and limits

- 157 focused Vitest tests passed: generation/permissions, review/editor/download, manual JSON/timing and existing public reader regressions.
- Five existing Deno provider-worker mock tests passed: persisted acquisition, real millisecond timing, invalid timing rejection, translation alignment and provider-plan failures.
- TypeScript, targeted ESLint and production `next build` passed.
- The live Supabase REST generation RPC successfully reused existing Supadata video `3S3cFw0hvLs` and reopened all 1,131 raw and indexed segments. The new review/save RPC was exercised against that source inside an explicitly rolled-back transaction, with ready status and all 1,131 segments confirmed afterwards in the transaction. No existing transcript was permanently edited for this test.
- No new transcript/provider job was submitted and no credits were used, following the requested minimum-credit test. Fresh provider acquisition, current key validity and enrichment remain **unverified live**. Mock tests are not evidence of fresh provider success.
- The database configuration repair is live. The new website review UI is local and still requires deployment to the user's hosting project. This checkout has no linked hosting configuration. Its earlier manual grouping/JSON-edit migrations are also separate pending work; do not blindly run `supabase db push` against the advanced production schema or apply the old generation migration after this repair.

Thus the missing database RPC failure is resolved and verified through the application's REST connection. A fully deployed fresh acquisition → enrichment → JSON review → saved/public reader workflow is not yet verified end-to-end.

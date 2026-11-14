# Production enrichment migration verification

Applied to `whbxgwucsoguqzpnpzjd` on 2026-11-14 using the explicit approval for the two named migrations. Only their exact SQL was applied, in order.

| Approved local migration | Production ledger name | Production version |
|---|---|---|
| `20261114135900_transcript_worker_auth_baseline.sql` | `transcript_worker_auth_baseline` | `20261114194430` |
| `20261114140000_content_enrichment.sql` | `content_enrichment` | `20261114194433` |

Both migration calls returned success. The Supabase migration tool assigned production timestamps, which differ from the local filenames. The latest production version before application was `20261110155210`, `durable_website_rate_limits`. The latest version afterward is `20261114194433`. Both new ledger entries were verified after application. Future migration-history reconciliation should use the mapping above.

## Created objects

Five tables exist with RLS enabled.

- `public.grammar_notes`
- `public.content_enrichment_jobs`
- `public.content_enrichment_examples`
- `public.content_enrichment_analysis_cache`
- `private.content_enrichment_revisions`

Nine public functions exist with service-role execution permission.

- `website_write_phrase`
- `website_queue_enrichment`
- `website_claim_enrichment`
- `website_commit_enrichment`
- `website_fail_enrichment`
- `website_claim_enrichment_analysis`
- `website_enrichment_cache`
- `website_scan_enrichment`
- `website_admin_grammar`

The private canonical source-version view, normalized Phrase index, normalization/identity helpers, and three trigger functions were created. The existing `transcript_worker_authorised(text)` verifier was present before migration and retained by the baseline migration.

Nine enabled triggers exist. Chapters, episodes, transcripts, and vocabulary each have persistence and deletion triggers. Transcript segments have a change trigger.

## Access verification

All five new tables have RLS enabled. There are zero table grants to `PUBLIC`, `anon`, or `authenticated`, and zero policies opening these tables to ordinary users. Service-role access is granted.

All nine new public functions deny execution to `anon` and `authenticated` and allow service-role execution. The five private normalization and trigger functions also deny ordinary-role execution. Existing chapter, episode, transcript, and Phrase policies match the pre-migration definitions.

## Data integrity

Full-row content hashes and counts matched before migration, after migration, and after the rolled-back production smoke tests.

| Existing table | Rows | Matching digest |
|---|---:|---|
| Phrases | 6 | `17c2562227d739af7ecdd84ec80684d3` |
| Books | 21 | `a9248a8bb382f2a91360cb39edd57b5a` |
| Shows | 24 | `fb3905d1f98656ccba937cabc580ae0e` |
| Chapters | 134 | `6def81611736f0a2e41581464a0e30a6` |
| Episodes | 127 | `da25b1bd8207ba7d33fc60a5c1989616` |
| Transcripts | 181 | `d4f5e4f5a40b159fb8a9f22ed74e6dbe` |

## Production smoke tests

Tests used explicit transactions ending in `ROLLBACK`. Temporary records and queue work were removed by rollback. PostgreSQL identity sequences can advance during a rolled-back insertion, so the Phrase test can leave an ordinary sequence gap.

- A newly inserted chapter persisted with its existing Book relationship and queued exactly two analyser jobs.
- A newly inserted episode persisted with its existing Show relationship and queued exactly two analyser jobs.
- A newly inserted ready Admin transcript persisted and queued exactly two analyser jobs.
- The worker successfully claimed the new transcript job. Calling the failure handler with a simulated provider error retained the exact transcript JSON and placed the job in its queued retry state.
- The canonical Phrase writer created a row, deduplicated its vocalized Arabic variant to the same identity, and successfully edited its meaning.
- Installed source/segment trigger definitions include their exception handlers. Enqueue-outage injection and recovery were previously verified against the same migration in local PGlite tests. Production smoke testing simulated a worker failure, without replacing production functions to inject a queue outage.

These verify database persistence and enrichment integration. Website/browser ingestion against the newly deployed application remains a deployment check. This operation applied database migrations only.

## Processing state

Historical backfill was **not started**. Neither scan function nor an enrichment processor was run against historical content. After rollback, production enrichment jobs and examples both contain zero rows, and Grammar Notes contains zero rows.

Future eligible database saves now create durable work through the installed triggers. Automatic processing still requires the website worker route and updated transcript-library dispatch to be deployed/configured. Contextual grammar analysis remains pending the chosen provider and its server configuration. No provider was fabricated or configured during this migration.

# Approval required: Phrase-only enrichment

Proposal only, 20 November 2026. No production mutation or migration was executed.

The new task's Part H says: “If a new production migration is genuinely unavoidable: STOP. Report exact SQL and reason. Wait for explicit approval.”

Read-only inspection of existing project `whbxgwucsoguqzpnpzjd` confirmed:

- `public.phrases` contains **6** rows; `content_enrichment_jobs` contains **0**.
- Episode, chapter, transcript and transcript-segment persistence triggers call the existing enrichment queue functions.
- The deployed `public.website_queue_enrichment` explicitly inserts both `phrases` and `grammar` via `unnest(array['phrases','grammar'])`.
- The deployed `public.website_claim_enrichment` claims either analyser without filtering.
- Queue triggers already catch enqueue exceptions, so a queue failure does not roll back the source save. That behavior should be preserved.
- The existing source-version view includes 127 Episodes, 177 eligible transcripts, 134 chapters and 23,655 vocabulary entries. These are inventory counts, **not** counts of sources scanned for phrases or phrases accepted.

Application changes cannot prevent those database triggers from inserting Grammar jobs. Immediately completing a Grammar job in application code would still violate the requirement that new content must not queue Grammar jobs. Editing an already-applied migration would not change production.

The [exact proposed SQL](phrase-only-enrichment.sql) replaces two existing function bodies with the same signatures and invoker privileges:

1. Queue only `phrases`, preserving existing deduplication, revisions, priorities and retry semantics. An ineligible source returns without deleting jobs. Only superseded Phrase provenance is marked inactive; Grammar provenance is preserved.
2. Claim only Phrase jobs. Any historical Grammar job remains stored and dormant.

No new table, column, queue system, role, grant, credential or project is proposed. No `DELETE`, `TRUNCATE` or `DROP` statement is included. The SQL does not start a historical scan or call the worker.

Isolated verification: `vitest run supabase/tests/phraseOnlyProposal.test.ts --maxWorkers=1` passed **3/3 tests** against the existing in-memory migration fixtures. These cover Phrase-only chapter/Episode/transcript enqueue, unchanged historical Grammar jobs, Phrase-only claiming, duplicate-free requeue, failed-job retry, missing-source preservation, and successful source persistence during an enqueue outage. This is proposal validation, not production execution or the requested whole-site browser gate.

After explicit approval, create a new migration using the installed CLI's inspected migration command, test it against isolated migration fixtures (including unchanged Grammar history, Phrase-only enqueue/claim, retry and source-save failure safety), and apply only the reviewed SQL to the named existing project. Continue with website retirement, read-only corpus discovery, the requested quality sample, additive idempotent Phrase backfill, and the full four-browser regression. Approval of this SQL does not waive the discovery/quality gate or authorize deletion of content.

At this stop point, Grammar product removal, corpus discovery, Phrase backfill and the new browser regression have **not** been performed. No application or Edge deployment occurred. Prior browser results do not count as validation of this new task.

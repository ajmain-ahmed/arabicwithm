# Automatic Phrase and Grammar enrichment

## Delivery status

The repository implementation and local workflow tests are complete. The two approved database migrations are now applied. Worker/application activation and full contextual grammar-quality acceptance remain pending. See [production migration verification](enrichment-production-migration.md).

Production database migrations applied **YES** following explicit approval. Production smoke-test writes were rolled back. Existing content counts and full-row hashes match. Model calls and deployments remain zero. The earlier corpus audit used read-only queries.

Contextual A1–C2 discovery requires a configured analysis provider, and automatic processing requires deployment and worker configuration. The requested 80-example corpus review currently has 51 available example analyses across five distinct rule candidates.

## Existing architecture

### Phrase Library

The canonical table remains `public.phrases`. Its fields are generated bigint `id`, unique exact `phrase_ar_di`, optional `phrase_tr`, required `english`, optional `cefr`, optional `notes`, and timestamps. The read-only audit found six existing rows. There is no separate CSV column in this schema.

The existing `/admin/phrases` page and `updatePhrase` Server Action remain the Admin entry points. The action now delegates to the shared `website_write_phrase` RPC, which supports creation and editing with normalized duplicate checks. Automatic extraction uses that same writer. Existing IDs, definitions, transliterations, and notes take precedence when a match exists. Admin Phrase reads now paginate through all rows.

### Ingestion paths

Canonical containers are `chapters.content`, `episodes.transcript`, ready Admin/AWM `youtube_transcripts` and their `transcript_segments`, plus curated `vocabulary.examples` and suitable multi-word lexical entries. Books and Shows contribute parent identity and titles. Their Arabic text arrives through chapters and episodes.

Database persistence triggers cover the existing Admin actions, manual transcript imports, and the transcript-library worker without duplicating extraction in each caller. A source transaction queues work after successful persistence. Trigger exceptions leave a valid source save intact, and reconciliation scans can recover missed jobs.

### Analysis and background infrastructure

The existing transcript-library worker already has authenticated, scheduled processing. It can now dispatch two bounded enrichment claims through `/api/admin/content-enrichment/work`. The route verifies the existing worker token server-side. Durable database jobs hold cursors, source hashes, leases, attempt counts, and status.

The website has no configured general grammar-analysis provider. The available speech-transcription service does not supply this capability. I selected a provider-independent authenticated HTTPS endpoint contract. Its server-only implementation is in `provider.ts`. Authored evidence remains usable while the missing contextual provider produces a visible warning.

## Phrase enrichment

- **Automatic trigger** queues separate Phrase and Grammar jobs for persisted eligible content. Personal user imports and unfinished transcript jobs are excluded from privileged enrichment.
- **Detection** uses explicitly authored phrase tokens, phrase identity, phrase-level glosses and transliterations, suitable curated multi-word vocabulary entries, and 30 known expressions. It also recognizes the discontinuous `مَا إِنْ … حَتَّى …` construction.
- **Validation** rejects arbitrary adjacent-word combinations, cross-sentence matches, Latin-only labels, and incomplete lexical alternatives. A new row needs Arabic, phrase-level English, and transliteration. Existing valid IDs can supply an established identity.
- **Normalization** uses compatible Unicode normalization and removes optional diacritics, tatweel, punctuation, and harmless spacing differences. Display text retains the authored vocalization. Underlying Arabic letters remain distinct.
- **Deduplication** checks exact Arabic, normalized Arabic, then an existing authored phrase ID. Advisory locks serialize normalized creation. Automatic extraction preserves existing curated fields.
- **Automatic-add threshold** is at least 0.98 confidence. Current accepted evidence receives 0.99. Uncertain discoveries produce no Phrase insertion. The existing Phrase model has no candidate-publication state.
- **Provenance** records source and parent IDs/titles, stable unit keys, exact Arabic, translation, source URL, original video URL, timestamps, source version, and processing run.
- **Tests** cover genuine additions, existing identities, tashkīl/Unicode variants, three source occurrences, reruns, manual-field preservation, random fragments, and sentence boundaries.

## Grammar Notes

### Schema

`grammar_notes` stores stable UUID and canonical rule key, English/Arabic titles, rule CEFR, category, learner explanation, optional detail, confidence, review state, timestamps, and merge destination.

`content_enrichment_examples` relates a Phrase or Grammar rule to exact source occurrences. Grammar examples have their own Candidates/Approved/Rejected state. Example difficulty is separate from rule CEFR. New examples attached to an approved rule still need review. Reprocessing preserves unchanged example review decisions and returns changed analyses to Candidates.

The remaining new tables hold durable jobs, a leased model-result cache, and transcript segment revision numbers. New tables have RLS enabled with service-only access. Admin actions verify the current Admin identity before every read or write.

### Admin workflow

`/admin/grammar-notes` uses the existing navigation and design system. It supports Candidates, Approved, Rejected, CEFR/category filters, search, paginated inspection, editing, rule approval/rejection, individual example review, merging, scans, progress/status, and retry.

Approval covers the loaded candidate examples explicitly submitted for review. Additional examples stay pending. Approved notes remain editable. A new candidate example makes an approved rule discoverable in Candidates without changing its approved rule status.

### Rule clustering and examples

Canonical keys and known name aliases group repeated rules. Unknown Arabic names receive a deterministic normalized identity. Admin merges retain an alias so future discoveries continue attaching to the chosen rule. Similar unfamiliar names may still require an Admin merge.

Source Arabic and authored explanations are preserved. Reconstructed forms belong in explanations. The UI highlights exact source substrings and shows Book/Chapter, Show/Episode, transcript, original-video, timestamp, and confidence information where available.

## Grammar quality

The provider instructions actively inspect nahw, sarf, and context-supported balaghah across A1–C2. They include complex conditionals, government, fronting, ellipsis, ishtighal, tanazu, weak-letter changes, assimilation, compensation, and rhetorical constructions. Output must identify an exact source unit and highlight. Validated generated analyses enter Candidates with a minimum confidence of 0.65.

The deterministic fallback uses specific authored lesson/role evidence and an unambiguous initial `لَمْ` trigger. Chapter titles alone cannot generate a rule candidate. It supplies provisional candidates while contextual analysis is unavailable.

### Read-only corpus distribution

The audit completed at 2026-11-14 18:23 UTC with the shared adapters. Counts below are distinct authored-evidence rule candidates. They describe the fallback audit, with contextual model discovery still pending.

| CEFR | Distinct rule candidates |
|---|---:|
| A1 | 0 |
| A2 | 0 |
| B1 | 1 |
| B2 | 1 |
| C1 | 3 |
| C2 | 0 |

These five rules have 1,559 source occurrences, comprising 1,528 B1, 18 B2, and 13 C1 analyses. C2 coverage has local contract tests and targeting instructions, with live corpus validation still outstanding.

### Examples and manual inspection

- **B2** includes authored weak-letter changes in `قَالَ`, `بَاعَ`, `يَقُولُ`, `يَعِدُ`, and `لَمْ يَقْضِ`. Two estimated-ending examples need Admin judgement about the breadth of their authored الإعلال grouping.
- **C1** includes Form VIII substitution in `اِصْطَبَرَ` and `اِزْدَهَرَ`, compensation in `عِدَةٌ` and `إِقَامَةٌ`, and explicitly annotated adjective government in `الْوَرْدَةُ جَمِيلٌ لَوْنُهَا`.
- **C2** has zero discovered corpus candidates in this fallback audit. Controlled C2 UI/test examples are excluded from these figures.
- **False positives removed** include a chapter-wide الإعلال title leaking into an الإبدال section and the ordinary sentence `لَوْنُ الْوَرْدَةِ جَمِيلٌ` inheriting an advanced government label. Ambiguous combined-rule sections defer to contextual analysis.
- **Explanation-style QA** retains real Arabic terminology, explains the change and its reason in learner English, and keeps exact examples separate from explanatory reconstructions. Authored per-example explanations appear alongside the shared rule explanation.

The requested manual sample has 20/20 beginner/intermediate, 18/30 B2, and 13/30 C1/C2 example analyses. An additional 12 B2 and 17 C1/C2 examples are required. These are agent QA observations with provisional CEFR judgements. Admin review remains the authority.

The full source samples, identities, and inspection findings are recorded in the audit artifacts. Production source records loaded successfully through read-only access. Source-link rendering and authorization were tested locally. Live navigation through the new Admin page awaits deployment. [Corpus samples](../artifacts/content-enrichment/review.md), [manual inspection](../artifacts/content-enrichment/manual-review.md), [machine-readable audit](../artifacts/content-enrichment/audit.json).

## New-content workflow

The PGlite integration test uses the actual migration, real source loaders, queue claims, commit functions, and shared enrichment service. Only the external model response is controlled test data.

| Workflow | Persisted canonical source | Phrase result | Grammar result |
|---|---|---|---|
| Standalone transcript | Ready AWM transcript | Shared phrase row and source occurrence | Candidate with exact transcript example |
| Imported YouTube transcript | Ready Admin transcript with original URL | Same phrase identity and new occurrence | Same rule with imported-source example |
| Show/Episode | Saved episode transcript and Show parent | Same phrase identity and episode occurrence | Same rule with Show/Episode provenance |
| Book chapter | Saved chapter and Book parent | Same phrase identity and chapter occurrence | Same rule with Book/Chapter provenance |

Across all four paths the test produces one Phrase row, one C1 rule candidate, and four exact occurrences for each. Identical model input is requested once through the shared cache. Reruns retain row counts and source hashes. This demonstrates pipeline integration with a controlled provider response. It does not establish live model quality.

## Backfill

| Canonical source | Containers | Logical units | Empty containers |
|---|---:|---:|---:|
| Chapters | 134 | 18,926 | 0 |
| Episodes | 127 | 2,109 | 2 |
| Ready eligible transcripts | 177 | 12,678 | 0 |
| Vocabulary | 23,655 | 38,884 | 0 |
| Total | 24,093 | 72,597 | 2 |

The audit examined 24,091 nonempty containers and proposed 2,044 distinct normalized Phrase keys. Of those, 2,038 keys were unmatched against the six existing library entries. Existing-ID resolution can further reduce actual insertions. These figures are proposals from a read-only run.

Production enrichment jobs already processed **0**. Newly persisted production enrichment results **0**. Audit read failures/warnings **0**. Contextual-provider warnings remain an expected operational state until configuration is supplied.

Admin scans page through at most 100 sources per action. Full backfill and new/unprocessed scans use the same jobs and analysers. New saves have priority over backfill. A source version and per-analyser completion marker prevent redundant completed work. Failed and warning jobs can be retried.

## Reliability

- Independent Phrase and Grammar jobs isolate failures. Enrichment commits cannot roll back an already persisted source.
- Claims use `FOR UPDATE SKIP LOCKED` with 90-second leases. Expired claims can recover after a worker interruption.
- Source hashes and lease checks reject stale commits. Stable source/unit/target identities prevent duplicate relationships.
- Exceptions receive safe Admin error codes. Retries use exponential backoff with three bounded attempts. Admin can retry deliberately.
- Each model request has at most 12 logical units and 18,000 text/context characters, a 20-second timeout, an idempotency key, a response-size bound, and a distributed cache lease.
- Failed queue insertion is tested independently from source persistence. Incremental reconciliation recovers the missed work.
- Source edits retire stale occurrences. Deleted or newly ineligible sources retire occurrences and pending jobs while curated library entries remain available.
- Tests compare source content and hashes across successful runs, reruns, and provider failures.

## Engineering

### Migrations and activation

The exact proposed SQL is available in these two files. Both were tested locally and applied to production after explicit approval. Production ledger versions and verification are recorded in the linked migration report.

1. `supabase/migrations/20261114135900_transcript_worker_auth_baseline.sql` exports the existing worker-verification dependency. Existing installations retain their function and permissions. Fresh installations fail closed until their transcript-worker settings exist.
2. `supabase/migrations/20261114140000_content_enrichment.sql` creates the Grammar, occurrence, job, cache, and revision structures, normalized Phrase index/writer, source adapters/version view, persistence triggers, worker RPCs, and Admin RPC. It grants the new capabilities to service-role execution.

The migration has no bulk source-content update or automatic corpus backfill. Existing Phrase rows retain their values. Future saves queue jobs through the new triggers. Historical processing is a deliberate Admin scan. The transaction uses a five-second lock timeout and a 30-second statement timeout.

With the migrations applied, deployment of the website and updated transcript-library function is the remaining activation step. Set `AWM_ENRICHMENT_WORKER_URL` on that Edge Function to `https://arabicwithm.com/api/admin/content-enrichment/work`. Its existing authenticated scheduled worker will dispatch work using its existing token. Admin batch processing also exercises the same claims.

For contextual discovery, configure server-only `CONTENT_ANALYSIS_URL` and `CONTENT_ANALYSIS_TOKEN`. The endpoint must accept the request contract in `provider.ts` and return its `notes` JSON schema. A raw vendor API URL will need a vendor adapter or compatible endpoint. Provider choice is awaiting your response. This endpoint contract was my implementation choice in the absence of an existing configured service.

### Tests

- Focused enrichment suite passed **42 tests**, with the opt-in live corpus audit skipped during normal unit runs.
- Full unit suite passed **1,519 tests**, with **5 skipped**, across 217 passing and three skipped files. The final Cloudflare Worker build passed.
- Browser suite passed **11 tests** at 320, 390, 430, 768, 1024, and 1440 pixels. It covers review rendering, exact highlights, provenance, filters, edit/approve/reject/merge, individual example review, scans/retry, guest/user/editor denial, and existing manual Phrase edits.
- TypeScript and targeted ESLint checks passed. The installed Next type generator was run after the Worker build because both toolchains generate `.next` route types.
- The live read-only audit is opt-in through `corpusAudit.live.test.ts`. It used production content without model calls or writes.

### Files changed for this task

- `app/lib/contentEnrichment/types.ts`, `canonical.ts`, `phrases.ts`, `phraseLexicon.json`, `grammar.ts`, `provider.ts`, `sources.ts`, and `service.ts`.
- `app/lib/contentEnrichment/canonical.test.ts`, `provider.test.ts`, `service.test.ts`, and `corpusAudit.live.test.ts`.
- `app/actions/grammarNotes.ts`, `grammarNotes.test.ts`, and the Phrase read/update functions in existing `app/actions/admin.ts`.
- `app/(admin)/admin/grammar-notes/page.tsx`, `GrammarNoteEditor.tsx`, and the Grammar Notes entry in existing `app/(admin)/admin/components/AdminNav.tsx`.
- `app/api/admin/content-enrichment/work/route.ts` and `route.test.ts`.
- Enrichment dispatch in existing `supabase/functions/transcript-library/index.ts`.
- The two migrations listed above, `supabase/tests/contentEnrichment.test.ts`, and `supabase/tests/helpers/enrichment.ts`.
- `e2e/content-enrichment.pw.ts`, `playwright.content-enrichment.config.ts`, and the enrichment contracts in existing `e2e/fixture-server.mjs`.
- This report and `artifacts/content-enrichment/audit.json`, `review.md`, and `manual-review.md`.

## Explicit confirmations

The following describe the implemented, locally verified workflow. Production migrations are applied. Full activation awaits deployment, worker configuration, and the contextual provider.

- New eligible content is automatically checked for Phrase Library additions after it is successfully saved.
- Existing phrases are deduplicated, and existing curated values take precedence.
- Grammar extraction intentionally targets advanced B2, C1 and C2 structures as well as beginner grammar. Live contextual coverage and the full review sample remain pending.
- Grammar explanations retain proper Arabic grammatical terminology with clear learner-friendly explanations.
- One grammatical rule collects multiple real examples from Books, Shows and transcripts through shared identities and source relationships.
- Automatically generated grammar analysis enters Admin review, including new examples for previously approved rules.
- A failed enrichment operation leaves the original transcript, Show or Book content successfully saved. Source JSON is preserved throughout processing.

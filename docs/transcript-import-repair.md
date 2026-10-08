# AWM transcript import repair — 8 October 2026

The live database repair is applied as migration `20261008182737_manual_awm_import_compatibility.sql`. The application changes still need a website deployment.

## Failure and trace

Four failed `admin_import_grouped_transcript` requests at 18:05–18:06 UTC corresponded to PostgreSQL `invalid_canonical_transcript` (P0001). The database context traced the failure through:

`admin_import_grouped_transcript → admin_import_youtube_transcript → index_youtube_transcript → retain_source_paragraphs → guard_canonical_write → validate_canonical`.

The failure occurred during indexing, before group membership was saved. The group foreign key, nullable Ungrouped assignment, and service-role RPC grants were valid. The generated-content canonical validator only accepted dictionary word tokens. Established AWM imports also contain multiword phrase tokens, `pos: "phrase"`, and phrase-ID headwords such as `"3"`. A representative valid phrase reproduced the same exception with the captured production validator, before the repair.

The uploaded request body was unavailable; this diagnosis is based on the actual database exception/context, captured function definitions, and a matching reproduction.

## Pipeline and repair

The admin form runs JSON/timing preflight and displays the server action's error. Both Import and Edit use `normaliseManualTranscriptJson` on the server, followed by shared database validation before persistence. Existing start-only processing, explicit final-end support, duration resolution, and compatible identical-start merging remain in place. Chronological failures take precedence over missing final duration; timestamps are never shifted to pass validation.

The migration routes confirmed standalone website-admin manual transcripts through an AWM-aware canonical validator and source retainer. Complete word/phrase enrichment is copied without dictionary rewrites. All token properties, including CEFR and custom data, remain in `raw_transcript`; the existing canonical projection keeps its six-field contract. Partial legacy enrichment stays in raw storage without manufacturing missing properties. Canonical timestamps retain milliseconds. Generated content and Shows continue using their original strict validator and source retention logic.

Import now records its source origin before indexing, so the first canonical write uses the correct validator. Import's validation, indexing, provenance and optional group membership are one RPC transaction. The server no longer performs a second provenance request after that transaction commits. Edit retains its existing atomic RPC and optimistic concurrency check. Invalid groups, duplicate imports, invalid enrichment, and later database failures roll back all work.

Database failures now identify the operation and SQLSTATE, with segment/token/field details when validation supplies them. Missing database functions, permission errors, enrichment incompatibility, and group assignment failures have distinct messages. A duration metadata lookup failure is reported as a database lookup failure rather than a missing-duration warning.

No transcript tables, storage contracts, public indexer/search functions, existing transcripts, or episode content were rebuilt or backfilled.

## Verification

- 216 focused regression tests passed across transcript actions, timing/JSON parsing, SQL migrations, admin components and viewers. The migration tests first reproduce the real pre-repair exception, then verify phrases, equal timestamps, milliseconds, ungrouped import, editing, permissions and rollback after indexing.
- Eight Chromium browser checks passed, including enriched AWM word/phrase import with duplicate starts and no unnecessary duration, start-only imports, optional groups, mobile layout and content-preserving group moves.
- A stored valid 328-segment AWM JSON file was parsed from disk with exact source-content equality. Its import and subsequent edit also succeeded in the live database under `service_role`, inside a test transaction that was rolled back.
- REST duplicate-import and invalid-group tests left the existing record unchanged. A live phrase import/edit and forced post-indexing group failure also passed in a rolled-back transaction.
- Before/after hashes of all 119 existing transcripts, their segments and tokens, and all Shows/Episodes were identical. No test record remains.
- TypeScript, lint, whitespace checks and the production build passed. Security advisors reported no new repair-function permission/search-path finding.

The missing original 207-segment upload was not invented or reconstructed. Regression inputs use an existing stored AWM file and an explicitly representative word/phrase fixture.

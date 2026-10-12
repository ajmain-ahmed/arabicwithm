# Source-first manual transcript imports

## Contract

A structurally valid source transcript is importable independently of optional enrichment. Essential structure is non-empty readable text, finite chronological start timestamps, interpretable explicit end values when supplied, and text translations when supplied. Resource limits remain 20 MB and 12 hours. Unknown final ends remain null; they do not require a duration. Intermediate start-only ends use the next distinct actual start. Repeated starts preserve every segment and its original position. No punctuation is absorbed and no linguistic content is rewritten.

Text can contain any script, digits, percentages, punctuation, Unicode symbols, abbreviations and sound descriptions. Optional enrichment may be missing, empty, partially populated, malformed or unsupported. Such data is retained verbatim rather than treated as a structural failure. If a block lacks explicit text, every token surface used to recover text must itself be recoverable text; otherwise the missing essential transcript text is reported. Diagnostics never become source data.

The normalizer parses the whole document and reports structural errors together before persistence. Source text, available English, normalized timing and all supplied token data are stored in the existing manual raw schema. The exact uploaded JSON string, including original timestamp spelling, and a source snapshot live independently in `transcript_private.manual_sources`. The first original upload stays recoverable across later edits; current normalized source is also retained. The private table has RLS and no client grants or policies: it is intentionally accessible only through service-role/admin operations.

## Database path

Migrations `20261008195310_manual_transcript_source_first.sql` and `20261008200317_manual_source_retry_preservation.sql` are applied. It makes `transcript_segments.end_seconds` nullable and adds the private source table. Existing rows are neither backfilled nor modified. The public indexer dispatches only confirmed standalone website-admin manual transcripts to the new source-first path. Other providers and Shows keep their existing indexer.

The manual path validates source structure, snapshots it, saves readable segments in source order, and indexes supported text for exact/normalized search independently of dictionaries. Optional canonical enrichment is projected only when compatible; incomplete or unsupported enrichment remains in source storage with internal diagnostics. Dictionary lemma/root values are nullable when unavailable, so incompatible linguistic operations have no false matches. Recognized optional input/dependency failures are recorded internally. Real storage and integrity failures still abort the entire transaction.

`admin_import_manual_source` and `admin_save_manual_source` wrap the established atomic Import/Edit RPCs and return committed enrichment status. All validation, provenance, source snapshots, segments, search indexing and group assignments remain one transaction. Duplicate imports do not replace saved records. Failed edits roll back source, publication state, segment identities and optional enrichment together. Successful import with unavailable enrichment is a real published/readable source, not a simulated success.

## Admin and public behavior

Admin distinguishes successful enriched import, successful partial/unavailable import, and a structural/storage failure. Edit provides original-source download and Retry enrichment. Retry operates on already saved source without requiring another upload or changing original text, raw content, timing, segment IDs or publication settings. Existing valid canonical enrichment is retained during retry. For legacy records, retry captures the already stored raw JSON on demand without modifying public source data; the exact original upload is unavailable when it was never stored. Root/dictionary lookup can be retried as dictionary availability improves. It never manufactures missing translation or token metadata.

Warnings and SQL details are exposed only through authenticated Admin actions/private diagnostics. Public loading selects only ready, explicitly published transcripts and does not retrieve the private snapshot or diagnostics. The reader's design is unchanged; it displays original text and available translation, handles unknown final ends, and shows a generic retry message for public loading failures instead of server technical details. Optional enrichment is not required by the reader.

## Verification

- Full suite: 699 tests passed, three skipped. Focused tests also passed after the final retry-preservation change.
- Seven isolated PGlite tests run the real RPC/function definitions, canonical triggers and storage constraints. They cover complete, partial and completely unavailable enrichment, every source token category, repeated starts, start-only/open ends, retry, duplicate rejection, real storage failure and edit rollback after indexing.
- Five Chromium tests passed through actual server actions against isolated backend data, including public reading of mixed source content and admin retry without source changes.
- Production build, TypeScript and lint passed.
- Live service-role tests ran inside a rolled-back transaction: completely malformed enrichment imported, source/text/timestamps were exact, numeric search worked without linguistic enrichment, retry left published data unchanged, and Edit preserved source. All 119 existing transcript, segment and token hashes were identical before and after. No test record remains.

Website code requires hosting deployment; the database migration is live. The new source-first contract supersedes earlier Arabic-letter and mandatory-final-duration preflight rules. No missing original transcript file was reconstructed.

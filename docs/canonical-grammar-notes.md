# Canonical Grammar Notes architecture

## Data architecture

The existing `public.grammar_notes` table remains the canonical entity. Stable UUIDs and unique `rule_key` values identify rules independently of any Book, Episode, transcript, or future learner surface. The existing Candidates, Approved, Rejected and merge-alias workflow remains in place.

The proposed migration extends this table with `mechanics`, `recognition_tip`, and a `transformations` text array. Existing `explanation` is reused as the plain explanation. Existing `detail` is reused as the advanced note. English/Arabic titles, rule CEFR, category, confidence and timestamps retain their existing fields.

Examples remain separate rows in `public.content_enrichment_examples`, linked by `grammar_note_id`. Existing source kind/ID, parent ID/title, source title, source URL, original URL, timestamp, exact Arabic, translation, explanation, highlight, example CEFR, source version and review status are preserved. The new `source_order` ordinal records the canonical position supplied by the shared text adapters. Reads sort by source kind, source ID, ordinal and stable unit key, with 25 examples per page.

Manual example edits use `manual_override` and `origin_rule_id` to retain a reviewed highlight, explanation and reassigned canonical rule across future extraction. Original Arabic and English source fields continue to come from the canonical source. A changed source requires renewed example review. Invalid highlights are excluded from public reads.

`public.grammar_note_relations` provides a small relational list of related rule IDs. A general rule and a specific rule can remain separate and related. Merge aliases resolve to canonical targets during related-rule reads. Merging retains example ordering and manual overrides.

The new core teaching fields are relational text columns. Transformations are a bounded text array. Related rules use foreign keys. The existing raw source JSON continues to belong to its source container and is preserved. This feature adds no Book ownership or webpage markup storage.

## Explanation structure

The shared `GrammarNoteRenderer` consumes one canonical note and renders the following learning sequence.

1. The idea, from existing `explanation`.
2. What is happening, from `mechanics`.
3. How to spot it, from `recognition_tip`.
4. Optional transformations, from `transformations`.
5. Exact real examples with highlighted spans, translations, source titles, parent titles, timestamps and separate example difficulty where supplied.
6. An optional advanced note, from existing `detail`.

Blank optional sections collapse. Transformations remain separate from source Arabic. The renderer escapes ordinary text through React and does not interpret stored HTML or JSX.

Admin can edit all teaching fields, titles, Arabic title, CEFR, category and related IDs. Each example has editable highlighted source structure, explanation and canonical rule ID. An exact source-substring check protects highlighted Arabic. Existing example approval/rejection remains available. Saving an example returns it to Candidates. A collapsed Admin preview uses the same shared renderer as future learner surfaces.

Generated fields are stored only when a canonical rule is first inserted. Future automated interpretations retain the existing rule's curated fields. Example overrides survive reruns and merges. The source adapters, queue, source hashes and durable job processing remain the existing shared pipeline.

## Terminology

The shared terminology formatter, model instructions and Admin save path use the single English-term-plus-Arabic convention. Examples rendered and tested include the following.

- jussive (مَجْزُومٌ)
- nominative (مَرْفُوعٌ)
- predicate (خَبَرٌ)
- direct object (مَفْعُولٌ بِهِ)

Transliteration companion labels such as `jussive (majzūm / مَجْزُومٌ)` are normalized to `jussive (مَجْزُومٌ)`. Formatting is idempotent. Ordinary explanatory parentheses are retained. Source Arabic remains exact.

The provider contract now requests the plain idea, mechanics, recognition clue, optional advanced detail and separate transformations. It explicitly requires governing relationships and the governing verb when identifying a direct object (مَفْعُولٌ بِهِ).

The formatter registers common English grammatical terms and advanced constructions. It supports the requested terminology examples and removes recognized old companion transliteration. Editorial approval remains responsible for accurate explanations and unfamiliar terminology. It is not a general linguistic correctness checker.

## CEFR and advanced grammar

Rule CEFR retains the existing A1–C2 constraint. Example CEFR remains independent. Tests demonstrate a B1 rule with C1 examples, and the existing extraction tests retain authored A1–C2 construction coverage.

Advanced conditional syntax, government, weak-verb changes, ellipsis, fronting and context-supported rhetorical structures remain available through existing canonical rule identities, provider instructions and unrestricted teaching fields. Related rules stay distinct unless an Admin deliberately merges them.

This task builds the knowledge architecture and renderer. The existing contextual analysis provider remains unconfigured. No new live C2-discovery or teacher-quality claim is inferred from controlled test examples.

## Public reads and reuse

`fetchCanonicalGrammarNote` is the shared Server Action for future Episode, Learn, Memory and Book consumers. It accepts a canonical UUID plus optional source filtering and pagination. It derives sign-in from the server identity. Callers cannot supply their own access flag.

The underlying service-only `website_read_canonical_grammar` function returns only Approved, unmerged rules. Examples must be active and individually approved, with a valid exact highlight. Related IDs are restricted to Approved canonical targets. Episode examples require an existing Episode. Transcript examples require ready status and public discovery eligibility. Book examples require sign-in, a released Book and a published chapter where the separate publication field exists. The existing production schema without that pending chapter-publication field remains supported. Vocabulary examples require an existing lexical record.

Candidate and rejected rules are hidden by both the public read boundary and the default renderer. An explicit `preview` option is used within the protected Admin editor. The protected Admin actions continue to verify Admin access before every privileged call.

- **Episode** can request the canonical note with an Episode source filter, then render that same rule with relevant examples.
- **Learn** can consume the canonical UUID and shared renderer without copying explanation text.
- **Memory** can later reference that UUID through its existing save infrastructure.
- **Future Books** can curate approved UUIDs and render the same canonical structured content. The Book does not own the rule.

New public routes, Memory features, automatic quizzes and Book curation tools are outside this architecture change. The read API and stable identities support those later integrations.

## Engineering

Migration required **YES**. Proposed file `supabase/migrations/20261114225000_canonical_grammar_notes.sql` extends the existing rule and example tables, creates the related-rule join table, updates the existing enrichment commit and Admin merge/read behavior, and adds structured edit/read functions. It performs no content backfill or source JSON rewrite.

The relation table has RLS enabled and service-only grants. New RPCs deny `PUBLIC`, `anon` and `authenticated` execution. Existing rule/example security remains in place. The public Server Action exposes only the approved read path, with server-derived source access.

Production database migration applied **YES**, after explicit approval for this exact file. Its assigned production version is `20261114223834`. Application deployment remains pending. Verification details follow below.

New and modified files for this task follow.

- `app/components/grammar/GrammarNoteRenderer.tsx` and `GrammarNoteRenderer.test.tsx`
- `app/lib/grammarTerminology.ts` and `grammarTerminology.test.ts`
- `app/actions/canonicalGrammar.ts` and `canonicalGrammar.test.ts`
- Existing `app/actions/grammarNotes.ts` and its authorization tests
- Existing `app/(admin)/admin/grammar-notes/GrammarNoteEditor.tsx`
- Existing `app/lib/contentEnrichment/types.ts`, `canonical.ts`, `grammar.ts`, `provider.ts`, and `service.ts`
- `supabase/migrations/20261114225000_canonical_grammar_notes.sql`
- `supabase/tests/canonicalGrammar.test.ts`
- Existing `e2e/content-enrichment.pw.ts` and fixture RPC handlers in `e2e/fixture-server.mjs`
- This report

## Verification

The full unit suite passed **1,540 tests**, with five skipped. Focused database, renderer, terminology and authorization tests also passed after the final changes. The final migration suite passed **five database tests**, including a newly added merge-collision regression. The Cloudflare Worker build, TypeScript and targeted ESLint passed. All **11 browser tests** passed at 320, 390, 430, 768, 1024 and 1440px, including protected Admin review and the shared canonical preview. A further browser run passed the complete edit flow with manual example highlighting, teaching fields and related IDs. The 390px editor screenshot was visually inspected.

Tests cover rule deduplication, independent rule/example difficulty, structured field persistence, exact source text, natural source ordering, manual override retention, rule reassignment retention, invalid highlight rejection, approved-only visibility, book/chapter/sign-in gates, transcript discovery gates, service-only grants, renderer preview protection, separate transformations and terminology formatting.

## Explicit confirmations

- Grammar Notes remain canonical structured Supabase records, with source examples linked separately. Webpages and Books consume their IDs and structured fields.
- One Grammar Note collects many real examples from Shows, transcripts and Books.
- Learner-facing English grammar terminology follows the Arabic companion format in normal brackets, without transliteration, through the shared formatter and editorial workflow.
- Advanced C1/C2 structures remain supported by the schema, extraction contract and shared renderer. Contextual discovery remains pending provider configuration.
- Future Grammar Books can curate Approved Grammar Notes while Supabase remains their source of truth.


## Production migration verification

Applied only `supabase/migrations/20261114225000_canonical_grammar_notes.sql` to project `whbxgwucsoguqzpnpzjd`. The migration call returned success. The production ledger records name `canonical_grammar_notes`, version **20261114223834**, after previous latest version `20261114221743` (`home_daily_phrase`). The Supabase tool assigned the production version, which differs from the local filename. Future migration-history reconciliation should retain this mapping.

Verified all three new rule columns (`mechanics`, `recognition_tip`, `transformations`), all three new example columns (`source_order`, `manual_override`, `origin_rule_id`), and the `grammar_note_relations` table. Verified the four new structured edit/read/related RPCs and the updated existing enrichment commit and Admin RPC.

The relation table has RLS enabled with zero grants to `PUBLIC`, `anon` or `authenticated`. All six inspected functions deny ordinary-role execution and allow service-role execution.

Production smoke testing used a temporary Episode and actual queue, claim and commit functions inside a transaction ending in `ROLLBACK`. The following checks passed.

- Structured extraction persisted mechanics, recognition tip and transformations.
- Candidate notes returned null through the public read function.
- Explicit Admin approval exposed the canonical note with B1 rule CEFR and C1 example CEFR.
- Structured Admin edits and related-rule IDs persisted.
- Manual highlight, explanation and canonical rule reassignment survived an automated rerun.
- Canonical rule edits took precedence over the rerun's generated data.
- Merging retained the manually curated example.
- The source Episode transcript remained exactly equal to its initial JSON.

All temporary notes, examples, relationships, source rows and queue work were rolled back. Final note, example, relation and enrichment job counts are zero. Historical backfill was **NOT started**. No model provider or application deployment was changed during this operation.

Existing content counts and full-row digests matched before migration and after all smoke testing.

| Source | Rows | Matching digest |
|---|---:|---|
| Phrases | 6 | `c776863954410ea24fac49f392791b69` |
| Books | 21 | `a9248a8bb382f2a91360cb39edd57b5a` |
| Shows | 24 | `fb3905d1f98656ccba937cabc580ae0e` |
| Chapters | 134 | `6def81611736f0a2e41581464a0e30a6` |
| Episodes | 127 | `da25b1bd8207ba7d33fc60a5c1989616` |
| Transcripts | 181 | `e32aabc1ff2ab9a1f936760b9bd2db44` |

This operation applied only the approved migration plus rolled-back verification transactions. Additional schema, policy, persistent content, or deployment changes **NO**. Application deployment and contextual provider configuration remain pending.

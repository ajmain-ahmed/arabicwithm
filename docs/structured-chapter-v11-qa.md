# Structured chapter 1.1 and Admin chapter publication

Date: 2026-11-14. Implementation is local and uncommitted. Production changes applied: **NO**.

## Completion boundary

The implementation and independent regression checks are complete. Mandatory QA against the exact user-supplied `ag-ch-002` is **not complete**: `test-fixtures/ag-ch-002.json` does not exist in this workspace. The user identified that destination, but no file bytes have become available there. The earlier `/mnt/data/...` path is not available in this Windows environment. Neither `am-ch-001` nor `ag-ch-001` is substituted. No reconstructed chapter is used as the primary QA source.

The browser suite reads only `test-fixtures/ag-ch-002.json` for the six exact-chapter tests. Those checks are explicitly skipped while the file is absent. They will exercise authored answers and all stages once the exact file is present; they have not yet passed.

## Structured format

The existing detector already accepted compatible major-version 1 objects; schema 1.0 remains supported. Explicit tests now cover 1.1.0 and compatible patch versions. Future incompatible major versions retain a readable diagnostic. Legacy/token-array discrimination and `validateBookTokenGrammar` were not modified by this task.

The additional renderer reads stage/phase, authored interaction structures, answer mappings and normalisation hints, learning-path policy and stages. It preserves every unknown source key and does not rewrite source JSON. `production_status` is supplementary Admin metadata, independent of publication.

Learning-path reference diagnostics are shown in protected Admin preview for missing sections, activities, prerequisites, answers, stage IDs and invalid passing percentages. Optional errors do not change legacy validation or reinterpret the source as Book Tokens.

## Actual ag-ch-002

| Metric | Verified result |
|---|---|
| Exact source bytes / hash | Unavailable: file absent |
| Sections | User reports 10; not independently verified |
| Blocks by type | Cannot count without source |
| Activities | User reports 94; not independently verified |
| Answers | User reports 94; not independently verified |
| References | User reports 3; not independently verified |
| Learning stages | Cannot count without source |
| Actual interaction kinds | Cannot inventory without source |

The requested chapter-specific lessons, vocalisation, morphology examples and entire authored learning path still require inspection against that file. No statement that the actual supplied chapter passed end-to-end QA is made.

## Rendering

Existing sections, prose, tables, examples, highlighted sentences, recursive collapsibles and references remain on the shared renderer. References retain safe URLs and authored author/source/locator/publisher/verification details. Tables scroll within their container.

Linear morphology diagrams use transformation cards and labelled arrows. RTL changes presentation direction while preserving topological source/target order. Branching/cyclic diagrams retain bounded relationship rendering. Top-down diagrams remain supported.

The existing Book Reader shell provides settings, fonts, scaling and page controls. Unassigned introductory sections appear in the overview before Stage 1. A staged chapter has an overview, one page per stage, any unassigned activities separately, then references; its entire activity bank is not dumped on one Practice page.

## Activities

| Kind | Interaction and checking |
|---|---|
| Single choice | Radio choices; exact authored `correct_choice_ids` |
| Multiple select | Independent checkboxes; exact set comparison |
| Matching | Accessible selects; authored `correct_pairs` |
| Classification | Item/category selects; authored `correct_categories` |
| Fill blank | Markers replaced by labelled inputs; authored `correct_fields` |
| Ordering | Move up/down controls; authored `correct_order` |
| Short text | Response field; authored model for self-check, with no automatic score |

Answers are matched by `question_id`. Model answers and explanations appear after checking. Hints start collapsed and do not penalise the answer. Missing automatic answer metadata produces an unavailable-checking message, never an invented correct result. Arabic checking can ignore optional diacritics when authored while preserving the underlying letters. No AI grading is used.

Unit interaction tests exercise multiple select, matching, classification, ordering, inline blanks, concealed models/hints, self-check controls and stage progression. These small control tests are not presented as QA of the missing chapter.

## Learning path

Stages retain authored order and prerequisite IDs. Guided practice is unscored. `mastery_activity_ids`, when present, overrides conflicting phase labels. Mastery uses the authored passing percentage, with no invented fallback percentage. Missing/unsupported answer metadata never silently earns credit.

Learners can retry with cleared responses and a fresh deterministic answer order for interactions requesting shuffling. Explanations remain available after checks; each stage includes an expandable remediation lesson. Passing completion and current stage are stored locally, keyed by chapter ID and schema version. Current Reader page uses existing Reader progress/URL infrastructure. Basic access rules are unchanged; the interactive path introduces no new sign-in requirement.

## Admin chapter visibility and preview

Admin Books retrieves metadata in bounded pages, including every existing Book and chapter, without public publication filters. Each row offers Preview, explicit Published/Unpublished state, parent Book release state, and supplementary `production_status` where present. The chapter edit dialog has an explicit publication switch; new chapters default to unpublished.

`/admin/books/preview/[chapterId]` checks `guardAdmin` on the server, and the underlying preview action independently checks it. Preview reuses the actual normalized content and shared `ChapterReader`, including structured pages. It bypasses both publication switches only after authorization. It does not write normal reading progress or add the Book to My List. Malformed/incomplete structured drafts receive Admin diagnostics instead of a blank page.

The banner identifies non-public previews. Previous/Next uses all existing chapters in that Book. Back to Admin Books is available. The preview supports bounded page/block URL resume values. Ordinary users, signed-out visitors and Editors cannot enter the new Admin preview route; existing Reviewer permissions are unchanged.

Production read-only inventory: **134 chapters**, **125 currently public**, **9 hidden** under the existing Book release rule. The new Admin query has no release filter. Isolated browser fixtures verify all nine existing chapters remain Admin-visible: five public chapters and three unpublished chapters inside a released Book, plus one published chapter in an unreleased Book. Public navigation excludes all four hidden chapters.

## Publication migration: review before production approval

Exact migration: `supabase/migrations/20261114002000_chapter_publication.sql`.

The schema/backfill core is:

```sql
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
lock table public.books in share mode;
lock table public.chapters in access exclusive mode;
alter table public.chapters
  add column is_published boolean not null default false;
update public.chapters c
set is_published = (b.is_completed is distinct from false)
from public.books b where b.id=c.book_id;
```

The migration also adds a restrictive chapter SELECT policy for ordinary API roles, a partial `(book_id, chapter_number)` index for published chapters, and publication predicates in seven existing privileged reader/search/practice functions. Those amendments preserve other validation and entitlements; unexpected deployed function text aborts the transaction. There are no chapter content conversions or deletions.

The resulting rule is:

```text
public chapter visibility = Book released AND chapter.is_published
```

Application checks cover direct reads (including cached chapters after unpublishing), counts, Next/Previous/navigation, Explore/For You book sources, chapter teasers, audiobook discovery/playback and the audiobook Edge Function. Database function checks cover search, privileged chapter reads, grammar, morphology practice and word-search vocabulary. The source JSON's `production_status` never publishes anything.

Read-only production backfill simulation on 2026-11-14:

| Check | Result |
|---|---:|
| Existing records | 134 |
| Backfilled published | 125 |
| Backfilled unpublished | 9 |
| Existing visibility changes | **0** |
| Null parent release states | 0 |

Existing live chapter ID digest: `5cde5ea711e927a21b90d05042b796f8`.
Existing chapter-content digest: `247f5430dffbb9f139647ea80935627c`.

These are pre-migration baselines, not claims of a production migration run. Recheck them immediately before and after an approved migration. Coordinate the migration, Worker and audiobook Edge Function rollout; do not use the new publication workflow while an older server version is still deployed. The application requires the new column, so the migration must precede that application deployment. No production migration, Worker deployment or Edge Function deployment has been performed.

## Verification

- Full unit suite: **1,475 passed, 4 skipped** across 211 passing and 2 skipped files.
- Final focused suite: **61 passed**, including the final Admin Book lookup and both RTL/LTR morphology order.
- Final local production Chrome suite: **22 passed, 6 skipped**. The six skips are only the missing exact `ag-ch-002` checks at 320/390/430/768/1024/1440.
- At all six sizes, Admin preview and the existing structured 1.0 reader fit without page-level horizontal overflow. Preview screenshots and the mobile diagram screenshot were visually inspected.
- Legacy reader DOM baselines passed at 390 and 1440. Existing structured 1.0 sections/tables/examples/diagrams/collapsibles, safe references, diagnostics and audio playback/language switching passed browser checks.
- Publication UI persistence passed and its chapter-content digest stayed identical.
- Isolated PostgreSQL tests replay the migration against snapshots of all seven actual production function definitions. They verify backfill, default-unpublished inserts, both release gates, ordinary-role RLS and privileged reads/search after unpublishing.
- Existing Book cover and audiobook unit tests passed in the full suite. Cover upload code was not changed by this task.
- TypeScript and the local production browser build passed. Cloudflare Worker build passed; no deployment ran.
- New structured reader modules pass focused ESLint. Broader lint still reports four existing React hook/ref errors in Admin Books and ChapterEditDialog (initial-loading effects and audio draft/ref handling); those unrelated flows were not refactored for this task.

## Files changed by this task

Implementation:

- `app/actions/admin.ts`
- `app/actions/books.ts`
- `app/actions/audiobooks.ts`
- `app/lib/bookRelease.ts`
- `app/lib/supabase/database.types.ts`
- `app/(admin)/admin/books/page.tsx`
- `app/(admin)/admin/books/preview/[chapterId]/page.tsx`
- `app/(admin)/admin/components/ChapterEditDialog.tsx`
- `app/books/[book]/[chapter]/ChapterReader.tsx`
- `app/lib/structuredChapter.ts`
- `app/lib/structuredLearning.ts`
- `app/components/books/structured/StructuredActivity.tsx`
- `app/components/books/structured/StructuredStage.tsx`
- `app/components/books/structured/StructuredChapterRenderer.tsx`
- `app/components/books/structured/StructuredPractice.tsx`
- `app/components/books/structured/StructuredDiagram.tsx`
- `app/components/books/structured/StructuredChapter.module.css`
- `supabase/functions/audiobook-library/index.ts`
- `supabase/migrations/20261114002000_chapter_publication.sql`

Tests and evidence:

- `app/lib/structuredChapter.test.ts`
- `app/lib/structuredLearning.test.ts`
- `app/components/books/structured/StructuredActivity.test.tsx`
- `app/components/books/structured/StructuredChapterRenderer.test.tsx`
- `app/actions/bookCompletionAccess.test.ts`
- `app/actions/bookEntitlements.test.ts`
- `app/actions/book-grammar.test.ts`
- `app/actions/audiobooks.test.ts`
- `app/actions/listenDiscovery.test.ts`
- `supabase/tests/chapterPublication.test.ts`
- `test-fixtures/chapter-publication-functions.sql`
- `e2e/fixture-server.mjs`
- `e2e/chapter-publication.pw.ts`
- `playwright.chapter-publication.config.ts`
- This report.

Other pre-existing working-tree changes from earlier tasks remain preserved.

## Required confirmations

- **The existing legacy Books JSON formats and acceptance criteria were not changed by this task.**
- **Structured chapter schema 1.1 has a staged educational renderer and authored interactive feedback; exact-chapter QA remains pending.**
- **The actual supplied `ag-ch-002` JSON has NOT yet been used for end-to-end QA because its file is absent.**
- **The implemented Admin preview allows authorized Admins to see and preview every existing chapter, including draft/incomplete/unpublished chapters.**
- **The implemented public release rule excludes unreleased chapters from ordinary access and public navigation. This code and migration are not yet applied to production.**

# Advanced structured chapter compatibility

Implemented locally in the current ArabicWithM Books system. Not deployed. No production content was imported, edited, migrated, rewritten, or converted. No database migrations are required.

## Existing Books protection

The current public reader consumes arrays of translated token blocks. The existing path supports the canonical Arabic/English token fields, phrase/word entry types, punctuation, paragraph numbers and boundary flags, compatibility timestamps, and optional syntactic-role/grammatical-case labels. Its normalizer and the `validateBookTokenGrammar` implementation remain unchanged. No Book Tokens V5 schema or generation prompt was edited.

The new detector always leaves arrays on that existing path. Existing grammar validation still executes first in the Admin editor and all three guarded chapter-write actions. A separate additional-format check then handles explicitly structured objects. Invalid token grammar is still rejected with the existing sentence/token/field diagnostic; existing legacy acceptance is not broadened or tightened.

Before integration, 33 existing book/pagination/chapter-round-trip tests passed. The visible reader markup of the existing `test-book/chapter-1` 30-block fixture was captured in Arabic and English, in line and book views, at 390px and 1440px. After integration, all eight Chrome SHA-256 markup comparisons matched exactly. Firefox also passed the corresponding semantic checks. The reference hashes are stored in `test-fixtures/legacy-reader-baseline.json`; these are synthetic test-book fixtures, not production book exports.

Existing books continue through the unchanged legacy rendering branches inside `ChapterReader`. The common shell retains audio, settings, chapter links, My List tracking, progress, resume URLs, and mobile navigation. Existing token word help and existing book features are unaffected.

## New compatibility layer

- Structural discriminator: an object with `schema_version` and `sections`. Filename and book title play no role. Token arrays are never reinterpreted as structured chapters.
- Versions: compatible `1.x.y` versions are recognized. Invalid versions, incompatible major versions, invalid top-level lists, or a chapter with no readable section block lists produce a readable diagnostic inside the Reader shell.
- No conversion adapter: the detector returns the same structured object. Unknown fields remain intact. The existing `chapters.content` JSONB stores the object through the existing guarded actions; local PostgreSQL tests confirm full round trips. JSONB handling was checked against [Supabase's JSON guide](https://supabase.com/docs/guides/database/json).
- Renderer boundaries: chapter/title, section, block dispatcher, grammar blocks, diagram, practice, answers, references, and scoped styles.
- Static rendering: lesson components have no client hooks and are server-renderable. The normal chapter route passes server-rendered pages through an optional content slot in the existing client reader. The Admin preview uses the same renderer within its existing client boundary.
- Pagination: one main lesson section per page, then Practice, Answers, and References. Empty section lists still allow title/practice content. Source order is preserved, and the same existing page/block progress, resume, and previous/next-page mechanisms are reused.
- Structured-only settings expose Arabic font, text size, and narration language. Authored Arabic and English remain visible together. Inapplicable token-only word help and line/book presentation toggles are hidden only for structured chapters. Legacy settings keep their existing behavior.

## Supported content

| Content | Result |
| --- | --- |
| Chapter titles | Arabic and English titles, chapter number, unchanged vocalisation, separate RTL/LTR direction |
| Sections | Stored order, optional bilingual headings; unknown section kinds use normal styling |
| Paragraph | Plain React text with Arabic/English support and readable prose spacing |
| Highlighted sentence | Ordered Arabic segments, consistent theme accents, visible role labels, Arabic/English roles, translation and explanation; unknown keys receive a neutral labeled treatment |
| Table | Headers, ordered rows/cells, bilingual cell text, captions; contained horizontal scrolling with keyboard focus |
| Example | Arabic example, English meaning, analysis rows, irab and explanation when supplied |
| Diagram | Lightweight topological layers and explicit directed relationship labels, captions, bilingual nodes; vertically stacked mobile layout; bounded handling of cycles and dangling edges |
| Collapsible | Native accessible details/summary, `default_open`, nested blocks through the same dispatcher; ancestry and depth guards prevent recursive traps |
| Practice | Prompts, stimuli, choices and suitable self-study text inputs; recognized response modes do not reject the chapter |
| Answers | Matched to activity IDs, numbered question headings, provided answers/explanations/alternatives/criteria; collapsed by default; no missing answers are generated |
| References | Citation details, safe HTTP(S) links with `noopener noreferrer`; unsafe schemes remain unlinked text |
| Unknown/malformed blocks | Development warnings and a readable local fallback; later content remains visible |

All chapter strings use normal React text rendering. There is no arbitrary HTML execution or `dangerouslySetInnerHTML` in this layer. Catastrophic route/data failures retain the existing branded recovery boundaries. Wide tables do not make the page overflow; arrow keys inside their focused scroll region do not advance reader pages.

This compatibility layer adds no grading/LMS engine or new answer persistence. Self-study inputs are temporary to their rendered page; source JSON and stored chapter data are not changed by learner interactions.

## Supplied chapter and QA scope

The attachment contained the specification and partial JSON examples, not the complete `ag-ch-001` JSON. The exact original section count, eight original activities/answers, and three classical-source reference records therefore could not be audited. The complete JSON is still needed for that final document-specific compatibility check.

`test-fixtures/structured-chapter.json` is explicitly labeled as a synthetic compatibility fixture assembled from the request fragments. It contains seven sections, eight **QA** activities and matched **QA** answers, and three **QA** references. These are not fabricated replacements for the missing original lesson content and were never imported into a real book.

Verified using that fixture:

- The exact Arabic and English chapter titles supplied in the specification render with Arabic diacritics preserved.
- The supplied three-part flower sentence renders with its ordered grammar segments.
- The Word / Irab / Why table renders with contained mobile scrolling.
- The supplied Zayd example renders with an analysis row.
- The sentence / mubtada / governing adjective / raised fail relationship diagram renders with directional labels.
- Advanced Distinctions is initially closed; nested Common Mistakes respects its open default.
- All eight QA activities render with choice and text response modes. Eight QA answers match their question IDs and remain collapsed until requested.
- Three synthetic reference records render safely. The missing original classical citations were not invented.
- A future block and a future section kind leave later content readable. Unsupported schema versions and malformed top-level content show clear diagnostics.

## Responsive verification

Chrome and Firefox passed the complete structured lesson flow at **320, 390, 430, 768, 1024, and 1440px**. Each flow covered all ten fixture pages, Arabic/English text, font choice and scaling, table/diagram/example/collapsible layouts, practice controls, matched answers, references, page navigation, reload/resume, and return to the existing book page. No page-level horizontal overflow was found. Narrow table keyboard scrolling stays on the current page.

Additional checks covered actual decodable audiobook playback and existing narration-language controls, malformed/future schema diagnostics, and legacy reader markup/behavior. The 320px rule/table/diagram and 1440px rule screenshots were visually inspected. Screenshots are in `test-results/` when the full browser suite is run.

## Engineering verification

- Baseline: 33 existing book/chapter/pagination tests passed before integration; existing reader markup captured before editing the shared shell.
- Final full suite: `npx vitest run --maxWorkers=4` ? **202 test files passed**, 2 skipped; **1,398 tests passed**, 4 skipped.
- Browser: `npx playwright test --config playwright.structured-books.config.ts` ? **22 passed** in Chrome/Firefox. The fixture builds and runs the production Next.js app against isolated synthetic data.
- Production target: `npm run build:vinext` ? **passed** for the current Cloudflare/Vinext target. This was a local build, not a Worker deployment or a live production-site test.
- TypeScript: `npx next typegen` followed by `npx tsc --noEmit` ? passed. The type-generation step refreshes Next.js route declarations after the Vinext build writes its own route declarations into the shared generated directory.
- New renderer/parser, additional settings branch, actions, new tests and browser configuration: ESLint passed. Full lint of the two modified existing components still reports three pre-existing Admin audio-editor errors (`set-state-in-effect`, `immutability`, `refs`) and one intentionally existing reader language-effect dependency warning. Running lint on the original HEAD versions reproduced the same issues; those existing behaviors were not rewritten for this feature.
- `git diff HEAD --check` ? passed.

## Files changed for this task

Integration:
- `app/actions/books.ts`
- `app/actions/admin.ts`
- `app/books/[book]/[chapter]/page.tsx`
- `app/books/[book]/[chapter]/ChapterReader.tsx`
- `app/books/[book]/[chapter]/BookReaderSettingsDialog.tsx`
- `app/(admin)/admin/components/ChapterEditDialog.tsx`

Additional renderer/parser:
- `app/lib/structuredChapter.ts`
- `app/components/books/structured/StructuredChapterRenderer.tsx`
- `app/components/books/structured/StructuredChapterBlockRenderer.tsx`
- `app/components/books/structured/GrammarBlocks.tsx`
- `app/components/books/structured/StructuredDiagram.tsx`
- `app/components/books/structured/StructuredPractice.tsx`
- `app/components/books/structured/StructuredText.tsx`
- `app/components/books/structured/StructuredChapter.module.css`

Tests, fixtures, report:
- `app/lib/structuredChapter.test.ts`
- `app/components/books/structured/StructuredChapterRenderer.test.tsx`
- `app/actions/book-grammar.test.ts`
- `app/(admin)/admin/components/ChapterEditDialog.test.tsx`
- `e2e/fixture-server.mjs` (isolated structured-book fixture environment only)
- `e2e/structured-books.pw.ts`
- `playwright.structured-books.config.ts`
- `test-fixtures/structured-chapter.json`
- `test-fixtures/legacy-reader-baseline.json`
- This report.

Earlier mobile More and AWM+ working-tree changes were preserved and are not part of this task's file list.

## Confirmations

**The existing Books JSON format and its acceptance criteria were NOT changed.**

**Existing books continue to use the existing renderer unchanged.**

**A second structured-chapter renderer was added so the supplied advanced grammar JSON can be displayed inside the normal Books Reader.** Complete-source QA remains pending receipt of the actual chapter file, as explained above.

**No existing Book JSON was migrated, rewritten or converted.**

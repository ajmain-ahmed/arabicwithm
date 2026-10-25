# Explore and Grammar upgrade — 21 October 2026

Website implementation is complete in the working tree. Both Supabase migrations are applied to `arabicwithm`. No Git commit, push or website deployment was performed.

## Controls and reading preferences

1. **For You settings:** the desktop cog is white and 50×50px, matching the adjacent feed controls. Hover, active border, focus outline and the accessible `Settings` label are consistent. Mobile retains a 44px touch target.
2. **Independent sizes:** one reusable `TextSizeControl` provides five bounded sizes: 80%, 90%, 100%, 115% and 130%. Arabic and English change independently. For You persists both sizes alongside its existing switches in `awm-for-you-settings`.
3. **Mobile navigation:** vertical snap panels navigate forward/backward, with a 160ms settle timer and 900ms navigation lock. Only the current player mounts; cleanup pauses and destroys it before the next player mounts. Small transcript scrolling stays inside its own scroll area. Settings remain outside the navigation scroller. Previous/Next buttons remain available.
4. **Streak:** the hero displays the fire icon and number. A screen-reader label still describes the streak.
5. **Shared Grammar layout:** `GrammarUI.tsx` supplies Arabic, English, Instruction and Feedback components. Examples and translations are centred, translations immediately follow their examples, instructions are larger, and choices have centred content and usable touch targets.
6. **Grammar settings:** one provider and cog serve all active activities and revision screens. `awm-grammar-settings` stores the Arabic size, English size and Tashkīl preference across activities and reloads. Revision-dialog Arabic/English also receive the preferences through React context.
7. **Tashkīl:** the existing `displayArabic` helper changes rendered text only. Original questions, stored source JSON and answer comparison remain unchanged.
8. **Marking:** ordinary single choices and single-word selections submit immediately. Reviewed whole-phrase selections and typed recall retain their necessary confirmation. Correct feedback stays for 1,500ms before advancing. Incorrect answers show a correction and explanation, and wait for Continue or Retry. Weak recall retains Again/Got it.

## Content-derived bank

9. **Architecture:** canonical content → SQL eligibility analyser → private indexed sentence snapshots → authenticated RPC → `BankActivity` → shared question UI. No live LLM or client-side parsing of Arabic grammar is involved. The bank stores only sentence Arabic, translation and supported facts, rather than complete source documents.
10. **Sources:** `chapters.content` and standalone admin transcript segments. Transcript canonical tokens take precedence. Exactly aligned raw import tokens fill keys omitted by older projections; explicit canonical values, including `null`, win. Transcript retrieval requires `ready`, `website_admin_transcript`, and Search or Explore publication. Private user-library content is excluded. Books follow the website's existing signed-in chapter-reading policy.
11. **Eligibility:** Word Type uses recognised explicit POS values, including generic `verb` without guessing tense. Sentence Role requires a recognised `syntactic_role.english` label. Case Endings requires a recognised `grammatical_case.english` label; contradictory verb/genitive and non-verb/jussive combinations are rejected. Unknown or missing labels generate no corresponding question. Questions classify an explicitly annotated highlighted word; they do not pretend unannotated neighbouring words have been reviewed. Whole-phrase exercises remain available through curated fallbacks.

    Shared filters require 2–40 tokens, at least two Arabic-bearing tokens, nonempty Arabic and a usable 8–600-character translation. Malformed text, Latin/replacement characters in Arabic, punctuation-only content, explicit music/theme exclusions and unclear translations are rejected. Multiword phrase tokens and explicit prefix/suffix tokens are excluded as single-word targets.
12. **Automatic refresh:** chapter insert/content updates rebuild that chapter's entries. Segment insert/canonical/text/classification updates rebuild the segment. Raw transcript edits refresh its segments. This covers current imports and future uploads without maintaining a second question file.
13. **Staleness:** source updates replace snapshots synchronously. Chapter and segment foreign keys cascade deletion. Publication eligibility is checked on every RPC request. Existing fetched sessions refresh when the next batch is requested.
14. **Variety:** source-normalised sentence hashes deduplicate results. Sampling mixes short, medium and long examples and favours different sources. Optional “Through A1 … C2” filtering uses the highest explicitly stored token CEFR; unknown levels remain available in Mixed levels. The current session excludes its most recent 200 sentence hashes. Curated fallbacks are also deduplicated by Arabic sentence. Existing Ṣarf/Word Patterns continue using their separate reviewed, dictionary-backed prepared-content pool.

The reproducible one-time backfill statements are in `scripts/sql/backfill-website-grammar.sql`. All 89 historical chapters and 9,318 standalone transcript segments were processed in bounded batches. Final indexed counts:

| Eligible mode | Sentence records |
|---|---:|
| Word Type | 18,666 |
| Sentence Role | 555 |
| Case Endings | 843 |

The same sentence may support multiple modes. Indexed records include private/unpublished snapshots, which the retrieval RPC filters; these counts are not a claim that every indexed record is publicly available.

## Rules and Ṣarf

15. **Naḥw rules:** the wider container uses 1 / 2 / 3 / 4 columns at mobile / small / medium / large breakpoints. Every existing rule has one maintained level in `ruleLevels.ts`. This is a deliberate website teaching progression, not an official CEFR accreditation:

| Level | Catalogue assignments |
|---|---|
| A1 | noun, past, present, preposition, pronoun, demonstrative, topic, predicate |
| A2 | subject, object, adjective, conjunction, imperative, nominative, accusative, genitive, role_adjective, described_noun |
| B1 | idafa_first, idafa_second, kana_noun, kana_predicate, inna_noun, inna_predicate, masdar, participle |
| B2 | jussive, jussive_particle, subjunctive_particle, interrogative_particle, single_predicate |
| C1 | quasi_sentence, quasi_predicate, delayed_topic, fronted_predicate |
| C2 | verbal_predicate, nominal_predicate |

The progression introduces word classes and basic nominal sentences before case/governance, then advances to inversion and embedded clause predicates. A test ensures every catalogue rule is mapped exactly once.

16. **Root Types:** removed from the active Ṣarf catalogue; reusable underlying material remains.
17. **Context Ṣarf:** activity content remains; its redundant Information button is removed.
18. **Weak Verbs:** increased spacing before choices, shared reading settings, clear correction after errors and the shared 1.5-second success delay. Conjugation Recall remains accessible through the existing Weak Verbs mode selector and keeps its reveal/self-rating interaction.
19. **Word Patterns:** desktop workspace starts at 80% width and supports native dragging with `resize: both`. It has a 500px desktop minimum width, 420px minimum height, parent-width maximum and 85dvh maximum height. Mobile uses a full-width, non-resizable workspace. Arabic answer patterns use the Arabic size preference.
20. **Ten Forms:** centred Arabic heading and English subtitle, balanced In Order/Shuffle selection and a prominent Start button. Selecting an order does not start revision. Reveal, previous/next, restart and choose-order flashcard controls remain.

## Database and files

21. **Schema:** migrations `20261021214844_website_grammar_question_bank.sql` and `20261021215825_website_grammar_canonical_precedence.sql` add private label/source tables, analyser/refresh functions, three refresh triggers and the authenticated public RPC wrapper. Source foreign keys have cascading deletes and uniqueness constraints. Sampling uses a length-band/sample-key index, modes use a GIN index, and sentence hashes are indexed. Private tables have RLS enabled and direct client privileges revoked; privileged functions have an empty search path and narrowly granted execution. The advisor reported no new public-function warning. Its two private-table “RLS enabled, no policy” informational findings reflect intentional direct-access denial ([Supabase explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)).
22. **Changed files:**

    - Reading controls: `app/components/settings-controls/TextSizeControl.tsx`, `app/explore/ForYouFeed.tsx`, `app/explore/MobileClipNavigator.tsx`, `app/lib/useYouTubePlayer.ts`.
    - Homepage: `app/components/home/HomeDashboard.tsx` and its test.
    - Grammar: `GrammarPage.tsx`, `GrammarUI.tsx`, `BankActivity.tsx`, `WebsiteActivity.tsx`, `TenFormsRevision.tsx`, `questionBank.ts`, `ruleLevels.ts`, `models.ts`, `useCorrectAutoAdvance.ts`, and associated tests under `app/grammar/`.
    - Server action: `app/actions/grammar.ts`.
    - Database: both migrations above, the bounded backfill SQL script, `supabase/tests/website_grammar.test.ts`, `supabase/tests/website_grammar_live.sql`.
    - Browser verification: `e2e/grammar-upgrade.pw.ts`, fixture server and YouTube helper; updated relevant assertions in `learning-update.pw.ts`, `ui-polish.pw.ts` and `ui-corrections.pw.ts`.
    - This report and screenshots under `docs/validation/grammar/`.

## Verification and limits

23. **Completed checks:** full Vitest suite: **826 passed, 3 skipped**; production build passed; TypeScript and targeted ESLint passed; whitespace diff check passed. PostgreSQL tests execute the actual migrations and check automatic indexing, update/removal, raw/canonical precedence, publication, deduplication and access restrictions.

    Live transactional verification imported a fresh enriched chapter and standalone transcript, confirmed their supported facts entered the pool, removed a role through an edit, verified deletion cleanup, and confirmed canonical null did not resurrect an old raw label. All fixture content rolled back. A real authenticated-role RPC check returned 30 candidates for each mode. Two consecutive role batches produced **60 unique sentences**, ranging from **2 to 33 tokens**, with no repeats.

    **22 distinct targeted browser checks passed** across the final upgrade checks and relevant existing regressions. Viewports included 320, 390, 768, 1440 and 1920px. The checks cover phone/tablet/desktop layouts, settings, multiple book/transcript questions, correct/incorrect flows, persistence, the rules grid, Weak recall, Context, native drag resizing, Ten Forms Start, For You settings, source skipping, seeking/replay and snap navigation with player teardown. Screenshots were visually inspected. The YouTube API is deterministic in these tests; they verify the website's player integration rather than live third-party video availability.

24. **Limits:** automatic extraction is intentionally conservative and relies on the quality of uploaded labels. Unknown/compound labels and unannotated grammar remain excluded. The maintained rule-level mapping can be refined pedagogically. Preferences are local to the browser. Actual autoplay/sound remains subject to browser/YouTube restrictions. A final test-server run encountered the repository's known intermittent Turbopack Google Fonts query-parser issue; the fixture's existing webpack option was used for the additional responsive checks. The production build succeeded with Turbopack.

Review images: [mobile Grammar](validation/grammar/grammar-upgrade-390.png), [desktop Grammar](validation/grammar/grammar-upgrade-1440.png), [wide rules](validation/grammar/grammar-rules-wide.png), [For You settings](validation/grammar/for-you-text-settings.png).

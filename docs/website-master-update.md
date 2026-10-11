# Website master update — 10 October 2026

Website repository: `C:/Users/Muttaqi Ahmed/Desktop/arabicwithm`. No Flutter source, mobile navigation, user records or transcript data was changed. Nothing was committed, pushed or deployed.

## Result and rollout status

Explore now mounts the existing AWM feed directly, without tabs or Search. The For You recommendation components, actions, helpers, tests and dedicated diagnostics have been removed. No shared transcript tables or RPCs were removed. Existing AWM playback, reading, translations, vocabulary interactions and navigation remain.

The actual Home Quick Actions grid has one Search entry, linking to `/search`. Global navigation is unchanged. The former `/explore/search` URL redirects to `/search`; the standalone transcript-feed search is removed, while administrator transcript-management and dictionary actions remain intact.

Search is implemented as a bounded server-side query over **shows, their episodes and books/chapters**, with source titles, matching Arabic/English excerpts and links to existing readers. Each episode appears once even if its show and transcript also match. A transcript match links with `?t=seconds`; the existing YouTube hook now receives that starting time. Book matches use the reader's existing `#sentence-N` anchors. Arabic matching removes tashkīl and tatwīl and normalises common alif/hamza variants. Results use a stable source-ID cursor, with 20 displayed records and one look-ahead record. No whole collection is downloaded to the browser. Book text search requires server-verified sign-in; guests can search book titles.

**Live Search requires the additive SQL rollout in `scripts/sql/website-content-search.sql`. It has not been applied permanently.** The script adds stateless helper functions, a service-only Search RPC and two expression indexes using the already-installed `pg_trgm` extension. It creates no tables, rewrites no content, changes no RLS policies and raises no timeouts. The browser cannot call the aggregate RPC directly. The server controls whether chapter text is included. Until rollout, the live website displays the explicit Search-unavailable state rather than fake empty results.

The script was tested against the actual database inside transactions ending in `ROLLBACK`. Subsequent checks confirmed that neither the RPC nor its new index persisted. This preserves the instruction not to deploy automatically. Apply the reviewed script as part of the website rollout, then recheck Search through the live Data API and browser. The implementation is ready for that review, but **not ready for a complete live deployment until the SQL dependency and live end-to-end verification are completed**.

## Grammar

The existing signed-in, non-premium Grammar entry and reviewed library activities remain. Library word/phrase mapping retains correct-answer locks, contextual explanations, longest non-overlapping multi-token targets, reviewed governing/attachment relationships and progression. Context Ṣarf, attested Hans Wehr forms, weak-verb identification/recall and dictionary-linked word patterns remain.

New finite, reviewed website foundations cover:

- Sentence roles: topic, delayed topic, predicate, fronted predicate, doer, passive subject, direct object, adjective, circumstance and genitive possessor. Learners select every word in complete prepositional/adverbial and clause targets; attachment explanations distinguish the whole unit from a single governed noun.
- Sentence structure: nominal/verbal sentences, constituent functions and whole verbal/nominal predicate clauses.
- Particles: إِنَّ, أَنَّ, كَانَ, لَيْسَ and prepositions, using the actual sentence's grammatical effects.
- Iʿrāb: four checked dimensions—case/state, sign, original/secondary and visible/estimated classification, and grammatical reason. The examples distinguish dual/plural secondary signs, estimated ḍamma on final alif, visible case endings, jussive sukūn and built perfect-verb endings.
- Root identification, including quadriliteral roots; word-specific sound/weak perfect, imperfect and imperative answers; active/passive participles, verbal nouns and attested weak-verb transformations.

These are a deliberately finite question bank, not invented unlimited combinations. Arabic targets are vocalised, translations and contextual explanations are stored alongside each target, and answers remain hidden until checking. Wrong attempts preserve retry controls; questions support touch selection and native keyboard controls. Unvocalised typed answers are accepted, but explicitly supplied wrong vowels are rejected. No new progress table was invented: these website sessions use local activity state, because the existing mobile grammar catalogue does not provide a shared website progress-write contract.

**مُرَاجَعَةُ الْأَوْزَانِ — Revise the Ten Forms** offers In Order and Shuffle, uses the existing ten-form curriculum patterns/features/examples, and supports reveal, forward, backward, restart and choosing the order again. Shuffle uses a Fisher–Yates permutation and visits each form once.

## Runtime findings and performance

| Reported problem | Evidence and change | Remaining limit |
|---|---|---|
| Supabase 522 | Live Supabase edge logs show 522 on lightweight chapter metadata, show metadata and episode metadata, as well as content requests. SQL and Data API access subsequently recovered. This establishes origin-wide failures, not a For You-only frontend cause. Server service/auth clients now use an eight-second deadline; only transient GET responses get one retry inside that deadline. Writes and RPC POSTs are never blindly retried. | The precise historical Supabase origin resource/network failure cannot be established from the available logs. No claim that frontend code permanently repairs an external outage. |
| Chapter timeouts | The exact navigation query has an existing `idx_chapters_book_id` index. `EXPLAIN ANALYZE` returned eight rows with execution time about **2.14 ms** and no trigger work. Navigation, metadata, downloads and homepage no longer call teaser/content fetching implicitly. Teasers remain on book-detail cards and can fail independently without preventing navigation. | Historical 57014 remains recorded in PostgREST logs; no missing navigation index or reproducible slow metadata plan was found today. Book-detail teasers still require content reads, bounded by the existing availability window and network deadline. |
| Homepage request fan-out | Previously Home queried every book's chapter list (which also triggered content extras) and every show's episode list. Home now uses one bulk chapter-metadata query and one bulk episode-metadata query instead of that per-source fan-out. The existing catalogue and admin invalidation tags remain. | No controlled before/after whole-page latency benchmark is claimed. |
| Slow cover requests | The route selected `*`, including large episode transcript JSON, then tried storage fallbacks sequentially without a route-wide deadline. It now selects only cover metadata, shares a **six-second upstream deadline**, tries missing show-cover episode fallbacks two at a time in original priority order, and caches successful public bytes for 60 seconds with stale revalidation. Existing bytes, ETags, private signed-link handling and YouTube fallback remain. | No historical 84–85-second trace was available to attribute every millisecond. Updated artwork can take up to the short public cache window to appear; no artwork or image quality was changed. |
| Suspense/server-render failures | Database errors during server rendering can fail the reader's render; existing book/cartoon error boundaries remain and Explore now has its own retry boundary. Search failures return a structured result with useful production-safe copy. | The development log records an unfinished Suspense boundary and a nearby clip-load failure. This is consistent with failed server work, but the exact historical causal sequence cannot be proven. No independent Suspense logic defect was reproduced. |
| ChunkLoadError / dev memory restarts | Production builds and browser workflows were exercised. No missing-chunk failure was reproduced. Dev tests use `.next-browser`, separate from production `.next`; there were development-only connection-aborted logs during navigation and expected YouTube errors for synthetic video IDs. | Historical logs in `.next/dev/logs/next-development.log` identify the failed development `app_layout_tsx_004glpo._.js` chunk and the same chunk failure as an unhandled rejection. `persistent-dev.stderr.log` also records a Turbopack CSS hot-update rejection and an Emotion/CssBaseline style being hydrated as the navbar style. The current root already uses AppRouterCacheProvider and navbar ClientStyles; final production testing does not reproduce that older hydration mismatch. The reason the historical development asset disappeared and the memory-threshold restart trigger are not proven; no error suppression or memory-limit increase was added. |
| Unhandled promise rejections | Search catches failures, grammar loads retain retry states, and shared upstream fetches now have deadlines. The production Search path no longer relies on thrown database-error messages surviving Next.js error sanitisation. | The historical unhandled rejection is the development ChunkLoadError; another log identifies a missing CSS link during a Turbopack hot update. Neither occurs in the final production smoke check. |
| Obsolete For You errors | No `fetchForYou`, `ForYou` or `transcript_for_you_groups` reference remains in runtime `app/` or `scripts/`. Browser fixture request logs confirm visiting Explore does not call the recommendation RPC. | Shared Supabase/mobile functions and stored transcripts are intentionally preserved. |

Live SQL Search measurements for the same `book` query: approximately **1,551 ms** before prefilter/index work and **697 ms** with the proposed indexes/prefilter. These are individual runs, not an isolated cache-controlled benchmark. Rolled-back tests also found a vocalised Arabic match, 21 bounded English hits, zero guest chapter-text results, no anon execution permission and service-role execution permission.

## Files changed in this task

Added:

- `app/actions/contentSearch.ts`, `contentSearch.test.ts`
- `app/search/page.tsx`, `ContentSearch.tsx`
- `app/grammar/websiteQuestions.ts`, `websiteQuestions.test.ts`, `WebsiteActivity.tsx`, `WebsiteActivity.test.tsx`, `TenFormsRevision.tsx`
- `app/lib/boundedFetch.ts`, `boundedFetch.test.ts`, `homeCatalogue.ts`
- `app/explore/error.tsx`
- `e2e/website-master.pw.ts`
- `scripts/sql/website-content-search.sql`
- `scripts/check-website-master-live.mjs` and `docs/validation/website-master/live.json`
- This report.

Modified:

- `app/explore/page.tsx`, `app/explore/search/page.tsx`
- `app/components/home/HomeDashboard.tsx`, `HomeQuickActions.test.tsx`
- `app/actions/books.ts`, `app/books/[book]/page.tsx`, `app/page.tsx`
- `app/api/covers/[kind]/[id]/route.ts`, `route.test.ts`
- `app/lib/supabase.ts`, `app/lib/supabase/server.ts`
- `app/cartoons/[show]/[episode]/page.tsx`, `EpisodePage.tsx`
- `app/grammar/GrammarPage.tsx`, `models.ts`, `app/actions/grammar.ts`
- `e2e/fixture-server.mjs`, `e2e/learning-update.pw.ts`

Removed (backed up before removal):

- `app/explore/ExploreTabs.tsx`, `ForYouFeed.tsx`, `TranscriptSearchLink.tsx`
- `app/explore/search/TranscriptSearch.tsx`, `TranscriptSearch.test.tsx`
- `app/actions/forYou.ts`, `forYou.test.ts`
- `app/lib/forYou.ts`, `forYou.test.ts`
- `scripts/check-for-you-rpc.mjs`, `check-learning-live.mjs`

Earlier Memory/Auth/chapter-footer changes remain in the working tree, but were preserved rather than reimplemented in this task. `docs/website-learning-update.md` describes that earlier, superseded For You version; this report is the current website specification.

## Validation

- Focused Vitest: **51 distinct tests** across the new question bank, interactive answers, deadlines/retries, Search, covers, existing grammar adapters, Memory, Home shortcuts, auth callback and shared YouTube hook. Final results are reported separately from the full repository suite.
- Browser: **17 distinct passing workflows** across the new seven-workflow suite and the existing ten-workflow learning regression suite. New suite rerun passed all seven after correcting Search error handling and assertions. Tests use the actual website with isolated synthetic accounts/backend fixtures, not a deployed database Search RPC.
- Production `next build`: passed on the final answer-validator source: TypeScript, compilation and all **166** generated pages.
- TypeScript, scoped ESLint and `git diff --check`: passed after the fixes.
- Live database: schema/index inspection, logs, navigation execution plan and rolled-back Search SQL validation performed. No permanent schema/data change.
- Full repository regression suite: **not completed/claimed**. Focused results are not presented as a full-suite pass.
- Final production-browser smoke check with live public data: no JavaScript page errors, no 375px horizontal overflow on Explore/Search/Memory, zero Explore tabs, automatic Memory sign-in, and the expected Search-unavailable state while its RPC remains unapplied. One real cover returned HTTP 200 with 94,336 bytes in **656 ms** and the short public cache headers. Evidence is saved in `docs/validation/website-master/live.json`. These single measurements do not establish a controlled latency improvement.
- Live deployed Search/browser: **unverified until SQL rollout**. No real Google OAuth account or live personal-account mutation was used.

Commands use the existing dependencies: `node node_modules/vitest/vitest.mjs run <focused files> --maxWorkers=1`, `node node_modules/typescript/bin/tsc --noEmit`, scoped `node node_modules/eslint/bin/eslint.js ...`, and `node node_modules/next/dist/bin/next build`. Browser checks use `AWM_TEST_WEB_PORT=3009`, `AWM_TEST_BACKEND_PORT=4319` and `node node_modules/@playwright/test/cli.js test e2e/website-master.pw.ts e2e/learning-update.pw.ts`.

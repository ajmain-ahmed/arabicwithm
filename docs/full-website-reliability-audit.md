# ArabicWithM reliability audit and repair

Audit date: 16 November 2026. Scope: the current repository, a repaired local production build against isolated fixtures, read-only production SQL, and real public production browsing.

Application repairs are local. No application deployment or production migration has been performed. This report distinguishes tested behavior from unavailable verification; it does not declare the entire acceptance checklist complete.

## 1. Route health matrix

The current router contains **43 page routes and 9 route handlers**, including the three newly connected grammar routes. The source inventory was generated from exact `page.tsx` and `route.ts` filenames, excluding route groups and component names such as `MemoryPage.tsx`.

- [Complete route inventory](validation/full-reliability/route-inventory.json)
- [Detailed route matrix](validation/full-reliability/route-health-matrix.md)
- [CSV with every requested check and evidence](validation/full-reliability/route-health-matrix.csv)
- [Interactive source inventory](validation/full-reliability/interactive-inventory.csv): 965 elements across 150 files; 821 have interaction handlers and 77 have `href` attributes. This is a source inventory, not a claim that every control received runtime testing.

`PASS` means the indicated check was observed. `FIXED` identifies a repaired route in the local build. `BLOCKED` identifies unexercised combinations or unavailable production verification; it does not automatically mean a route is broken. Dynamic routes use representative existing production records and isolated local fixture records, rather than opening every record in the database.

Settings and AWM+ are Profile tabs, Library is a catalogue/My List surface, and Naḥw/Ṣarf are Grammar activities. They are not separate `/settings`, `/library`, `/nahw`, or `/sarf` routes in this checkout. `/explore/search` redirects to `/search`; legacy Practice routes redirect to Home where intended.

## 2. Shared root causes and repairs

### Routing and state ownership

Watch view, Read/Listen, and Profile tabs replaced the current history entry. Grammar activities lived only in component state. Profile also initialized its active tab differently on the server and browser. These patterns lost destinations from Back history, discarded activity selection on refresh, or showed a different tab after history traversal.

Watch/Read/Profile selections now create history entries. Profile and Grammar derive their active state from URL parameters. Grammar activity URLs validate both the branch and activity against the existing catalogue. Existing internal parent controls use canonical links, so direct entry and refresh do not depend on arbitrary prior browser history.

Explore now derives its displayed feed from `useSearchParams`, covering both history traversal and same-route URL changes. Its shallow view switch uses the installed Next.js guide's `history.pushState(null, ...)` integration. Passing private router state back into that API bypassed URL-hook updates during development of the repair; the browser tests caught this and the final implementation corrects it.

Checkout feedback previously removed every query parameter when dismissing its notice. It now removes only `checkout`, preserving the selected account tab and other state.

### Loader failures and incorrect cache results

Book, chapter, show, and episode detail reads returned `null` or `[]` for backend errors as well as genuinely missing records. Show detail also ignored failure of its episode-summary query. Cached readers could therefore retain a false missing/empty response after a transient outage.

The shared `assertPublicRead` boundary logs server diagnostics and throws a neutral recoverable error. Zero-row detail reads use `maybeSingle`; backend errors remain failures and genuine absence remains absence. Existing cache boundaries, tags, release gates, and publication checks are retained. Caching has not been disabled globally. Supabase documents the zero-or-one-row distinction in its [maybeSingle reference](https://supabase.com/docs/reference/javascript/maybesingle).

### Authentication scope

The shared shell replaced every page with the auth recovery screen after client session restoration failed, including public catalogue pages. Public content now remains visible with a reconnect warning. Account-dependent routes retain the branded recovery screen. Server authorization remains authoritative; no role, subscription, or chapter gate was relaxed.

### Missing grammar integration and empty canonical data

The existing canonical grammar reader had no learner-facing consumers. Grammar in Context and note-detail routes were absent, and Episode controls did not expose canonical Grammar Notes. This is distinct from the existing practice activities and their datasets.

The new paths connect the existing approved-note reader, level lists, and Episode source associations. They use the existing database and RPCs, without creating content or modifying the schema. Production canonical note and source-example tables are empty, so real-note verification remains blocked by content availability.

### Bounded loading and pointer interception

For You clip/transcript/group loading and Grammar bank/prepared activities now use the existing bounded-read architecture. A stalled initial For You access report settles into recovery while playback remains blocked. After an access failure, automatic heartbeat requests stop until an explicit Retry or account-access refresh. No new automatic mutation replay was introduced.

Reader Settings could be scrolled under the fixed navbar after pagination. Real `elementFromPoint` testing identified the navbar as the intercepting element. Document scroll padding now reserves the navbar's height. The new Grammar Notes modal also keeps a stable height during asynchronous list/detail changes so its Close control does not move during a click. Tests wait for normal modal transitions before judging whether a control is obstructed.

## 3. Major controls and interactions

| Interaction | Repair or verification |
| --- | --- |
| Watch Episodes/Shows | URL-owned state; normal history entries; filters and pagination retained. |
| Read/Listen | Normal history entries; catalogue and audiobook metadata preserved. |
| Profile Account/Settings/AWM+ | URL-owned state and Back/Forward restoration; desktop tabs are semantic keyboard-accessible buttons. |
| Grammar activities | Validated activity URLs survive refresh and history; existing exercises preserved. |
| Grammar in Context | A1–C2 links, approved-note list, empty state, pagination, detail and canonical parent links added. |
| Episode Grammar Notes | Lazy dialog loads approved, active associations for the current Episode; canonical detail read scopes examples to that Episode. |
| Episode Memory/Settings/More | Connected navigation and visible controls exercised at mobile and desktop widths. |
| Reader Next/Previous/Next Chapter/All Chapters | Connected flow and hit-testing, including the navbar-clearance repair. |
| For You next/previous/settings/language/filter | Dedicated interaction coverage, separately from Explore. |
| Recovery Reload | Uses the existing “This page took a little detour” experience; failed grammar reads recover after the injected fault clears. |

Candidate and rejected grammar notes remain outside learner results. Optional legacy note fields are normalized in memory; they are not written back. Missing optional mechanics, recognition guidance, transformations, or example fields do not crash the note reader. Existing grammar terminology formatting is applied, with Arabic companions in normal brackets and no added transliteration.

## 4. Back navigation

The repaired local suite exercises Learn → Grammar → Context → level → note, Watch → Show → Episode → Memory, and Read → Book → reader → next chapter → All Chapters, along with query-owned tabs and Explore/For You.

Browser Back and Forward are checked against both the URL and visible content. Refresh is included. Internal grammar Back links have canonical parents, including direct deep links. Reader page-position updates still replace the current reading position, avoiding a browser-history entry for every reading-progress update. Authentication aliases and consumed checkout parameters retain intentional replacement behavior.

Real production browsing separately passed Home → Watch → Show → Episode, Episode Settings, Read → Book → signed-out chapter gate, Back/Forward, and refresh in both browsers at all six widths. Production has not yet received the application changes in this working tree.

## 5. Grammar findings

Read-only production inspection found:

| Dataset | Rows |
| --- | ---: |
| Canonical Grammar Notes | 0 |
| Approved, unmerged canonical notes | 0 |
| Grammar source examples | 0 |
| All enrichment source examples | 0 |
| Existing website grammar practice sources | 26,323 |
| Prepared practice records | 6,547 |
| Naḥw annotations | 50 |

The canonical read RPC and the existing practice RPCs are present. A canonical read of a missing UUID returns `null`. There is no evidence that approved production canonical notes were hidden by RLS: there are no rows in those tables to render. Existing practice data is a separate system and was preserved.

The local fixture tests cover an approved A1 note with chapter and Episode examples; A2–C2 have clean empty states. Detail rendering covers English/Arabic titles, CEFR, explanation, optional mechanics/recognition fields, examples and source titles. Candidate and missing IDs remain unavailable. Injected query failure produces recovery rather than a fake empty level.

**Production Grammar Notes, Episode canonical examples, and real-note detail verification: BLOCKED by zero existing canonical notes/examples and an application deployment still outstanding.** No generation, approval, import, enrichment, or backfill was started to fill the gap.

## 6. Existing content and pipeline evidence

| Stage | Production observation |
| --- | ---: |
| Books | 21 |
| Released Books | 18 |
| Chapters | 134 |
| Legacy chapter arrays | 132 |
| Structured 1.1.0 chapters | 2 |
| Shows | 24 |
| Episodes | 127 |
| Nonempty Episode transcripts with existing Show associations | 125 |
| Ready public transcripts | 178 |
| Ready Explore-published Admin transcripts | 68 |
| For You candidates | 9,368 |
| Transcript groups | 9 |

Read and Watch displayed existing titles. Show/Episode and Book/chapter-gate pages were opened from real links. Explore rendered existing eligible content; its observed first batch contained 12 items. The public For You checks opened real Arabic and English sources and player iframes and exercised next/previous and Settings. Exact run evidence and source IDs are in the production JSON artifacts, including any blocked/retried check.

Legacy token chapters and structured 1.0/1.1 compatibility remain supported. The connected browser fixture uses schema 1.0.0; the full unit suite includes compatible 1.1 versions. Real production 1.1 reader access without a signed-in session remains gated, so it is not represented as authenticated production verification. Read-only shape checks found no non-object blocks in the legacy chapter or Episode arrays. No malformed production record was removed or repaired by rewriting its content.

Two specific availability findings are content state, not permission workarounds: `/cartoons/phr/phr-1` (“A Drop in The Ocean”) and `/cartoons/phr/phr-2` (“Empty Handed”) currently have empty transcript arrays. The two structured chapters, `adgr/adgr-1` and `advs/advs-1`, belong to Books with `is_completed=false`. Their release flags and content were preserved. Production does not currently have the optional `chapters.is_published` column; the application's existing narrowly scoped compatibility reader handles that absence. No migration was applied to change it.

- [Production data diagnostics](validation/full-reliability/production-diagnostics.json)
- [Chrome route observations](validation/full-reliability/production-chrome.json)
- [Firefox route observations](validation/full-reliability/production-firefox.json)
- [Chrome six-width flows](validation/full-reliability/production-flows-chrome.json)
- [Firefox six-width flows](validation/full-reliability/production-flows-firefox.json)
- [Separate Arabic/English discovery controls](validation/full-reliability/production-discovery.json)

## 7. Authentication and account states

Signed-out production access was tested on the public surfaces. Protected chapters, audiobooks, Grammar activities, Memory, and Profile expose their existing sign-in experience where intended. Book chapter cards may open sign-in on the Book page without navigating; the tests account for that behavior.

The isolated local backend verifies the application's normal session/role paths using synthetic free, premium, and Admin accounts. Profile Settings/AWM+, reader and Grammar access, metered/unlimited For You behavior, Admin denial, and Admin reads are tested without real account or subscription changes.

**Real signed-in free/AWM+/Admin production-session QA: BLOCKED.** No live account sessions were provided or created. No Stripe checkout, renewal, cancellation, email, password reset, or Admin content mutation was executed against production. Existing unit tests cover those action boundaries, but they are not a substitute for live account QA.

## 8. Mobile QA

Real public production connected-flow checks passed at **320px, 390px and 430px** in Chrome and Firefox. Local repaired-build flows cover the same widths, including the new grammar UI, Episode controls, reader controls and pointer hit-testing. Screenshots are under `docs/validation/full-reliability/`.

## 9. Tablet and desktop QA

Real public production connected-flow checks passed at **768px, 1024px and 1440px** in Chrome and Firefox. Local repaired-build coverage checks grammar/reader/episode behavior at these widths and rejects horizontal document overflow. Profile, catalogue tabs, discovery controls, and authentication combinations have their specific evidence in the browser report and matrix.

## 10. Browser and test verification

<!-- FINAL-VERIFICATION-START -->
**Chrome and Firefox: 26 final scenario outcomes passed, 0 remaining failures**, across the initial full run and targeted follow-ups. This is not represented as one clean uninterrupted run: the initial run passed 21/26; discovery controls were rechecked after allowing normal overlay transitions, and Firefox Admin aliases were rechecked after waiting for their canonical redirects. The final four discovery scenarios passed again after the access-retry change. All raw attempts are retained.

- [Combined final browser outcomes](validation/full-reliability/browser-results.json), including links to raw run filenames and per-scenario attempt history.
- [Initial 26-scenario run](validation/full-reliability/browser-initial-results.json).
- [Final four discovery checks](validation/full-reliability/browser-discovery-results.json).
- [Final Firefox Admin check](validation/full-reliability/browser-followup-results.json).

Full Vitest verification: **228 files passed, 4 skipped; 1,558 tests passed, 6 skipped**. After the final access-retry adjustment, the two focused allowance/playback files passed **14 tests**. Final TypeScript checking and ESLint on all changed/new TypeScript files passed. The final **Cloudflare/vinext production build passed**; its [build log](validation/full-reliability/vinext-build.log) is retained. Installed Next route types were regenerated after that build and TypeScript passed again.

The local browser suite used a real optimized Next production build with an isolated backend and synthetic accounts. Real production browsing used the existing deployed site with real public content; it does not verify deployment of this working tree. The 12 six-width production connected flows passed without page errors. The separate extended discovery run passed two of four checks and retains two BLOCKED results: Chrome at 390px waited unsuccessfully for an active Explore item, and Firefox at 1440px emitted the cross-origin error described below. These remain limitations of live certification.
<!-- FINAL-VERIFICATION-END -->

Chrome is the installed Chrome executable; Firefox is the installed Playwright Firefox browser. No WebKit browser or WebKit Playwright project was configured/available in this environment. WebKit QA is therefore **BLOCKED**, not PASS.

Local vinext development parity was attempted separately and encountered MUI CommonJS wrapper/client optimization errors plus unavailable fixture Worker runtime bindings. This is recorded as **BLOCKED development parity**, not as a failed production deployment or a verified production root cause. Experimental parity-only config changes were removed. The actual vinext production build and real deployed production browsing are separate checks.

Normal-use browser errors are recorded separately from expected fault injection and denial logs. The extended production discovery run captured Firefox's intermittent `Permission denied to access property "type"` exception. Its stack crosses a React transition callback, Firefox's `resource://gre/actors/PictureInPictureChild.sys.mjs` sandbox, and the YouTube embed. This suggests browser/iframe PiP interaction; it is not sufficient evidence for a specific application repair. The error was not suppressed. The six-width production run had no page errors, while the extended discovery run retains its BLOCKED status.

## 11. Engineering and remaining scope

Shared helpers: `publicRead.ts`, `grammarNote.ts`, existing bounded-read infrastructure, grammar public-reader actions, and the auth-aware site shell. New route rendering uses a small client `RouteButton` boundary so MUI receives the Link component on the client rather than trying to serialize its function from a Server Component.

Tests added: public-read outage/missing distinctions; approved grammar association filtering and query failure; optional grammar-field normalization; public-shell auth recovery; stalled For You access; URL/history and pointer hit-testing across the principal learner flows. Existing Profile/navigation mocks were updated to model the now URL-owned tabs.

Changed files are listed in [the engineering manifest](validation/full-reliability/changed-files.txt). Automated runners and generated evidence are retained for repeatable verification. The route matrix explicitly marks unexercised internal-navigation combinations. The 965-element source inventory is not exhaustive runtime certification, and not every mutation button was clicked.

- Migrations required for these application repairs: **NO**.
- Production migration applied: **NO**.
- Production application deployed: **NO**.
- Production canonical grammar content created, regenerated, approved or backfilled: **NO**.

Remaining acceptance blockers: real canonical grammar content availability; deploying the application changes; real authenticated production account QA; WebKit availability; and runtime checks explicitly marked BLOCKED in the matrix. No schema migration is proposed as a workaround for empty content.

## 12. Data safety confirmation

These confirmations refer to production. Automated tests use only isolated synthetic fixtures and in-memory test databases.

**DELETE statements executed against production content: NO**

**TRUNCATE statements executed: NO**

**DROP statements executed: NO**

**Existing content overwritten/recreated: NO**

**Historical enrichment/backfill started: NO**

**Books deleted: NO**

**Chapters deleted: NO**

**Shows deleted: NO**

**Episodes deleted: NO**

**Transcripts deleted: NO**

**Phrases deleted: NO**

**Grammar Notes deleted: NO**

**The website was tested as a connected product rather than as isolated pages.**

**Broken navigation, buttons, loaders and shared reliability issues identified in this audit were fixed at their root causes in the local application.**

**Browser Back and internal navigation passed across the principal learner flows exercised in Chrome and Firefox.**

**Grammar Notes and Grammar in Context load correctly in the repaired local build with approved fixtures. Production note verification is BLOCKED by empty canonical data and the outstanding application deployment.**

**Existing ArabicWithM production content was preserved and no destructive database action was taken.**

A blanket assertion that every acceptance criterion is complete would be inaccurate while the listed blockers remain. The matrix records unexercised combinations, and section 10 retains the extended live discovery limitations.

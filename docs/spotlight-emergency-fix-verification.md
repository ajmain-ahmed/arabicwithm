# Spotlight and website controls — 8 November 2026

The database repair is applied to `whbxgwucsoguqzpnpzjd`. Website source changes are in this checkout; no commit, push or Vercel deployment was performed.

## Spotlight

Two separate causes were verified against production:

1. `home_for_you_spotlight` was absent. The migration history contained no `20261107140000` entry, and production logs showed repeated HTTP 404 RPC calls. The previously approved migration was applied unchanged.
2. That migration then failed with PostgreSQL `42883`: its window helper accepts a `numeric` duration, whereas production `youtube_transcripts.duration_seconds` is `double precision`. The old PGlite fixture used `numeric`, hiding this problem. The fixture now matches production. After separate user approval, `20261108192634_home_spotlight_transcript_first.sql` was applied. Both migration-history versions now match the checkout.

The old selector walked segment-candidate hash ranges and tested a window for each candidate until finding a result. The corrected selector first chooses a seeded pool of at most eight eligible transcripts, then tries up to 24 timed starting segments per transcript. Exactly one broader/raw-token fallback may consider 32 transcripts and 96 starts per transcript. The Homepage still selects on the server and passes one clip as initial data. It does not initialize the feed or perform a routine hydration selection request.

English group `5b98c563-5c35-4696-98e1-06aa000eb622` and all descendants remain excluded. Existing publication, source, channel, episode and segment-quality checks are retained. No language field or content format was added. A separate language-metadata request was removed from the Homepage selector.

Speech windows start at actual timed paragraphs, preserve paragraph order, stop at missing positions, invalid tokens, excluded content or gaps longer than three seconds, and end at complete segment boundaries. They require 30–60 seconds, prefer 40–60 seconds and completed thoughts, reject non-speech markers, require five meaningful words and at least 55% speech coverage without double-counting overlaps. No audio is downloaded or processed.

The application shares one three-second deadline between the primary RPC and its optional fallback. Errors include the database code/message and elapsed time in server logs. Normal loads make one request. A YouTube media/unavailable/embedding error can trigger one automatic replacement selection; the rejected transcript is excluded from that replacement and there is no infinite retry loop. A second player failure remains visible. This cannot guarantee availability of third-party videos whose owners or delivery policies change.

### Actual catalogue counts

A read-only production snapshot was replayed through the real migrations in disposable local PGlite:

| Stage | Count |
| --- | ---: |
| Canonical candidate segments | 8,968 |
| Published eligible transcripts before AR exclusion | 66 |
| After English subtree exclusion | 64 |
| Can form a 30–60-second window | 64 |
| Can form a qualifying speech window | 64 |

Twelve local selections from this snapshot succeeded across ten different video IDs in 5.78–23.63ms. These local SQL timings are distinct from production HTTP latency.

### Production timings and IDs

Before the correction, three actual PostgREST requests all failed with `42883`, taking 904, 1,994 and 1,449ms. After the correction, the final twelve-request sample returned twelve clips successfully: minimum 63ms, median 158ms, maximum 301ms. A separate earlier transport probe did time out at three seconds; it was not a successful selection. Real production `EXPLAIN ANALYZE` samples measured about 71ms and 208ms of SQL execution.

| YouTube ID | Start | Clip duration |
| --- | ---: | ---: |
| VBd6bOlOm9o | 279s | 59s |
| XSsfVF32yHI | 97s | 59s |
| 17qBl67La3I | 513s | 58s |
| Rw_qbjWpqck | 242s | 35s |
| WihbCAXMVhI | 246s | 40s |
| yKdkTfeCNf8 | 222s | 54s |
| 5zojWKOK7Sc | 441s | 59s |
| VBd6bOlOm9o | 187s | 60s |
| 1Gy3XRQem0I | 459s | 58s |
| 1Gy3XRQem0I | 972s | 57s |
| Rw_qbjWpqck | 221s | 56s |
| 1apHL3fuPpE | 405s | 57s |

Raw live RPC measurements are in [live-rpc.json](validation/spotlight-fix/live-rpc.json). A valid selected ID is not proof that YouTube permits embedding; browser verification separately exercises the real player. In particular, real testing discovered YouTube errors 150 and 5 and led to the bounded replacement handling.

All three functions are `SECURITY INVOKER` with an empty search path. The public RPC remains service-role only; anonymous execution is denied. No content, English group membership, billing settings, storage policies or AWM Kids code was changed.

### Real Chrome and Firefox playback

The final run used the standard local production build against the repaired production database and the real YouTube IFrame API, without media or iframe mocks. Three reloads in each browser passed:

| Browser | YouTube ID | Start | Duration | Ready after navigation |
| --- | --- | ---: | ---: | ---: |
| Chrome | Mff4CZXWVsY | 273s | 60s | 2,282ms |
| Chrome | Lwck6PHeZLA | 1,679s | 42s | 1,022ms |
| Chrome | 1Gy3XRQem0I | 583s | 57s | 622ms |
| Firefox | 1Gy3XRQem0I | 484s | 59s | 1,432ms |
| Firefox | ru6DAbFzVio | 533s | 57s | 1,178ms |
| Firefox | 5zojWKOK7Sc | 487s | 58s | 1,691ms |

Every case reached API ready state, advanced inside the intended start/end range, and passed native YouTube Pause/Play. The first clip in each browser additionally verified subtitle advancement and seeking near the end followed by the end-boundary stop. Guest allowance increased from actual playback and persisted between reloads. Median readiness was 1,305ms, including page render, network and YouTube initialization, which is separate from SQL selection latency.

The final real-media checks ran sequentially after the fixture browser suite finished. Earlier overlapping headless probes produced pauses and were not counted as passes. Real tests also identified third-party playback errors, now handled by one bounded replacement. Synthetic signed-in accounts cover authenticated lifecycle and membership behavior; no production account was created or signed in for these checks.

Raw evidence: [real-playback.json](validation/spotlight-fix/real-playback.json).

## Mobile Explore / For You

Both choices are restored in one segmented pill. Explore uses `/explore`; For You uses `/explore?view=foryou`. Back/Forward restores the active segment. AR/EN renders only on For You. The desktop switcher is unchanged.

At 320, 390 and 430px, the first toolbar row contains the view pill and AR/EN with a 12px gap; the second contains playback/settings/filter/navigation controls. Pill heights and rounded edges are consistent, controls can wrap, and the page does not overflow. Imports remains hidden from the mobile filter while All groups still includes eligible imported content. Filter open/apply behavior was verified.

## Homepage / Profile

Mobile Quick Actions precedes the AWM+ card. Responsive order keeps the desktop card placement. The canonical membership component still decides active/free messaging; active members are not told to upgrade.

The signed-in owner's app card now follows the AWM+ account-status row inside the same Account section and content column as the Profile banner. Its `fullWidth` variant uses the available width instead of an independent maximum/fit-content width. Geometry checks at 320/390/430/1024/1440px confirm matching left/right edges and no overflow. The existing separate AWM+ management tab remains intact; no extra Profile upgrade card was added.

## Audiobooks

Reader and Listen use the existing `ChapterAudioPlayer`. Speed options are 0.75×, 1×, 1.25×, 1.5×, 1.75× and 2×; default is 1×. The menu updates the real HTML audio element's `playbackRate` or the existing YouTube API rate setter. Unsupported YouTube source rates are disabled and an unsupported retained preference is explained.

The chosen rate lives in the existing Zustand player store and survives chapter changes and client navigation. The existing audio engine remains owned by each page; this change does not introduce continuous cross-route audio playback. Real decodable audio tests in Chrome and Firefox at 320/768/1440px verify changing all six speeds while playing, changing while paused without moving `currentTime`, seeking, chapter changes and Listen-to-reader navigation.

## Desktop Books

Search is 300px wide at the medium breakpoint and 420px at the large breakpoint. Search, Read/Listen and Filter use 52px desktop height with pill edges and matching borders. Mobile search dimensions retain the existing layout. Geometry, search and filter dialog behavior passed at 1024/1280/1440px in Chrome and Firefox.

## Engineering verification

The final Chrome/Firefox production-fixture run passed all 28 cases in `e2e/spotlight-fix.pw.ts` and `e2e/home-spotlight-selection.pw.ts`. Fixture videos verify lifecycle/subtitles/allowances and error states; real HTML audio verifies actual media rates. Real YouTube playback is checked separately by `scripts/check-spotlight-playback.mjs`; its report must be read separately from synthetic player tests.

The final full Vitest run passed 1,265 tests across 178 files; four tests in two optional live-test files were skipped. New regression cases cover production's `double precision` duration type, unflagged music/applause/intro/silence, starting after introductory music, transcript-pool bounds and exactly one unavailable-player replacement.

`npm run build` passed with the project's default Turbopack builder and real backend. TypeScript, focused ESLint and `git diff --check` passed. The alternative Webpack build encountered an existing Google Fonts URL-extension parsing failure; the standard build required no font workaround or source change.

Reproduce the live data checks using:

```powershell
node --env-file=.env.local scripts/verify-home-spotlight.mjs
node --env-file=.env.local scripts/measure-home-spotlight.mjs
npx playwright test --config playwright.spotlight-fix.config.ts e2e/spotlight-fix.pw.ts e2e/home-spotlight-selection.pw.ts
```

`verify-home-spotlight.mjs` only reads production data and runs migrations in disposable local PGlite. `measure-home-spotlight.mjs` makes read-only production RPC calls. Credentials remain server-side and are never written to these reports.

Changed source: `app/lib/homeSpotlight.server.ts`, its tests and migration tests; `app/actions/forYou.ts`; `HomeForYouSpotlight`, `HomeDashboard` and `AppDownloadSection`; `ExploreViews` and `MobileForYouPanel`; `ProfileView`; `ChapterAudioPlayer`; `BooksLibrary`; `store/playerStore.ts`. Added the corrective migration, component recovery tests, focused browser suite/config, read-only verification scripts and this report. The fixture server gained optional Webpack-build flag support only.

# ArabicWithM navigation and startup validation

Scope: local source and isolated production-build QA on 20 November 2026. The public production site was inspected read only. These changes have **not been deployed**. Test media, accounts, subscriptions, and catalogue records are synthetic.

## Watch

The canonical catalogue route is `/cartoons`; show and episode destinations remain `/cartoons/[show]` and `/cartoons/[show]/[episode]`.

Two failures were reproduced before changing Watch:

1. On the live site and local baseline, the server-rendered desktop navbar appeared on phone widths before hydration. At 320, 375, 390, 414, and 430 pixels, the Home logo intercepted the centre of Watch. Clicking it on the Homepage left the page at `/`. This was reproduced in WebKit with JavaScript disabled to hold the initial server frame; it is not a physical iPhone recording. See `hit-target-before.json` and `pre-hydration-production.png`.
2. Intentionally stalling `/cartoons` React Server Component requests left both desktop Watch and the mobile menu on `/learn`, without a Watch view or error. See `stalled-transition-before.json`. This fault injection establishes a failure mode; it does not establish that a stalled request caused the user's particular session.

The navbar now selects its phone/desktop layout through responsive CSS from the first server frame. Watch in the desktop navbar, mobile drawer, floating menu, first-session shortcuts, and footer uses a native browser link to `/cartoons`, so it does not depend on the client transition cache. Normal history entries are retained. Other destinations and Featured's show/episode links retain their existing behavior. No obsolete `/watch` catalogue destination was found that needed a redirect.

Watch deliberately performs a document navigation. Transient JavaScript state, including an in-memory floating player, is recreated across that navigation; this is the reliability tradeoff for bypassing a stalled client transition.

The route trace is navigation link → `/cartoons` → `Catalogue` → public show/episode reads → filter/pagination normalization → `CartoonsPage` → existing show/episode cards. Public content is independent of Admin role checks. The Admin Show editor now loads only when opened. An explicit `category=All Categories` bookmark is normalized to no category filter, preventing a false empty catalogue.

The data-access review checked the [Supabase SELECT API](https://supabase.com/docs/reference/javascript/select) and [current changelog](https://supabase.com/changelog.md). Existing query filters, error handling, and server authorization are retained; no SDK, schema, permissions, or authentication configuration migration is introduced.

Browser coverage includes Homepage/top navigation, drawer, floating and first-session menus, footer, Explore, For You, Library, Profile, Learn, Featured Play/Episodes, shows, episodes, player/transcript, Memory, Settings, related content, refresh, and Back/Forward. Viewports are 320, 375, 390, 414, 430, 768, 1024, and 1440 pixels. The native-link test deliberately stalls client transitions and requires a real document request. Desktop Watch also navigates with JavaScript disabled; interactive catalogue filtering and playback still require JavaScript.

**The Watch button works from every supported entry point in the tested local build once the page is interactive.** The final Watch gate passed 76 cases: 19 each in WebKit, Chrome, Firefox, and Edge. Homepage Learning shortcuts do not contain a separate Watch control; the existing menus, Featured, and content cards supply those destinations.

Readiness matters in browser automation: controls are exercised after hydration, Profile's canonical redirect, and streamed footer layout settle. A pointer held across an early footer layout shift can release over newly positioned content; that startup layout behavior is recorded as a remaining limitation, separate from the fixed navbar interception and stalled Watch transition.

## Featured

The former `HomeDashboard` fallback could render the legacy static hero when the curated selection was empty, including after the old 1.2-second artwork deadline. That branch is removed. There is one current path: `HomePage` → `FeaturedSection` → `FeaturedCarousel` → `FeaturedHero`. Empty/loading/error selections retain the current Featured frame or an available show cover.

The Homepage cannot fall back to the legacy hero during normal operation in this source. Curated artwork, crop, responsive image selection, selected-slide-only images, three-day London rotation, Play, Episodes, and show destinations are preserved. This checkout supports Show-based Featured items; there was no existing Learn-specific Featured target to remove or convert.

## Learn

Grammar in Context and learner Episode Grammar Note entry points are removed. `/grammar/context/*` and `/grammar/notes/*` safely redirect to `/grammar`, including when historical note reads fail. Naḥw and Ṣarf activities and their content remain. Historical tables and Admin tools are retained.

## Safari performance

Independent public reads now start together, Featured streams independently, and Spotlight selection/player/transcript/metering load once near the viewport. Public rendering does not await authentication, account roles, subscriptions, Memory, or profile reads; authorization checks remain enforced on the server.

Three fresh contexts per engine were measured against a Next production build and synthetic backend at 390 × 844. Analytics and external media were blocked consistently. Timings are medians, in milliseconds. “Usable” is the measured menu/catalogue interaction, not a standardized TTI score. Exact values and request waterfalls are in the adjacent JSON files and `../home-startup/`.

| Measurement | WebKit before → final | Chrome before → final |
| --- | ---: | ---: |
| Homepage TTFB | 23 → 16 | 16.5 → 20.2 |
| Homepage FCP | 111 → 118 | 140 → 152 |
| Homepage LCP | 188 → 199 | 140 → 152 |
| Homepage menu usable | 1,564 → 931 | 665.5 → 685.1 |
| Featured visible with Spotlight delayed 2,500 ms | 2,647 → 170 | 2,643 → 246.4 |
| Menu usable with delayed Spotlight | 3,643 → 882 | 3,043 → 699.2 |
| Watch catalogue usable | 1,151 → 911 | 317 → 327.6 |

Normal paint timings are approximately flat/slightly slower in these small samples. The repeatable improvement is removal of the slow Spotlight dependency; the timings do not justify claiming every metric improved. Baseline Featured visibility was sampled after DOMContentLoaded; final polling begins at response commit to observe streamed content. No production after-deployment samples exist.

Homepage JavaScript through the measured interaction falls from 401,625 to 394,101 bytes; Watch from 335,821 to 322,263 bytes (decoded Watch JS: 1,029,234 → 988,090). Median Chrome homepage script execution falls from approximately 183 to 164 ms. WebKit does not expose equivalent isolated JS CPU/hydration-duration data here; hydration completion timestamps and React commits are recorded instead.

The installed vinext local-font shim preloaded all eight faces despite `preload: false`. Reading faces now use CSS `@font-face` with `font-display: swap`, preserving their original bytes. UI font preloads fall from eight/1,261,292 bytes on live production to three/190,112 bytes locally. Reader fonts load when used. Current production curated AVIF artwork was verified at 46,409 bytes for the 828-pixel variant. Responsive crops are preserved; synthetic fallback image sizes are not production image measurements.

## Installed iPhone web app

The manifest retains ID, `start_url`, and scope `/`, plus `display: standalone`. Manifest and Apple icons return 200. Apple standalone metadata and theme color are present. Homepage HTML is private/no-store; manifest and the independent recovery script revalidate. Existing tagged/per-build caches remain.

No service worker exists in current source or fresh tested browser profiles, and none was introduced. Older physical installations were not inspected. Stale first-party chunk failures, a stalled hydration watchdog, and offline events on an existing page offer a manual reconnect/reload path without reload loops. A first navigation while completely offline still uses the browser's network-error page; full offline functionality is not provided.

Standalone API emulation covers signed-out, signed-in, expired-token refresh, denied storage, refresh/history, simulated resume, offline notice, and chunk recovery. Physical iPhone Home Screen installation, Safari application startup, and an actual OS process restart remain **BLOCKED: no physical device available**. Emulation is not a physical-device pass.

## Browser QA and reliability

Final machine-readable results are `browser-results.json`, `reliability-browser-results.json`, `../home-startup/browser-results.json`, and `../home-startup/curated-results.json`: **196 passed, zero failures or flaky cases** (76 Watch + 60 site reliability + 52 startup + 8 curated Featured).

| Browser | Final passed cases |
| --- | ---: |
| Playwright WebKit | 49 |
| Installed Chrome | 49 |
| Playwright Firefox | 49 |
| Installed Edge | 49 |

WebKit is a real WebKit runtime, not Safari-branded physical-device testing. The full unit suite passed **1,572 tests**, with six skipped across four skipped files. Both Next and Cloudflare/vinext builds, TypeScript, changed-file lint (zero warnings), and `git diff --check` passed.

All statuses below refer to the isolated local build and tested interactive flows. Admin statuses cover role denial and authenticated read access; they do not claim a production mutation test.

| Route/feature | Result |
| --- | --- |
| Homepage | FIXED |
| Featured | FIXED |
| Watch | FIXED |
| Show | PASS |
| Episode | PASS |
| Explore | PASS |
| For You | PASS |
| Read / Book | PASS |
| Reader | PASS |
| Learn | FIXED |
| Naḥw | PASS |
| Ṣarf | PASS |
| Memory | PASS |
| Profile | PASS |
| Library | PASS |
| Settings | PASS |
| Admin Books | PASS |
| Admin Phrases | PASS |
| Physical iPhone/Safari/Home Screen launch | BLOCKED |

The reliability matrix and exact final test totals are recorded in `verification.json`. Builds, unit tests, lint, and whitespace checks are local verification; no deployment or content migration was performed.

## Engineering

The complete list of 54 changed application/test/config/script files and source hashes are in `source-files.json` and `source-snapshot.json`. Application changes are concentrated in the Homepage/Featured pipeline, deferred Spotlight, fonts/startup recovery, navigation, Watch catalogue, and retired Grammar routes, with corresponding unit/browser coverage.

- Service worker changes: none.
- Manifest changes: none; existing launch configuration retained.
- Cache changes: Homepage HTML no-store; manifest/recovery script revalidation; existing tagged catalogue and per-build caches retained.
- Routing changes: canonical `/cartoons` links; native Watch document navigation; Context/Note redirects to `/grammar`; existing show/episode routes retained.
- Migrations required: **NO**.
- Deployed: **NO**.

Verification commands are `npm test -- --run`, changed-file `npx eslint`, `npm run build:vinext`, and the three Playwright configurations `playwright.watch.config.ts`, `playwright.home-startup.config.ts`, and `playwright.site-reliability.config.ts`. Browser tests use `e2e/fixture-server.mjs` in production mode on ports 3077/4377 with `AWM_TEST_FULL_RELIABILITY=1` and `AWM_TEST_STRUCTURED_BOOKS=1`. Curated Featured checks use `AWM_FEATURED_CAROUSEL_FIXTURE=1` with a fresh fixture cache and `AWM_CURATED_QA=1`. No production database credentials are needed by these fixtures.

## Data safety

- DELETE: **NO** (against production content)
- TRUNCATE: **NO**
- DROP: **NO**
- Books deleted: **NO**
- Chapters deleted: **NO**
- Shows deleted: **NO**
- Episodes deleted: **NO**
- Transcripts deleted: **NO**
- Phrases deleted: **NO**
- Existing production content replaced: **NO**

No production content mutation, destructive reset, or replacement import was run. All deliberate state-changing browser QA used only the isolated fixture backend.

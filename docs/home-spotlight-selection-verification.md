# Homepage Spotlight selection optimisation

Implemented locally on main. No commit, push, deployment or production database operation.

## Confirmations

- Homepage Spotlight no longer uses the full feed-style refill process to find one clip.
- Normal For You feed behaviour was not changed.
- Spotlight selects only eligible AR clips between 30 and 60 seconds.

## Measured bottleneck and method

Before changing the implementation, six local Chrome navigations were measured against the existing production build. The isolated synthetic HTTPS Supabase fixture added a controlled 20ms delay to each database request. Browser request/response events and backend request start/finish timestamps isolated Spotlight traffic from independent Homepage catalogue actions. These are local transport/flow measurements, not production Supabase measurements. The browser fixture instruments the YouTube API; these runs verify initialization and controls, not real YouTube network startup latency.

The old flow was Homepage render -> hydrate -> auth/guest wrapper mount -> Spotlight effect -> Server Action -> English group tree/membership reads -> generic feed RPC -> application rejection of English sources -> candidate-ID exclusion reads/refills -> normalise -> response -> player mount. Source inspection also found eight outer Spotlight attempts and the generic loader's eight-second refill deadline. No eight-second hang occurred in the six baseline samples; raw-token fallback was not needed in those samples.

Observed English rejection caused extra discovery/refill requests in two of the six samples. Client-mount latency and sequential database round trips dominated. A separate local normalisation microbenchmark averaged 0.0055ms per selected clip; parsing was not the primary cost.

## Before/after local browser measurements

Each column uses six local loads with the same 20ms/query fixture and 390px viewport. DOMContentLoaded is an initial-render proxy, not a first-paint or LCP measurement.

| Measurement | Before median | Final after median |
| --- | ---: | ---: |
| Homepage DOMContentLoaded | 54.0ms | 97.0ms |
| First post-mount selection request starts after navigation | 356.0ms | No automatic client selection request |
| Spotlight Server Action request/response | 133.0ms | None; clip is in initial server data |
| English group + membership HTTP request duration combined | 55.5ms | No separate HTTP lookups; SQL subtree exclusion |
| Selection span: first DB request start to final DB response finish | 115.0ms | 30.5ms |
| Spotlight database calls | 3-7 (median 3) | Exactly 1 in all six normal samples |
| Generic candidate RPC calls | 1-3 | 0 |
| Feed refill requests after rejection | 0-2 | 0 |
| Visible iframe observed by the same Playwright wait | 996.0ms | 438.0ms |

A MutationObserver additionally recorded final iframe insertion at 406.9ms median. Baseline insertion was not instrumented with that observer; the comparable visibility probe above was used on both versions. Initial DOM readiness increased slightly because the response now includes a selected clip; player visibility improved substantially.

An intermediate streamed server-component implementation selected quickly but deferred below-fold hydration. It was replaced by direct initial props in the existing Homepage payload. The final approach loads Spotlight in parallel with existing Homepage reads and preserves all current layout/player components. There is no additional Spotlight Suspense hydration boundary.

## Current request and database architecture

1. Homepage uses 60-second incremental static regeneration and starts the dedicated selector alongside existing catalogue reads. Visitors share the cached clip until regeneration instead of requiring a database selection on every view.
2. home_for_you_spotlight returns one JSON clip from the canonical live for_you_candidates index. It applies publication/source quality rules and excludes English group 5b98c563-5c35-4696-98e1-06aa000eb622 and all descendants in SQL, before LIMIT 1.
3. A fresh UUID at each regeneration determines an indexed MD5 hash-ring pivot. At most two indexed ranges wrap around the ring; no full-table ORDER BY random(), huge JavaScript shuffle or persisted second catalogue. Hashing avoids bias from large numeric-ID gaps.
4. A bounded contiguous transcript window requires canonical segment quality, usable tokens, at least five meaningful words, complete segment boundaries and 30-60 seconds. Completed thoughts at 40-60 seconds are preferred. No manual/music/theme exclusions or long gaps may be crossed.
5. Canonical tokens are preferred. If no primary result exists, exactly one optional compatibility RPC may use selected segments' existing raw source tokens. No whole raw transcript is transferred or repeatedly loaded through application fallback logic. Both calls share one 3000ms abort deadline.
6. The server result is normalised and passed through HomeDashboard as initial client data. Mount, theme, resize, subtitles and mute do not select again. Refresh within the reuse window can return the same clip; explicit Retry can make a new selection after a visible error.

The existing normal feed loader, RPCs, diversity/exclusions, AR/EN classification, guest/authenticated allowances and playback hook were not modified. No source_language field, language migration, content table or hardcoded production video list was added.

## Real local SQL measurements

The actual migration and existing canonical quality/candidate migrations were executed in disposable PGlite PostgreSQL, separately from the HTTP/browser fixture. Local planner statistics were refreshed for both query comparisons. Timing depends on local CPU, planning and test load and is not a production latency forecast.

- 25 sources / 100 candidates: generic RPC median 34.32ms; dedicated RPC median 27.69ms (7 requests each).
- 2,525 sources / 10,100 candidates: dedicated RPC median 1.54ms (10 requests, warm indexed plan).
- Both measurements are comfortably below the requested local 500ms selection target. Transport measurements above use synthetic responses and should not be added to these separate SQL benchmark numbers.

## Failure and release behaviour

Empty primary + empty compatibility result produces a compact intentional state with the existing Watch More action, never an endless selection spinner. RPC/transport/invalid-data failures produce a visible error with explicit Retry and a sanitized server diagnostic. Missing RPC migration is a real visible error, not a fallback to generic feed discovery.

The migration adds only a service-role RPC, its restricted private helper, and two supporting indexes on existing tables. It creates no content table, copies no content/accounts and changes no production records or Storage policies. It has NOT been applied to hosted Supabase. A later authorised release must apply this migration with the application; deploying only the application would leave the RPC unavailable.

## Tests

- 79 focused Vitest tests passed, including the actual SQL migration/permissions/scale tests, sparse-ID randomness, English descendants/renames, source and segment eligibility, duration/quality, gaps, malformed canonical data, raw-only fallback, shared deadline, server initial data, normal feed and classification regressions.
- Chrome production-fixture suite: 38 passed (2.0m) on the final direct initial-data build.
- Firefox: all 37 applicable cases passed across the final suite and native-control rerun; the one Chromium CDP touch case is intentionally skipped in Firefox and passed in Chrome.
- Native Pause tests now explicitly wait for autoplay readiness rather than equating visible iframe with playing state. No player logic was changed to satisfy tests.
- Production Next Webpack build, TypeScript, focused ESLint and git diff --check passed.
- Browser tests cover server HTML initial clip, no mount action/refills, theme/resize/subtitle stability, refresh variation, raw/empty/error/retry states, signed-out and signed-in playback, shared five-minute guest allowance/exhaustion/registration, timed subtitles, native controls and normal Explore/For You AR/EN/history behaviour. Existing responsive layout checks passed.

Exact unit command (AWM_SPOTLIGHT_PROFILE_PATH set to an external JSON path enables the scale benchmark):

```powershell
npx vitest run app/lib/homeSpotlight.server.test.ts app/lib/homeSpotlightMigration.test.ts app/lib/homeSpotlight.test.ts app/lib/forYouLiveFeed.test.ts app/lib/forYouGroups.test.ts app/actions/forYou.test.ts app/page.test.tsx app/components/home/HomeDashboard.test.tsx
npx tsc --noEmit
```

Exact browser specs:

```powershell
npx playwright test --config <external-artifacts>/playwright-webpack.config.cjs e2e/home-spotlight-selection.pw.ts e2e/home-spotlight.pw.ts e2e/spotlight-layout.pw.ts e2e/mobile-feed-toolbar.pw.ts
```

The temporary external runner copies the existing synthetic fixture and builds with Next's supported --webpack flag; application build configuration is unchanged. Firefox uses --browser=firefox and its isolated Playwright executable. The final Firefox rerun uses the same built application with playwright-existing-build.config.cjs and e2e/home-spotlight.pw.ts. No user Firefox profile was accessed.

Raw local measurements are retained in the sibling workspace artifacts directory: spotlight-before.json, spotlight-after.json and spotlight-sql-profile.json, with matching browser/unit/build logs.

## Files changed for this optimisation

- app/actions/forYou.ts
- app/actions/forYou.test.ts
- app/components/home/HomeDashboard.tsx
- app/components/home/HomeDashboard.test.tsx
- app/components/home/HomeForYouSpotlight.tsx
- app/lib/homeSpotlight.server.ts
- app/lib/homeSpotlight.server.test.ts
- app/lib/homeSpotlightMigration.test.ts
- app/lib/supabase/database.types.ts
- app/page.tsx
- app/page.test.tsx
- e2e/fixture-server.mjs
- e2e/home-spotlight-selection.pw.ts
- e2e/home-spotlight.pw.ts
- supabase/migrations/20261107140000_home_for_you_spotlight.sql
- docs/home-spotlight-selection-verification.md
- docs/mobile-featured-spotlight-toolbar-verification.md (selection follow-up note only)

Earlier uncommitted mobile UI work remains preserved. Production, AWM Kids, native apps, payment logic, existing content and authentication configuration were not modified.

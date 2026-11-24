# Learn activity performance and verification

The old Learn server render called the general Memory library loader, which sampled up to 24 full episode transcripts, extracted and ranked their cards, and returned 50 cards. Learn then retained five cards from one episode. The same work was repeated on subsequent page requests. Word Search selected batches of six full sources and could continue scanning the whole candidate list. Puzzle-board generation also ran in the Worker.

## Evidence captured before the functional deployment

Cloudflare's sampled Worker-wide window, 24 November 2026 18:06 to 19:06 UTC, reported 21 `exceededResources` invocations. Successful invocations had CPU P99 624.006 ms and isolate-memory P99 48,324,784 bytes. Resource-failed invocations had CPU P99 1,126.534 ms and isolate-memory P99 44,823,932 bytes. These aggregates are not Learn-specific stack traces. Retained Learn invocation records were unavailable before observability was enabled, so they cannot retrospectively identify every failed invocation.

A read-only comparison using the configured production public corpus measured the following loader calls. These are local Windows Node process CPU measurements, **not Cloudflare isolate measurements**. Randomly selected sources vary between calls. Response cloning for byte counting adds local measurement overhead. The local CPU timer is coarse; zero means below its measurement resolution.

| Loader | Call | DB requests before -> after | Response bytes before -> after | Local Node CPU ms before -> after |
|---|---|---|---|---|
| Memory | First | 6 -> 3 | 384,858 -> 27,406 | 656 -> 0 |
| Memory | Repeated | 6 -> 2 | 385,135 -> 10,804 | 453 -> 16 |
| Word Search | First | 14 -> 2 | 173,742 -> 6,865 | 31 -> 16 |
| Word Search | Repeated | 12 -> 4 | 86,481 -> 44,358 | 31 -> 0 |

The repeated whole-source Memory extraction/ranking is a measured CPU bottleneck. The resource outcomes and memory quantiles support CPU pressure rather than evidence of reaching the isolate-memory ceiling; they are not a substitute for route-specific production verification.

## Implementation boundaries

- Learn's initial server render selects one reviewed Grammar question. It does not select or generate transcript-based activities.
- Independent read-only endpoints load Word Search and Memory. They avoid the client Server Action queue and have abortable 10-second client deadlines and per-panel Retry controls.
- A five-minute tagged cache holds at most 256 source metadata records. Each selection checks at most four sources. At most 32 modern or legacy blocks are projected per source; full transcripts and Books are not loaded to select a Learn activity.
- Reusable cached source data contains up to 24 vocabulary words and five Memory cards. Existing catalogue tags invalidate edits. Word Search boards are generated in the browser using the existing generator.
- Memory reviews check a canonical stored block for first-window cards. The original full-source validation remains for legacy compacted saved-card IDs, with its ranked result cached instead of re-ranking the transcript on every review. Verified identity, entitlements, atomic starts, review persistence, and free-session limits remain enforced server-side.
- Grammar uses the reviewed Nahw/Sarf question pool, the existing matching/classification renderer and a maximum-two-candidate authenticated query. Ordering uses the existing structured-activity renderer and the exact reviewed source sentence, explicitly restoring source order rather than asserting it is the only grammatical order. Feedback waits for explicit Next Activity; no Grammar in Context flow is added.
- Each panel owns its state. Word Search and Memory Continue select another activity in place; only explicit Back to Home navigates Home. The Grammar, Word Search and Memory navigation links sit beneath the workspace.
- Invocation observability redacts URL query strings. CPU/memory allowances are unchanged. No schema migrations, publication changes, or content mutations are required.

## Reproducible checks

Run the normal type, lint, unit and `build:vinext` scripts. The deployment workflow additionally runs the Learn browser journey using the isolated corpus.

For the four-browser matrix, start `e2e/fixture-server.mjs` with `AWM_TEST_LEARN_CONTINUITY=1`, `AWM_TEST_WEB_PORT=3062`, and `AWM_TEST_BACKEND_PORT=4362`, then run `npx playwright test --config=playwright.learn.config.ts`. Each mobile/desktop case runs 20 Grammar transitions, ten completed Word Searches and repeated eligible Memory sets. Source/review writes in these checks target only synthetic fixture data.

For public production checks, set `AWM_LEARN_BASE_URL=https://www.arabicwithm.com` and run the same configuration. It adds warm reloads, checks Learn/API error responses and never creates a synthetic production login. Authenticated live Memory requires an existing eligible browser session. Mobile viewports and WebKit are not physical-iPhone verification.

The opt-in read-only loader benchmark runs with `AWM_READONLY_BENCHMARK=1` via `node --env-file=.env.local node_modules/vitest/vitest.mjs run --config=vitest.learn-profile.config.ts`. It reports aggregates in `.learn-readonly-metrics.json`; do not commit that generated file or environment files.

Re-run the Read-only Learn Worker telemetry workflow after live verification. Its default window starts at the latest Worker deployment, capped to one hour, so previous-deployment failures are not attributed to the new build. It reports sampled Worker-wide CPU/memory/outcomes separately from Learn-specific invocation calculations. Do not call the resource-limit issue resolved without passing production checks and reviewing current-deployment telemetry.

## Production deployment and remaining verification

Application commit `26afc9a8c4f2021717c53b69e5a58efde081e0ad` deployed successfully at approximately 20:12 UTC on 24 November. Its exact CI checkout passed TypeScript, lint, the full unit suite, critical browser journeys, both Admin publication-schema checks, and Learn fixture continuity/matching checks. Local Chrome, WebKit, Firefox and Edge checks passed at 390 and 1440 pixels, including 20 Grammar transitions, ten solved Word Searches and repeated eligible Memory sets per case; the four authenticated native matching checks also passed.

The new deployment's 20:12:41-20:21:05 UTC Cloudflare sample contained 184 successful Worker requests and zero errors. Worker-wide CPU P99 was 299.515 ms and shared-isolate memory P99 was 50,676,976 bytes (48.33 MiB). Learn-specific invocation records contained ten `ok` outcomes, CPU P99 299 ms, and no recorded resource-failed outcome. This short window and the earlier one-hour sample differ in traffic and duration; these are observations, not a controlled capacity benchmark or proof that every historical error had the same cause.

The production Chromium smoke and all eight public Chrome/WebKit/Firefox/Edge mobile/desktop cases were **blocked by Cloudflare bot challenges**. Diagnostics captured HTTP 403 on `/learn` or `/api/learn/*` and Cloudflare challenge pages. The activity endpoints returned HTTP 200 in independent direct read-only requests. These failures do not establish an application regression, but they mean the requested live continuity matrix has **not passed**. Bot protection was not weakened, and challenged browsers were not presented as successful verification.

The computer-use tool refused native Firefox control because URL-policy enforcement was unsupported for that Windows browser. No browser session or cookies were extracted as a workaround. A signed-in Admin/AWM+ Memory continuation check was requested from the user after deployment and remains unconfirmed. Physical iPhone Safari was not tested. The resource-limit issue remains **pending production acceptance**, despite the bounded loader improvements and successful telemetry observed so far.

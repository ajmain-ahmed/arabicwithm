# iPhone Safari startup incident — 21 November 2026

The user reports an iPhone 16 Safari tab remaining white, without an error, after having signed in previously. The iOS version is not yet known. Phrase work and database migrations are outside this P0 repair. No production data mutation was performed.

**P0 remains OPEN.** After the first successful production deployment, the user explicitly retested `www.arabicwithm.com` on the iPhone and reported “Still white or stuck”. Local/Windows WebKit passes do not override that result. An independent `/startup-check` route and opt-in, locally stored pre-hydration trace were subsequently prepared to capture the actual phone's failing stage. Device-specific root cause and completion remain unproven.

## Findings and scope of proof

The confirmed first-byte dependency was in `proxy.ts`: any Supabase session cookie caused the proxy to await `client.auth.getUser()` before returning Homepage HTML. Client-side public rendering was already independent of auth, but that did not help while the server proxy withheld the document. `withDataDeadline` bounds underlying fetches; it does not independently resolve an SDK promise waiting on session initialization or a lock. A stalled verified-session read reproduced the withheld response in isolated proxy tests. Those three public-startup tests failed before the change and passed afterward. A browser regression additionally holds `/auth/v1/user` for 12 seconds and requires the first Homepage response within 2.5 seconds, visible Featured and a working menu while Admin remains hidden.

The fix allows only public Homepage/manifest/recovery-script **GET/HEAD** requests through without waiting for session restoration. Homepage POST Server Actions and protected routes still use remote identity verification, and canonical Admin guards are unchanged. Existing cookies are preserved and browser session restoration continues independently. No authorization uses unverified cookie contents.

The physical iPhone's exact failing request has not been captured. This is a confirmed blocking dependency and a relevant repair, not proof that every possible cause of that device's white screen has been eliminated.

Two additional production defects were observed:

- All eight normal production WebKit traces requested `/_next/static/css/notonaskharabic/NotoNaskhArabic-Variable.woff2`, which returned **404** with an immutable cache header. Tailwind's nested CSS import left the relative font URL unresolved in vinext's output. Importing `reading.css` directly from the root layout makes both builders emit correct hashed font asset URLs. Existing font files and typography remain.
- Windows WebKit received the current Featured AVIF with HTTP 200 but could not decode it. Its error happened before hydration attached React's image listener, leaving the fallback unused. The Featured image now checks already-failed images on mount and uses the existing show-cover fallback. This is a startup artwork recovery fix, not evidence that AVIF is unsupported on the user's iPhone 16. The new Featured system, controls and source artwork remain.

An obsolete entry-chunk injection also reproduced absent hydration and an unusable menu. The former deferred recovery script could miss entry-module errors and offered only manual reload. Recovery now runs inline in the first HTML, independent of React and an additional script fetch. The old `/startup-recovery.js` URL serves the same implementation for retained HTML. Genuine missing assets are confirmed before retrying an already-rendered page; prefetch cancellations and departing documents cannot redirect a working navigation. A stalled initial hydration gets one bounded fresh-document attempt, then the AWM “This page took a little detour” interface with Reload. The original errors are not suppressed.

Both a ten-minute session-storage guard and a URL guard prevent reload loops; the URL guard works when Safari denies storage. Recovery preserves query/hash destinations and never clears cookies, local storage, or service-worker caches. Entry assets are refreshed with `cache: reload` before retrying to repair negative HTTP-cache entries, with a three-second hard bound even if fetch cancellation fails. No browser-specific security or auth-lock bypass was introduced. Vite's deployment guidance documents the [stale dynamic-import failure mode](https://vite.dev/guide/build#load-error-handling).

## Production startup baseline

Eight fresh, signed-out production contexts: 375/390/414/430px, each in normal tab and standalone-flag emulation. These are Windows Playwright WebKit measurements, not physical iPhone or installed-app certification. No analytics/media request filter was used.

The following uses the upper middle observed value for eight samples, in milliseconds. “Interactive” means an actual menu click opened the drawer, not a standardized TTI score.

| Stage | Before release | After release |
| --- | ---: | ---: |
| TTFB | 126 | 111 |
| HTML complete | 186 | 150 |
| Featured shell visible | 320 | 407 |
| Featured content container visible | 645 | 557 |
| Hydration mark | 712 | 906 |
| Menu usable | 1,928 | 2,110 |

These small live samples do not show a universal speedup: hydration/menu were slower after release, while HTML/Featured completion improved. They cannot measure the affected physical phone. The [request waterfall](validation/iphone-startup/waterfall.html) and [CSV](validation/iphone-startup/waterfall.csv) contain representative 390px runs; complete raw resource traces are alongside them. The signed-out production samples had eight instances of the font 404 before and zero HTTP failures afterward. Resource/decode errors from Windows WebKit's unsupported AVIF decoding are distinct from JavaScript exceptions; the working image fallback was verified after deployment.

These signed-out baseline runs already opened successfully; they are not measurements of the user's stalled signed-in request. Client-side auth/Supabase calls in signed-out startup: **zero**. The blocking signed-in proxy check happens server-side and cannot appear in a browser resource waterfall. No production test account was created.

The slow-network baseline adds 250ms of browser-side latency per request, without claiming real bandwidth/CPU emulation: TTFB 1,054ms, HTML complete 1,060ms, Featured shell 1,913ms, hydration 1,955ms, menu 3,651ms. The first fatal failure in the injected obsolete-chunk scenario occurs at JS/module loading, before hydration; HTML and the Featured shell still arrive. The largest measured first-party startup asset was 68,371 transfer bytes / 219,274 decoded bytes. The raw resource timelines identify each JS/CSS request, status, MIME type, size and duration. Windows WebKit does not expose the Chromium Long Tasks API; an empty long-task list is not evidence of zero CPU blocking.

The same added-latency after-release run completed with TTFB 396ms, HTML complete 431ms, Featured shell 1,318ms, hydration 1,418ms, menu 3,081ms and no HTTP failures. These are individual network samples. Chrome's separately observed longest task was 133ms before / 58ms after; those are Chrome measurements, not physical Safari CPU timings.

## Service worker, PWA and session restoration

No service-worker registration exists in current source or any fresh production context observed here. Controllers, registrations and Cache Storage names were empty. A stale service worker was **not demonstrated**; no speculative registration removal/cache wipe was added. Physical older installations have not been inspected.

The manifest remains `/site.webmanifest`, ID/start URL/scope `/`, display `standalone`, with existing maskable icons and Apple touch icon. Apple standalone metadata remains. Homepage HTML remains private/no-store; the recovery endpoint is no-store. The corrected CSS references new valid font hashes, so a cached 404 at the obsolete font URL cannot poison the new URL.

The Web Locks implementation and process-lock fallback were audited and preserved. Public first paint no longer depends on acquiring an auth/session lock. Client restoration retains its existing watchdog. Canonical Admin visibility remains denied until verified. Browser fixtures cover fresh sessions, restored sessions, expired-session refresh, storage denial, simulated resume and offline/reconnect; physical OS suspension and actual Home Screen cold/warm launches remain unverified.

## Validation and release status

- Full unit run: **1,583 passed, 6 skipped**; the final recovery/proxy checks, including the three later cache-repair regressions, passed **20/20** separately.
- Final Cloudflare build, Next production fixture build, TypeScript and changed-file lint passed. Vinext and Next write different generated route declarations; they were regenerated after the final builder before TypeScript verification. No type-check bypass was introduced.
- The complete final startup gate passed **60/60** in one process: **15/15 each in WebKit, Chrome, Firefox and Edge**, covering eight widths from 320 through 1440px. Earlier failed experiments are retained and are not counted as passes.
- The same build also passed the broader **60/60 learner regression**, 15 cases in each browser, covering public routes, readers, Memory, media controls, Profile/Library history and all canonical Admin role guards. Combined browser checks: **120 passed**, across two complete runs. No production result is inferred from those local fixtures.
- Release commit `7a86d1c90235b22b3b08f805d1c8568b31379197` successfully deployed through the existing [Cloudflare deployment workflow](https://github.com/ajmain-ahmed/arabicwithm/actions/runs/44909672655). The live recovery endpoint matched the released source byte-for-byte. Both real production hostnames were tested after deployment; all eight root-domain startup contexts completed with working menus and no first-party HTTP failures. This did **not** resolve the user's physical Safari failure.
- Diagnostic commit `00dfa4abb49b9aeb31809ab651da60ed20a11a8e` was pushed through the same workflow. Its independent HTML, protected-data isolation, local trace redaction and public-entry tests passed **23/23**. Diagnostic runtime build, TypeScript and lint passed. Activation/device results are pending.
- A retained production document was opened before deployment, but its 20-minute readiness deadline expired just before the deployment-verification signal. It did **not** execute its old-tab menu/update checks. Do not count this probe as a pass or as evidence of an application failure. Actual installed-iPhone cold/warm/resume and existing-installation upgrade remain **UNVERIFIED**.

Raw evidence is in `docs/validation/iphone-startup/`. The earlier worker-preview data read failed because local Worker secret bindings were absent; this is a local preview setup limitation, not a production failure or a successful production-data parity test.

## Data safety

**DELETE: NO**

**TRUNCATE: NO**

**DROP: NO**

**Books deleted: NO**

**Chapters deleted: NO**

**Shows deleted: NO**

**Episodes deleted: NO**

**Transcripts deleted: NO**

**Phrases deleted: NO**

**Existing production content replaced: NO**

No database migration, historical Phrase backfill, source recreation, user creation or billing mutation was performed.

## Physical-device investigation continuation

The user confirmed that both production hostnames and the independent diagnostic remain blank in normal Safari, Private Browsing and mobile data. Other sites, including Apple, load normally. Safari's temporary "Show IP Address" option is unavailable. iOS version remains unconfirmed. No physical pre-hydration trace has reached us; the exact last successful stage and root cause are therefore **UNVERIFIED**. Private Browsing also failing prevents attributing this incident to an existing cookie alone.

Diagnostic v2 adds a pure text `/startup-check?plain=1` response with no scripts/styles/fonts, plus a standalone HTML report with explicit stage indicators and a Copy diagnostic report button. The server inspects only bounded cookie metadata; no cookie values, tokens or user data are returned. Only known auth-cookie names, count/byte lengths, parsing/expiry flags are exposed, with `authenticationVerified: false`. These flags never authorize access. Saved traces are sanitized on read, old unstructured traces are excluded, and a new navigation timestamp prevents old success being presented as a current result. Returning through Safari's back/forward cache refreshes the saved trace.

Pre-hydration recording now includes document/inline, requested/loaded first-party script assets, React, hydration, auth restoration, auth-lock acquisition/fallback and Featured readiness. Asset events are bounded and startup phase markers are retained. Error reports store categories, safe error names and startup asset paths only. Public GET/HEAD auth bypass and server guards remain unchanged. Featured remains the canonical Homepage experience.

The new read-only edge inspection runs with the existing deployment credentials inside GitHub Actions. It requests Worker observability settings, bounded firewall-event metadata and selected transport/security settings. Public workflow output contains only safe counts/status/settings, with no IPs, headers, cookie values or query strings. It never changes rules, logging, cache or account permissions. Lack of log access or an empty sample cannot prove that the phone reached Cloudflare.

Current physical acceptance: normal Safari **FAIL**; previously signed-in normal Safari **FAIL**; Home Screen cold launch **UNVERIFIED**; Home Screen reopen **UNVERIFIED**. Stale session, expired session, cookie problem, auth lock, redirect loop, stale asset, cached 404, module failure and recovery actually triggering on the phone are all **UNVERIFIED**.

**DELETE: NO. TRUNCATE: NO. DROP: NO. Production migration: NO. Existing production content replaced: NO.**

Diagnostic v2 validation: production vinext build passed; TypeScript and changed-file lint passed; full unit suite **1,597 passed, 6 skipped**. The final trace/back-cache focused checks passed **15/15**. No broad browser audit was repeated. Production activation and physical response remain pending at this report snapshot.

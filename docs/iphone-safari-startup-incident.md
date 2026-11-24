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

Release `8baf233230590d1a876c4e9e729371bcfb60f7b1` deployed successfully via [run 44915838798](https://github.com/ajmain-ahmed/arabicwithm/actions/runs/44915838798). Both production hostnames returned diagnostic v2 plain text, HTTP 200, `private, no-store`, with no redirect. This is server/network verification from this workstation, not iPhone acceptance.

The [read-only edge check](https://github.com/ajmain-ahmed/arabicwithm/actions/runs/44915838828) succeeded using existing CI credentials. Cloudflare reported Worker observability **not configured**. The last-hour firewall sample returned **0 events** (not truncated), so no matching phone request or block was identified. Security level is medium; Browser Integrity Check, HTTP/3 and IPv6 are enabled. These settings alone do not establish a cause; no settings were changed. The next physical check compares the app's pure-text response with Cloudflare's independently managed `/cdn-cgi/trace`; only whether text appears is requested, never the IP-containing response.

Changed runtime files in v2: `app/startup-check/route.ts`, `app/lib/startupDiagnosticScript.ts`, `app/lib/startupCookieMetadata.ts`, `app/lib/startupRecoveryScript.ts`, `app/lib/startupTrace.ts`, `app/AuthContext.tsx`, `app/components/VitalsReporter.tsx`, `app/components/home/FeaturedCarousel.tsx`, `app/lib/supabase/browserAuthLock.ts`. The lock file adds observation only; mutual exclusion is unchanged. Supporting files: focused diagnostic/metadata/recovery tests, `scripts/diagnose-cloudflare-startup.mjs`, `.github/workflows/iphone-log-check.yml` and this report.

Physical update: user reports **neither** diagnostic v2 plain text nor `https://www.arabicwithm.com/cdn-cgi/trace` shows text. `https://www.cloudflare.com/cdn-cgi/trace` also stays blank/stuck on the same phone. The phone is **iPhone 16 / iOS 26.6.2**. The clock is automatic and correct. **Octohide VPN is installed**; a controlled disconnect test is pending. This is a lead, not yet an established cause.

Cloudflare's independently served endpoint failing on its own domain means the Homepage React/auth code cannot explain all observed failures. No successful physical document-start or subsequent application event has been captured. The failing layer is still not identified precisely. Trusted TLS 1.3 / HTTP/2 handshakes succeeded from this workstation for www, apex and www.cloudflare.com, over both IPv4 and IPv6; certificates were in date and verified. This does not test the phone's VPN path. Cloudflare's unresolved status feed did not identify a matching general page-delivery incident (the listed Workers Event Subscription incident concerns change events). The old Vercel fallback hostname returned 404, so it was not offered as a working alternate site.

The user confirmed iOS automatic date/time is on and correct. Octohide's presence is now confirmed; whether its tunnel/filter is causing delivery failure is **UNVERIFIED** until the VPN-disconnected comparison. No DNS, VPN, security rule, HTTP/3 or TLS setting has been changed by this agent. No further application change is justified by the current evidence alone.

Controlled device result: with Octohide disconnected in its app and iPhone Settings confirming VPN **Not Connected**, the pure-text diagnostic **still stayed blank**. Active Octohide tunneling is therefore **not established as the cause**, and disconnecting it did not repair delivery. Comparison with an already-installed second browser and request-local DNS/profile inspection are pending. Safari normal/prior-sign-in acceptance remains FAIL; Home Screen acceptance remains UNVERIFIED. There is no justification yet to mark session/cache/module causes YES or NO on the physical device.

New physical discriminator: `https://www.cloudflare.com/cdn-cgi/trace` **loads in another installed browser on the same iPhone**. Safari still fails. This narrows the problem to Safari's browser-specific path/settings/state rather than a blanket failure of that phone to reach Cloudflare. The particular setting or connection behavior is still unknown. ArabicWithM Homepage/menu acceptance in that browser and Safari Private Relay state are being checked next. DNS/profile information has not yet been supplied.

Physical iPhone acceptance update: the user confirms the **Featured Homepage and menu both work in the other installed browser**. This is a real-device pass for that browser only, not Safari. The user also confirms **Private Relay is off**. Therefore active Private Relay is not the explanation for this observed run. Safari normal/prior-sign-in remain FAIL; Home Screen remains UNVERIFIED. A per-website Safari extension comparison is next, preserving cookies and existing installation.

## Mobile Chrome Google sign-in follow-up

The user additionally reports that tapping Continue with Google in mobile Chrome does nothing or keeps spinning, before Google opens. Production public Auth settings returned HTTP 200 with Google enabled. This establishes an initiation symptom; it does not establish a Google account/callback rejection. No account was signed in by this agent.

The old button set a persistent loading flag and awaited browser-side `signInWithOAuth` with no deadline. Inspection of the installed SDK shows it prepares a PKCE challenge/cookie before assigning the provider URL; this initiation does not await a remote account check. Consequently a browser-side stall or pending navigation could leave an indefinite spinner. The particular physical phone operation has not been traced.

The replacement button is a native same-tab anchor to `/auth/google`. The new independent GET handler prepares PKCE server-side with the existing Supabase SSR client, sends the verifier cookie on a no-store 303 redirect, and keeps the same code-verifying callback. It has an eight-second overall deadline with standalone readable failure HTML. HEAD probes do not generate/overwrite verifier cookies. No service-role key is involved. Existing destination allow-list behavior is shared by `app/lib/authReturnPath.ts` and still rejects external/admin destinations. OAuth start/callback/confirmation GET/HEAD now skip redundant proxy session restoration; the callback remains responsible for actually verifying the code/token. Callback network fetches are bounded and redirect responses are no-store/no-referrer. Server Admin/action authorization is unchanged.

Additional changed files: `app/auth/google/route.ts`, its real-SDK integration tests, `app/lib/authReturnPath.ts`, `app/components/AuthDialog.tsx`, `app/auth/callback/route.ts`, `proxy.ts`, `proxy.test.ts`. The focused flow checks passed **30/30**, followed by **7/7** native-route cases including a stalled-preparation deadline. A real verifier-cookie/S256 challenge match is checked without making a remote Auth request. Production and phone sign-in acceptance are pending. This is a repair of a demonstrated unbounded initiation path, not yet a proven explanation or successful end-to-end sign-in on the affected phone.

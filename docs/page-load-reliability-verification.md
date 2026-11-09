# Page loading and AWM recovery

## Reliability diagnosis

Investigated Home, Explore, Watch, Books, Search (the former `/explore/search` redirects here), public and Admin-origin individual transcripts, Admin landing, Admin Transcripts and Admin Books/Shows, plus shared authentication, permissions, fetches and cache infrastructure.

Four concrete problems were found:

1. **Build-time font failures.** A clean local production build reproduced 28 Turbopack errors resolving Google font URL queries, including `next/font/google queries have exactly one entry` and missing internal font modules. Prior font work had already localized two families and noted intermittent URL-parser trouble. Remaining Google font lookups could still fail compilation for any route sharing the root layout.
2. **Auth outage mistaken for absence of a session.** Server `getAuthenticatedUser` returned null for transport failures as well as genuine missing sessions. Admin layout then redirected to Home. Injected HTTP 503 responses reproduced the ambiguity. The Featured proxy also redirected on verification-service failures. Its protected layout still independently verifies identity and role.
3. **Firefox background lock errors.** Repeated real browser navigation recorded thirteen `Acquiring an exclusive Navigator LockManager lock "lock:sb-localhost-auth-token" immediately failed` page errors in a run. The installed SDK throws an expected zero-wait background-probe timeout inside the Web Locks callback; Firefox reports that callback rejection even when SDK refresh code catches it.
4. **Missing production search RPC.** Read-only production `pg_proc` inspection proved `website_search_content_v1` absent. The existing search action called it, and no repository migration defined it. Admin `account_role`, list and draft RPCs were present. A missing function is not a transient outage and is not retried blindly.

Loading audit also found client session restoration, permission snapshots, Admin cache reads and transcript/search reads with no client deadline if a response never settled. Admin transcript reads forced cache invalidation unnecessarily. Default transcript viewing performed a redundant timestamp query at zero. Books treated optional audiobook metadata as an essential dependency.

Technical diagnostics remain in console/server logs. Fault runs show the actual HTTP 503 / `PGRST001` context and Auth `AuthRetryableFetchError` status 503; normal users see friendly recovery copy. No production request log access was available, so the report does not claim to identify every historical production incident.

## Fixes

- All remaining UI fonts are self-hosted WOFF2 using the same families and CSS variables. Google Fonts repository sources and OFL licenses are bundled. Production builds no longer need Google CSS/font-URL resolution. Existing preload choices are retained.
- Genuine absent/invalid sessions still deny access. Auth transport failures now throw a recoverable loading error instead of pretending the user signed out. Role failures retain server diagnostics and a neutral user message. Request-scoped role caching and the original role model remain.
- Featured proxy outages defer to the independently protected Admin layout/error boundary; the proxy still denies verified non-Admins and anonymous access. No permission is granted from client state.
- The browser auth lock adapter keeps actual Web Locks exclusion and the SDK timeout type. A zero-wait callback resolves with a result; expected contention is rejected outside the callback. Positive-timeout SDK behavior remains intact, with SDK process locking as the fallback when Web Locks is unavailable. No global error suppression or lock bypass was added.
- Server GET requests recover from one transient network/HTTP failure within their existing deadline. Explicit read-only role, Admin-list and search RPCs may retry once for transient connection failures. Schema and permission errors are not retried; writes are never automatically replayed.
- Auth initialization has a 20-second watchdog and can recover after a later genuine auth event. Client read wrappers settle within 30 seconds and clear their timers. Permission snapshots, Admin list cache, transcript paging/search and relevant Admin edit/draft reads use bounded handling.
- Ordinary transcript-list reads share the existing short-lived cache. Explicit post-mutation forced refresh still supersedes stale reads; late results cannot overwrite newer snapshots. Tests caught and prevented a regression in that behavior during implementation.
- Admin transcript list and draft requests run concurrently. Default zero-time transcript loads skip the unnecessary anchor lookup. Missing transcripts remain Not Found; essential data failures remain errors. Optional audiobook availability failures log diagnostics while reading stays available.

## Branded failure state

`app/components/AwmPageError.tsx` and its CSS module provide one reusable recovery card. Root, Admin, Explore, Cartoons, Memory and chapter boundaries use it; `global-error.tsx` covers root-layout failures without depending on the broken layout's providers. The existing client ErrorBoundary and affected inline loading failures reuse it.

Copy:

> This page took a little detour
>
> We couldn’t load this page properly. Give it another go and we’ll try again.

The primary **Reload** performs `window.location.reload()`. **Go Home** uses native navigation to `/`, so recovery does not depend on a healthy client router. Offline copy adapts to the browser's online/offline events. Stack traces, internal IDs and raw database messages are absent from the UI.

The supplied illustration is copied unchanged to `public/images/awm-error-goku.png`. SHA-256 matches the supplied file: `8EC7AB234D8A5D6260ADB7DFE8698F006D22E433DD8DB14CC6C373ED50933873`. No generated or stock replacement was used. It is decorative (`alt=""`). The card uses AWM color variables, a restrained green gradient, gold raised pill button, rounded border, semantic heading and visible keyboard focus states. It is single-column on mobile and limited to 860px on desktop.

## Verification

- Full Vitest: **186 files passed, 2 skipped; 1,312 tests passed, 4 skipped**.
- Final production-build browser run: **14 scenarios passed** across Chrome and Firefox.
- Per browser, repeated-navigation coverage includes **30 direct route loads** plus **7 reload/client-navigation/history/new-tab operations**. Final repeated runs had zero unexpected page errors or branded failure screens. The test records per-route HTTP status and elapsed duration in its navigation-summary attachment.
- Public and authorized Admin routes were exercised through direct entry, reload, navigation links, Back/Forward, renewed fixture session cookies and a fresh tab.
- Transient Admin read recovers once; persistent failure renders the card; Reload issues a real document request and recovers after the fault clears. Auth outage stays on the Admin route with recovery UI; truly signed-out access redirects. Public transcript backend failure remains an error, recovery loads the published transcript, missing IDs use Not Found, and no-match search remains an empty state.
- Unit cases verify a never-settling Admin read exits loading, late results are ignored, a hung session initializes into recovery and a later auth event restores it, GET network retry occurs once, POST writes are not replayed, and optional audiobook failure does not remove the book catalogue.
- Error screenshots inspected at **320/390/430/768/1024/1440px**, in **both themes and both browsers**: illustration loads, no horizontal overflow, clear Reload/Go Home actions.
- An initial public-transcript fixture lacked publication and correctly produced Not Found; it was replaced with an explicitly published fixture. Cached Firefox 304 responses also exposed a Playwright navigation-wait issue despite a fully rendered page. The stress test now checks document readiness and actual visible content, while still rejecting browser errors, missing pages and failure UI.
- Browser tests run the actual local production app against an isolated HTTP backend with fault controls; they do not use Playwright request replacement for the backend scenarios. They do not constitute a full production-account/session soak test. Production schema and actual PostgREST were separately verified read-only.
- TypeScript, targeted ESLint and `git diff --check` passed.

Screenshots and summary: `docs/validation/reliability/`.

## Engineering and production migration

The user separately approved the missing-RPC repair. It was applied to `whbxgwucsoguqzpnpzjd` as **`20261109144507_website_search_content_repair.sql`**; the local filename was aligned with the actual applied migration version. This is the same reviewed SQL originally prepared under the earlier creation timestamp.

The function is read-only, `SECURITY INVOKER`, has an empty search path and only service-role execution. It returns bounded, keyset-paged catalogue results and restricts chapter content to server-verified signed-in searches of released books. It changes no content records, tables or RLS policies. Four PGlite tests cover links, paging, empty/invalid input, Arabic matching, release/sign-in gates and privileges.

Production verification: read-only SELECT plan approximately **1,124ms**; actual PostgREST RPC **HTTP 200, 21 results, 2,534ms**. A public-metadata query also returned 21 results. Production privilege checks: anon false, authenticated false, service_role true. Security advisors were checked before and after; the repair introduces no new search-function finding.

Changed files, grouped:

- Recovery: `AwmPageError.tsx`, its CSS/test, `ErrorBoundary.tsx`, `SiteShell.tsx`/test, root `error.tsx`, `global-error.tsx`, and existing Admin/Explore/Cartoons/Memory/chapter error boundaries.
- Auth/read infrastructure: `AuthContext.tsx`/test, `AccountAccessContext.tsx`, `actions/auth.ts`/test, `readRecovery.ts`/test, `boundedFetch.ts`/test, `adminListCache.ts`/test, `supabase/client.ts`, `browserAuthLock.ts`/test, `proxy.ts`/test.
- Pages/data: Admin Books/Shows/Transcripts, transcript actions/tests, public Books page/test, content-search action/client, transcript viewer/test.
- Assets: `app/lib/fonts.ts`, five self-hosted font-family directories with OFL/source notes, and `public/images/awm-error-goku.png`.
- Verification: `e2e/fixture-server.mjs`, `e2e/reliability.pw.ts`, adjusted Admin English-group browser checks, `playwright.reliability.config.ts`, the search migration/test, reports and screenshots.

The underlying intermittent page-loading problem was investigated rather than merely hidden behind a new error screen. Audited page-loading reads no longer remain indefinitely blank or stuck loading after a failed or stalled request. Genuine failures use the AWM-branded Reload container, and the user-provided illustration is used. Valid empty states and Not Found remain distinct.

The approved search migration is live. Application code and visual changes are verified locally and were not deployed by this session. No Admin content, transcript schema, AWM Kids or subscription behavior was changed by the reliability work.

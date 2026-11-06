# Explore, Spotlight, guest preview and mobile toolbar verification

## Scope and state

Worktree: `Desktop/arabicwithm`, branch `main`. These changes remain local; nothing is pushed or deployed. No Kids files, language migration, database schema, Supabase permissions, credentials, payment configuration or environment files are changed.

The mobile toolbar request is mobile only (below the existing 900px breakpoint). Desktop Explore/For You toolbar structure, AR/EN controls and sound behavior are preserved. The earlier separately requested Homepage Spotlight redesign and Explore default/guest access changes also remain included.

## Video investigation: established facts and remaining issue

- Confirmed routing regression: the previous `app/explore/page.tsx` selected For You for a bare `/explore` URL. This sent ordinary Explore visitors into the other feed and its former authentication gate. Bare `/explore` now selects ordinary Explore; only explicit `view=foryou` (or the existing `tab=foryou` alias) selects For You. Native history back/forward restores the view.
- The reported persistent Firefox media-loading failure was **not reproduced** in fresh isolated Firefox profiles. No exact root cause for that saved-profile failure, or a distinct Spotlight media failure, has been established. Ordinary Explore already played when explicitly selected before this change. Do not describe a speculative CSP, YouTube domain, auth lock or API rewrite as the fix.
- Actual app + real YouTube tests were run, separately from fixture tests, in Chromium, Playwright Firefox 155 and the installed Windows Firefox 159.0.1 through official geckodriver with temporary headless profiles. No existing user profile was controlled.
- Final Firefox 159.0.1 narrow-window check: Home `OBwCEKyc3lI` advanced 474.242317 -> 475.291601; Explore `LJ-62A-IVqI` advanced 0.121016 -> 1.129393; For You `WihbCAXMVhI` advanced 570.200848 -> 571.251591. All had HTML media readyState 4, paused=false and error=null. Captured YouTube iframe/API/media responses returned HTTP 200. Firefox clamped that window to 500 CSS pixels; exact 320/390/430/768 layouts are covered separately by Playwright viewport tests.
- Two Supabase Navigator LockManager errors were observed in that successful Firefox run. They are recorded as an unresolved diagnostic, not treated as the demonstrated cause of failed playback. No authentication locking changes were made.
- Earlier real Firefox runs exercised native pause/resume, seek and unmute. Pause held the guest counter unchanged; ordinary Explore did not consume guest time. Real exhausted guest refreshes on both Home and For You showed the prompt and zero player iframes.
- The user's saved-profile console/network evidence remains needed to diagnose its specific failure. Real Firefox playback success does not establish that every extension/privacy/profile configuration is fixed.

## Earlier Homepage and guest preview request

- Homepage order remains Latest Episodes -> For You Spotlight -> Shows -> Books.
- Spotlight has a heading-adjacent Go to For You link; centered 60% desktop player, 82% desktop subtitle box, full available mobile width and a 16:9 player. Removed side gateway/copy and external play/mute controls. Native YouTube controls remain. Clip-boundary native Play replays the Spotlight clip. Player errors show their YouTube code and Retry.
- Guests share one 300,000ms budget between Home Spotlight and full For You. `guestForYou.ts` persists each valid elapsed sample at `awm-for-you-guest-playback-v1`; navigation, refresh, source changes and AR/EN changes do not reset it.
- Counting reuses `elapsedViewingMs`: both samples must be playing, currentTime must advance, wall-time interval must be >0 and <=1,000ms, and media progress must fit the playback rate plus existing seek tolerance. Pauses, stalls, loading, large seeks, hidden documents and normal Explore do not charge. Replays count as viewing. Small seeks within the existing tolerance cannot be perfectly distinguished from playback.
- At exhaustion, the current player is stopped/unmounted and further full-feed loading/advancement is blocked, including checks after in-flight awaits. Existing AuthDialog sign-up/sign-in opens when the full-feed limit is crossed. Home retains its section and a friendly Want more For You? prompt. Refreshing an exhausted feed shows the prompt without mounting/fetching a clip.
- Authenticated Home teaser remains unmetered. Signed-in full For You keeps existing free-account/Plus allowance logic. Both registration confirmation paths are tested. Public guest actions retain publication/provenance guards and are rate limited; admin group taxonomy stays authenticated.
- This is an anonymous browser preview allowance, not a tamper-proof server entitlement. Clearing browser storage or changing browsers can start a new anonymous allowance. If localStorage is blocked entirely, the in-memory fallback lasts only that page lifetime. Concurrent-tab storage updates are monotonic but not transactional billing.

## Mobile toolbar and audio request

- Before: separate Explore/For You segments and a redundant custom mute control. After: one pill displays the current view and toggles it; a compact AR/EN pill stays beside it. Native player mute/volume remains available. The separate custom Explore sound control is also hidden only on mobile.
- AR/EN uses the existing For You Zustand store and existing English group/subtree UUID `5b98c563-5c35-4696-98e1-06aa000eb622`. Default AR; selection survives in-app view switches. On ordinary Explore, changing AR/EN only remembers the preference; it does not filter/recreate the ordinary player or catalogue.
- Active-feed language changes clear the existing For You clip/transcript cache and load only the selected pool. Empty EN does not fall back to AR. Guest and signed-account usage balances remain independent of language/view selection.
- Mobile native sound-state observation distinguishes temporary muted autoplay fallback from an explicit native mute or volume-zero change. Native explicit mute persists in the existing sound-preference store, including subsequent clips. A synchronous state check before a gesture handles changes between polling samples.
- Only trusted pointer/touch/wheel/key input may recover a temporarily muted player while sound is intended ON; form/buttons/links are excluded. Transcript auto-follow, `scrollTo`, untrusted dispatched events, renders and routing do not qualify. Gestures are coalesced to avoid duplicate attempts.
- A browser may deny sound on wheel/touch even though the input is trusted. Rejection returns to muted playback once per attempt, keeps sound intention ON, opens no disruptive dialog, and allows the next qualifying gesture to retry. This retry correction is opt-in to the mobile native sound observer; desktop sound behavior is retained.
- Explicit user mute is respected by scroll-to-unmute. The toolbar change does not reset the guest allowance or signed-in account budget.
- At 320px the secondary navigation controls wrap to a second row; the view/language pair remains together. At 390/430/768px the controls fit without horizontal overflow. Safe-area transcript padding and native player controls remain intact. Screenshots were inspected at 320 and 390px.

## Validation

Browser regression fixtures use isolated loopback synthetic Supabase data and a deterministic YouTube contract player; real YouTube verification above is separate. Failure-path fixtures intentionally emit request-error/invalid-clip diagnostics.


- `npx tsc --noEmit`: passed on final code.
- `npx vitest run`: 169 test files passed, 2 skipped; 1,146 tests passed, 3 skipped (78.63s).
- `npm run lint`: 0 errors; 4 pre-existing warnings (ChapterReader hook dependency, AwmPromoSection unused suppression, and two unused variables in scripts/test-lifecycle.mjs).
- `git diff --check`: passed.
- Firefox production-mode browser regression: **25 passed (2.1m)**. Command: `npx playwright test e2e/mobile-feed-toolbar.pw.ts e2e/home-spotlight.pw.ts e2e/standalone-transcript-groups.pw.ts --browser=firefox` using the isolated Playwright Firefox executable. All four requested exact mobile viewport widths passed, as did desktop preservation and five transcript/group regression tests.
- Chrome production-mode browser regression: **31 passed (2.4m)**. Command: `npx playwright test e2e/mobile-feed-toolbar.pw.ts e2e/for-you-gesture-audio.pw.ts e2e/for-you-allowance.pw.ts e2e/for-you-data.pw.ts e2e/for-you-discovery.pw.ts e2e/home-spotlight.pw.ts e2e/auth-session.pw.ts`. (An extra nonmatching transcript-groups path in the invocation did not select tests; the actual `standalone-transcript-groups` suite is included in the separate Firefox run.)
- Both browser runs use `AWM_TEST_PRODUCTION=1`, frontend 3040/backend 4340, synthetic loopback credentials and `.next-browser`. Each runner successfully executes a fresh Next production build before serving tests. The ordinary local development server and `.env.local` remain unchanged.
- Initial Chrome run: 26 passed/3 failed. Two failures were stale selectors for deliberately removed mobile controls; one exposed the second-rejection fallback defect. Selectors were updated, the defect was fixed, and the final complete selected Chrome run passed.
- Responsive checks: 320, 390, 430, 768px mobile; 1024/1440px desktop Spotlight, plus 1440px toolbar preservation. Mobile tests assert same-row view/language controls, native volume availability, no horizontal overflow, view/history correctness, independent Explore catalogue/player, AR/EN source pool replacement, retained language selection and retained 123,000ms guest usage.
- Audio gesture test: browser-forced muted autoplay; no recovery from programmatic or untrusted scroll; denied trusted-wheel attempt stays muted and playing; subsequent trusted touch recovers; native explicit mute remains muted through wheel, programmatic scroll and a source change. Guest/account allowance and 20-source discovery auto-advancement regressions also pass.
- Browser diagnostic logs, real-media JSON, traces and screenshots are local artifacts excluded from the commit. No real account was created or modified. The temporary geckodriver was stopped after real Firefox checks; the user's existing browser/development server was left running.

## Files changed

- `app/actions/forYou.test.ts`
- `app/actions/forYou.ts`
- `app/components/AuthDialog.tsx`
- `app/components/home/HomeForYouSpotlight.tsx`
- `app/explore/ExploreFeed.tsx`
- `app/explore/ExploreViews.tsx`
- `app/explore/ForYouFeed.tsx`
- `app/explore/GuestForYouAllowance.tsx`
- `app/explore/MobileForYouPanel.tsx`
- `app/explore/page.tsx`
- `app/lib/guestForYou.test.ts`
- `app/lib/guestForYou.ts`
- `app/lib/playerSoundIntent.test.ts`
- `app/lib/playerSoundIntent.ts`
- `app/lib/useYouTubePlayer.test.tsx`
- `app/lib/useYouTubePlayer.ts`
- `docs/for-you-preview-verification.md`
- `e2e/for-you-allowance.pw.ts`
- `e2e/for-you-data.pw.ts`
- `e2e/for-you-discovery.pw.ts`
- `e2e/for-you-gesture-audio.pw.ts`
- `e2e/home-spotlight.pw.ts`
- `e2e/mobile-feed-toolbar.pw.ts`

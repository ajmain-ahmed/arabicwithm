# Homepage For You integration into current main

## Repository and migration strategy

The requested destination folder was not a Git repository. The user confirmed the actual current main worktree: `C:/Users/Muttaqi Ahmed/Desktop/arabicwithm`.

- Previous main and origin/main: `7bf41409b9212db6957ec8d993a6ed9cd1f6c73a`.
- Feature branch HEAD/base: `63186703e2df01ae0a2c4139badb8335b5be8120`. The feature implementation was uncommitted.
- Current main already had newer commits `d7118ee` and `7bf4140`: favicon installation, subscription/billing hardening, checkout-return notice, AWM+ promo and larger lower-page spacing.
- Prepared a three-way integration of only the selected feature file deltas against their common base. Compared and reviewed overlapping current HomeDashboard, AuthDialog and database types. No textual conflicts occurred. Main's newer promo, checkout notice, confirmation-alert treatment, billing fields and RPC types remain. HOME_ROW_LIMIT remains 12. Current dependencies, configuration, favicon assets/metadata, production fixes and Admin implementation remain unchanged.
- Feature and Kids worktrees were not modified. No whole older feature file replaced a divergent current main file.

## Verified behavior on actual main

Actual catalogue order for guests and members: **Latest Episodes -> For You Spotlight -> Shows -> Books**, then existing remaining content. Featured hero/greeting/My List remain before the catalogue.

Public Spotlight displays one random AR eligible clip with autoplay attempt, muted fallback, native play/pause/timeline, timed subtitle and optional English line, boundary/replay and existing picture gateway/CTA. It does not call allowance/progress services. Both intentional links lead to `/explore?view=foryou`; controls do not navigate. Full For You remains gated by the existing sign-in/register flow and retains allowance/AWM+ rules. No second full-feed clip is exposed to guests.

`/explore` defaults to For You. Explicit `view=explore`, legacy `tab=explore`, browser history, signup return path and callback allow-list are retained. Desktop defaults AR; switching to EN clears the feed cache without resetting allowance. Empty EN never falls back to AR.

English group/subtree UUID: **5b98c563-5c35-4696-98e1-06aa000eb622**, verified during the feature work with a read-only setup query. Its stable identity is bound in `app/lib/forYouGroups.ts`; renaming does not change classification. Membership is the authoritative English classification. The existing publication/quality-aware RPC selects eligible sources, EN intersects English with selected groups, and AR/Home reject English members before token fallback, excluding their existing candidate IDs and refilling. Subsequent requests reflect membership moves. No source-language column, migration, new RPC, Admin selector or duplicate classification is included. No new database migration is required. Already loaded clips update on refresh; the existing 10,000 excluded-segment limit and an eight-second refill-loop budget fail closed rather than mixing pools.

## Validation

All runtime tests built and ran the **actual main worktree**, on loopback frontend 3025/backend 4335 with synthetic credentials, accounts, content and the existing YouTube test double. Existing production environment files were untouched. No hosted database writes, real signups, payment requests or deployments were made. A pre-existing server was not stopped. Browser builds used the existing isolated `.next-browser` output.

- Full Vitest: **1,132 passed, 3 skipped; 167 passing files, 2 skipped files** (78.02s). Includes existing Explore, For You, Auth, Transcript, billing and other regressions.
- Final focused suite including two newly added main Homepage order tests: **48 passed in five files** (4.59s). The first focused attempt exposed a test assumption about server-rendering an asynchronously loaded promo; the test was corrected to assert its intended catalogue-order contract. Promo implementation remains untouched.
- Initial production build/browser: **27 passed, 2 failed** (3.0m), across Spotlight, For You allowance/playback/diversity/gesture/token fallback, transcript groups and favicons. All five transcript-group browser cases passed.
- Final production rebuild/browser: **13 passed** (1.1m): all 10 Spotlight cases, two existing normal-registration cases and the exhausted-budget AWM+ case. The AWM+ case had stayed on Explore after a click in the first run; it passed unchanged on the final run, so no product behavior was altered to address that transient failure.
- All five widths **320, 390, 768, 1024, 1440** passed visibility, ordering, player/control/gateway/subtitle behavior and horizontal-overflow checks. Full-page captures were added. Visually inspected the actual main signed-out desktop (1440) and signed-in mobile (390) full-page screenshots, plus the desktop Spotlight capture. Desktop player/CTA use 3:2 columns; mobile/tablet stack player, subtitle and CTA. Images/players in these captures are synthetic fixtures, not a claim of live YouTube playback.
- The remaining favicon test failure is pre-existing Windows newline sensitivity: `site.webmanifest` working bytes SHA256 `2396d0277065a390432d9e3663d4bd666ffac0547f406ed41d113d80ee84c0fc`; LF-normalized bytes and HEAD both match expected `7d22a27f3796410a61116973c042de528ee0c74a6fde7303659146d7d9b61a1a`. Manifest identity/icon-purpose checks and all four other favicon/browser/crawler cases passed. Individual icon bytes matched. No favicon files or tests were modified.
- TypeScript passed. ESLint: **0 errors, 4 pre-existing warnings** in untouched ChapterReader, AwmPromoSection and test-lifecycle. Diff whitespace check passed.
- The older mobile-home-explore suite's stale layout/menu/hint assumptions are recorded in the prior feature audit. Its unrelated test edits and historical artifacts were deliberately excluded; its UI was not redesigned. Actual main Explore default/explicit links/history and authentication are verified by the passing current tests above.

QA logs, raw before/after source review, screenshots and traces remain local under `C:/Users/Muttaqi Ahmed/Desktop/arabic-with-m-app-main/artifacts/spotlight-main-integration-review` and ignored/untracked runtime output in actual main. They are not part of this commit.

## Commit scope

- `app/actions/forYou.test.ts`
- `app/actions/forYou.ts`
- `app/auth/callback/route.test.ts`
- `app/auth/callback/route.ts`
- `app/components/AuthDialog.tsx`
- `app/components/home/HomeDashboard.tsx`
- `app/components/navbar/index.tsx`
- `app/explore/ExploreViews.tsx`
- `app/explore/ForYouFeed.tsx`
- `app/explore/page.tsx`
- `app/lib/forYouLiveFeed.test.ts`
- `app/lib/supabase/database.types.ts`
- `e2e/fixture-server.mjs`
- `e2e/for-you-allowance.pw.ts`
- `e2e/for-you-data.pw.ts`
- `e2e/for-you-discovery.pw.ts`
- `e2e/for-you-gesture-audio.pw.ts`
- `store/forYouStore.ts`
- `app/components/home/HomeForYouSpotlight.tsx`
- `app/lib/forYouGroups.ts`
- `app/lib/forYouGroups.test.ts`
- `e2e/home-spotlight.pw.ts`
- `app/components/home/HomeDashboard.test.tsx`
- `docs/home-for-you-integration.md`

Excluded: all historical feature artifacts/docs, temporary logs/screenshots/traces/build outputs, `.env*`, credentials, local database files, dependencies/configuration, favicon files, existing migrations, unrelated stale-test edits and all AWM Kids implementation. The feature worktree remains uncommitted and intact.

## Push and deployment safety

GitHub reports a successful **Vercel** deployment status for current main `7bf4140`, linking to `https://vercel.com/ajmains-projects-e2c5cec3/arabicwithm/5nGkHj215JLZAAtshrvaQRikRkGg`. There is no repository setting proving a main push is safe from production deployment, and the available metadata did not disclose the Vercel production-branch setting. Treat this connected main push as production-impacting and **stop before pushing**. Do not assume that the absence of GitHub Actions means deployment is disabled.

The focused local commit is authorized by the integration brief. Its final SHA is reported in the completion message. **Push is held pending explicit approval for the production-deployment consequence.** No separate deploy command will be run.

**AWM Kids changes were not included. No source-language migration was included. No secrets or environment files were committed. Production Supabase was not modified. The live website was not deployed or changed by this task.**

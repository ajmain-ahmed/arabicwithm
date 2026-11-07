# Homepage Featured carousel, AWM+ placement and Spotlight refinement

## Featured data model and eligibility

The existing public Show catalogue, `covers/featured` artwork folder and `featured_show_config` canonical path/focal-position records remain the source. There is no new database, activation column, migration, permission change or scheduled job. Every candidate must still match a unique canonical Show slug and an eligible current artwork path. Alternate formats, orphaned uploads and conflicting Show associations are excluded. The existing catalogue does not expose a separate Show publication toggle here; its existing public eligibility is preserved rather than inventing a new one.

The eligible pool can contain more than three Shows; only **up to three unique Shows** are active in the Homepage carousel at once. Both the server selector and carousel enforce that limit. This follows the brief's explicit case of choosing three when more than three eligible records exist. Existing DBZ fallback behavior is retained if there are no eligible pairs or Storage cannot be read.

## Two-day rotation

`selectFeaturedShows` derives a London calendar date using the existing `platformDate`, converts it to an epoch day, and uses `floor(day / 2)` as a stable window seed. It sorts canonical Show identities before calling the existing deterministic seeded shuffle and selecting three. Different visitors, input ordering and repeated renders in one window therefore get the same selection/order. The next two-day window can change the selection/order. London DST changes do not shorten or extend the number of calendar days in a window.

The seed does not use a user ID or browser random number. Artwork replacement preserves its canonical Show association and updated versioned URL/focal point. Existing public-cache lifetime and Admin tag/path invalidation are retained; the rotation is computed when the page renders, with no Cron.

## Carousel and Admin

`FeaturedCarousel` reuses `FeaturedHero` for each slide. Desktop aspect ratio, mobile height, cover treatment, saved object position, artwork bytes and destinations are preserved. One slide occupies the viewport. Others are inert and hidden from accessibility navigation. The first artwork keeps high priority; subsequent artwork is lazy/low priority.

Mouse/pointer dragging and touch swiping move the slides; vertical touch page scrolling remains available. Pagination is centred on the same artwork-overlay row as Play/Episodes. Phones show Play, dots, then Episodes; desktop keeps the Show buttons on the left and the dots centred, with small previous/next arrows. Keyboard arrows navigate. Reduced-motion preference uses immediate scrolling. There is no timer/autoplay. Drag-generated clicks are suppressed while intentional taps, clicks and keyboard link activation retain their Show destinations. Resizing the viewport preserves the selected slide.

The existing Featured manager retains its upload, crop/position, replacement and deletion flows. Updated copy explains the three-slide/two-day model. Records show whether they are in the current rotation, eligible for a later rotation, or ineligible. For old uploads without a saved canonical path, duplicate formats now use the same deterministic canonical choice as the public pool, so Admin eligibility agrees with the Homepage.

## Shared AWM+ component and entitlement source

One `AwmPromoSection` supports `home` and `profile` placement. It freshly verifies the existing server `fetchPremiumStatus` through `refreshPremiumStatus`; its identity-bound snapshot is refreshed on focus, account-access changes, visibility and a visible-page interval. Out-of-order responses cannot overwrite a newer request. It does not use editable profile text or historical subscription existence as membership truth.

The existing server status resolves `account_has_premium` through `accountHasPremium`, with the verified administrative entitlement already honored by the old component. Subscription semantics, pricing, Stripe products and payment actions are unchanged. Cancel-at-period-end access remains active if the canonical entitlement is still active; expired/cancelled records without entitlement get the existing upgrade/rejoin experience.

- Guests: the AWM+ upgrade card remains on Home. The app reminder has now moved off the Homepage entirely; it appears below account content on signed-in users' own Profile pages, for both free and Plus users. The existing signed-in reminder preference UI uses the account email and existing server actions. Other people's public profiles never show it.
- Signed-in free/no active entitlement: the upgrade card remains on Home; the bottom active-membership card is absent from Profile.
- Active entitlement: no upgrade card or empty promo-spacing wrapper remains on Home. The same card renders after the existing content on the user's **own** Profile, gated by the existing server-derived `profile.own` flag. Other people's public profiles do not get the viewer's card.
- Member copy says **AWM+** and **Your AWM+ membership is active.** Management delegates to the existing `managePremium()` portal action, shown only when an existing billing account is manageable. Administrative/manual access does not invent a Stripe customer or management flow.

The existing profile billing/settings/support tabs remain in place. The reused card is at the bottom of the Profile content, with the existing mobile bottom-tab clearance. Existing checkout action wiring is retained; no real billing transaction was initiated during testing.

## Responsive and actual-artwork verification

Guest, free and active-member scenarios passed at **320, 390, 768, 1024 and 1440px** in Chrome and Firefox. There was no horizontal page overflow. One hero occupies the carousel viewport; saved focal positions remain attached to the correct Show; overlay controls stay within the artwork and clear the Featured badge and playback links; member cards remain readable on narrow screens. Desktop artwork and the 320px profile-member card were visually inspected.

A separate fresh Chrome profile verified the current local app with real public Featured artwork: `bb` (2880 x 1800, focal 53.2647% / 19.8854%), `inv` (3840 x 2160, 8.98618% / 3%), and `arc` (3840 x 2160, 50% / 52%). All three original uploaded images decoded, retained their own canonical Show links and remained in the same order after refresh. No page overflow occurred. This was read-only public artwork verification, not a production deployment or data modification.

## Previous Spotlight refinement completed

The heading is truly centered with a compact, teal **Watch More** native button beside it (underneath on narrow phones), still targeting `/explore?view=foryou`. Desktop default player width is 50%, bounded 38-75%. Tablet widths use a proportional 65-85% range. Phones below 600px use full available width and hide the grip. The side grip supports pointer/touch drag and keyboard controls: up enlarges, down shrinks, Home/End select bounds. The preference persists at `awm-spotlight-player-size-v1`.

The player remains 16:9 at every size. Subtitles stay centered in a slightly wider bounded box; Arabic is above the smaller English translation, both centered. Resize never recreates the iframe, rerolls a clip or resets player/subtitle timing. A real YouTube run grew the iframe from 671px to 831px while the same source kept playing from 732.15s to 733.37s without a media error. Native controls remain the only playback controls.

Firefox revealed that cancelling the grip's pointer-down default could leave focus inside the previously used video iframe. Removing that cancellation restores native focus; CSS still prevents selection and touch scrolling during grip dragging. The regression now passes in both browsers. No Explore routing, For You filtering/allowance, authentication or Kids logic was changed by the Spotlight refinement.

## Exact validation results

- `npx vitest run`: **1,164 passed / 3 skipped**, 170 passing files / 2 skipped, 81.40s. The initial two failures were old Homepage mocks returning a single/null Featured result; those mocks now follow the intentionally changed array contract. Final suite passes.
- `npx tsc --noEmit`: passed.
- `npm run lint`: 0 errors; four existing warnings (ChapterReader hook dependency, AwmPromoSection unused suppression and two unused script variables).
- `git diff --check`: passed.
- Chrome production browser run: **47 passed (2.8m)** across `featured-carousel-membership.pw.ts`, `admin-featured.pw.ts`, `home-spotlight.pw.ts`, `spotlight-layout.pw.ts`. This includes all five requested viewport/state combinations, real touch dispatch, stable rotation across refresh/users, swipe-versus-link behavior, Admin crop/upload/replace/delete, guest allowance/auth regressions and Spotlight resize continuity/persistence. An earlier run had one ambiguous public-profile text selector; it was corrected without changing the UI.
- Firefox production browser run: **25 passed / 2 skipped (1.8m)** across `featured-carousel-membership.pw.ts` and `spotlight-layout.pw.ts`. The two skipped cases use Chromium-only CDP to dispatch genuine touch input; both passed in Chrome. Firefox pointer, keyboard, resize, persistence, all responsive/state placements and public-profile exclusion passed.
- Rotation unit cases cover 0/1/2/3/4/7 candidates, stable input-order-independent selection, different requests within the same window, next-window change, London DST, removal, replacement artwork/focal position and duplicate canonical formats.
- Membership unit cases cover guest authentication, free checkout delegation, active Home/Profile placement, existing management-action delegation, scheduled cancellation, expired entitlement, administrative access and identity-bound verification. Existing server billing/entitlement tests also pass in the full suite. Real Stripe payments/portal sessions were not created by these tests.

Browser tests used synthetic loopback Supabase data on ports 3040/4340 and a fresh **production build with the supported `next build --webpack` CLI option**. The temporary fixture/config wrapper lives outside the repository and is excluded from changes. Several earlier default Turbopack build attempts hit an intermittent internal Google-font resolver error; no application font/bundler configuration was changed to work around it. Production Webpack builds passed, and the ordinary Next development preview runs separately at http://127.0.0.1:3000.

## Delivery and safety

All work is local and uncommitted. Nothing was pushed, merged or deployed. Production data, accounts, Storage objects/policies and environment variables were not modified. No AWM Kids changes or source-language migration were included. Existing audit artifacts/screenshots were preserved; new QA artifacts are untracked/ignored and excluded from delivery source files.

## Files changed

- `app/(admin)/admin/featured/FeaturedManager.tsx`
- `app/actions/featured.test.ts`
- `app/actions/featured.ts`
- `app/components/home/AwmPromoSection.test.tsx`
- `app/components/home/AwmPromoSection.tsx`
- `app/components/home/FeaturedCarousel.tsx`
- `app/components/home/FeaturedHero.tsx`
- `app/components/home/HomeDashboard.tsx`
- `app/components/home/HomeForYouSpotlight.tsx`
- `app/components/home/SpotlightPlayerFrame.tsx`
- `app/lib/featuredShows.test.ts`
- `app/lib/featuredShows.ts`
- `app/lib/homeFeatured.test.ts`
- `app/lib/homeFeatured.ts`
- `app/page.test.tsx`
- `app/page.tsx`
- `app/profile/ProfileView.tsx`
- `docs/homepage-featured-membership-verification.md`
- `e2e/featured-carousel-membership.pw.ts`
- `e2e/fixture-server.mjs`
- `e2e/home-spotlight.pw.ts`
- `e2e/spotlight-layout.pw.ts`

Overlay follow-up: checked 320, 390, 768, 1024 and 1440px against real local Featured artwork. The pagination remains inside the artwork, clears the Featured badge and playback buttons, is horizontally centred, introduces no page overflow and retains working dot navigation. Focused ESLint, TypeScript and whitespace checks passed.

App-reminder relocation follow-up: removed `AppDownloadSection` from Home entirely and mounted it below the account content on the verified signed-in viewer's own Profile (free, Plus, editor and admin). Other public profiles omit it. The existing signed-in `AppLaunchSignup` mode now shows the account email and opt-in/opt-out controls, using unchanged server actions. The member AWM+ card remains after the app reminder for active members. Seventeen focused unit/action tests and ten reminder/profile browser cases passed; the eighteen Featured/membership browser cases also passed with the new placement. Reminder consent survived refresh and could be switched off using synthetic accounts. TypeScript, focused ESLint and whitespace checks passed. Additional files updated for this follow-up: `app/components/home/AppLaunchSignup.tsx`, `app/components/home/HomeDashboard.tsx`, `app/components/home/HomeDashboard.test.tsx`, `app/profile/ProfileView.tsx`, `app/profile/ProfileView.test.tsx`, `e2e/home-cleanup.pw.ts`, `e2e/featured-carousel-membership.pw.ts`.

Featured action-row follow-up: pagination and Play/Episodes now share the same vertical centre line at 320, 390, 768, 1024 and 1440px, without overlap or page overflow. Dot navigation passed; eight existing FeaturedHero tests, focused lint and TypeScript checks passed.

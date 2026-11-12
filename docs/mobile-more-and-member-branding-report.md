# Mobile More grid and active AWM+ branding

Implemented locally on the current website codebase. No deployment, production database writes, migrations, pricing changes, or billing changes were performed.

## Mobile Watch > Episode > More

- Previous mobile cap: 3 videos. New mobile cap: up to 9 valid recommendations.
- Layout: three columns and up to three rows; nine available videos fill a 3 x 3 grid.
- The existing phone breakpoint (below 768px), 4:5 thumbnail proportions, 10px rounding, gradient-backed title overlay, two-line title clamp, gaps, and full-width tabs are preserved.
- Data source: the existing `related` prop from `app/cartoons/[show]/[episode]/page.tsx`. It ranks the existing public episode catalogue from `fetchAllEpisodesForPublic` and supplies up to 12 recommendations. This source and its ranking are unchanged. Mobile filters missing slugs/show slugs before taking nine; it does not fabricate placeholders or hard-code episode IDs.
- Every card keeps its existing Next.js episode link. Transcript loading, playback, history, entitlements, and the Script / More / Settings / Memory handlers are unchanged.
- Desktop More was not changed. The wider playlist and desktop recommendation rail retain all 12 fixture recommendations and their existing rendering.

## Active AWM+ branding

- Navbar: `navbar/index.tsx` reads the shared status; `BrandLogo.tsx` adds an inline gold `+` and the accessible name `ArabicWithM Plus home`.
- Footer: `footer.tsx` uses the same status and plus component, with the accessible wordmark name `ArabicWithM Plus`. Footer links, dialogs, copyright, and layout remain unchanged.
- Card: `home/AwmPromoSection.tsx` retains the small gold `AWM+` label and displays the exact active heading `Your AWM+ subscription is active.` Existing supporting thanks, benefits, dates, cancellation/payment notices, and Manage membership action remain.
- Entitlement source: the existing `premiumStatusCache` and its server action `fetchPremiumStatus`; `usePremiumStatus` subscribes to that same cache instead of adding a second membership snapshot. Requests are deduplicated and refresh on focus, visibility, and account-access changes. Identity changes and invalidated requests cannot apply a previous account's status.
- The existing canonical `premium || admin` access decision remains unchanged. No membership is inferred from profile fields, localStorage, or Stripe history.

| Canonical state | Navbar/footer | Homepage card |
| --- | --- | --- |
| Guest | ArabicWithM | Existing upgrade presentation |
| Signed-in free | ArabicWithM | Existing upgrade presentation |
| Active entitlement | ArabicWithM+ | Exact active heading, existing management action when manageable |
| Expired or cancelled without entitlement | ArabicWithM | Existing upgrade presentation |
| Cancel-at-period-end with active entitlement | ArabicWithM+ | Active heading and existing access-until notice |

## Verification

- Chrome and Firefox: phone More grid at 320/390/430px; exactly nine links, three measured columns and rows, no horizontal page overflow, existing corners/proportions/title clamp, all nine destination links, loaded players, Script, Settings, Memory, and browser back navigation.
- Wider recommendation layouts: 768/900/1440px, with twelve recommendations and existing tablet playlist / desktop strip / desktop rail rendering. Only the narrow mobile branch was changed.
- Chrome and Firefox branding: 320/390/430/768/1440px; gold inline plus, accessible names, no brand wrapping or overlap, footer alignment, exact card text, guest/free/active/expired/cancelled/cancel-at-period-end states, expiry refresh, and signout.
- Screenshots of the 320px navbar, footer, and nine-card grid were visually inspected. Fixture thumbnails use placeholder imagery; the layout and production thumbnail code are exercised.
- Unit coverage includes fewer available videos (0/1/3/8), filtering invalid links before the nine-item limit, unchanged wider count, shared-request deduplication, account changes, late responses, failed verification, cancellation, existing checkout/management delegation, and footer dialog links.

## Check results

- `npx vitest run --maxWorkers=4`: 200 test files passed, 2 skipped; 1,362 tests passed, 4 skipped.
- `npx playwright test --config playwright.member-branding.config.ts`: 32 browser scenarios passed initially. Two 1440px desktop checks initially used the wrong accessibility role; the existing desktop rail is an aside, not a section. After correcting only the test selector, both passed on a targeted rerun with `--grep 'wider watch recommendation layout stays unchanged at 1440px'`. All 34 distinct Chrome/Firefox scenarios passed across these runs.
- The browser fixture performed successful production Next.js builds against isolated local test data.
- `npx tsc --noEmit`: passed.
- ESLint on changed TypeScript components, hooks, tests, and browser configuration: passed without errors or warnings.
- `git diff HEAD --check`: passed. No unresolved merge entries remain.

## Files changed

Product:
- `app/cartoons/[show]/[episode]/EpisodePage.tsx`
- `app/components/navbar/index.tsx`
- `app/components/navbar/BrandLogo.tsx`
- `app/components/footer.tsx`
- `app/components/MemberBrandPlus.tsx`
- `app/components/home/AwmPromoSection.tsx`
- `app/lib/premiumStatusCache.ts`
- `app/lib/usePremiumStatus.ts`

Tests and fixtures:
- `app/cartoons/[show]/[episode]/UpNextList.test.tsx`
- `app/components/footer.test.tsx`
- `app/components/home/AwmPromoSection.test.tsx`
- `app/lib/usePremiumStatus.test.tsx`
- `e2e/fixture-server.mjs` (isolated test data only)
- `e2e/member-branding.pw.ts`
- `e2e/mobile-more-grid.pw.ts`
- `playwright.member-branding.config.ts`
- This report.

The current codebase's already-declared dependencies were installed for verification; package manifests and lockfiles were not edited.

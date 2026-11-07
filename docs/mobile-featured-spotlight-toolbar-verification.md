# Mobile Featured, Spotlight and For You refinements

Selection-path follow-up: the eight-attempt Homepage discovery implementation described below has been superseded by the dedicated server-rendered RPC path. See [Homepage selection verification](home-spotlight-selection-verification.md). The mobile UI and historical test results below are preserved.

UI changes are mobile-only (below the existing 900px md breakpoint). Desktop layouts remain unchanged. The explicitly requested Homepage Spotlight duration constraint is shared across Homepage viewports; normal For You clip selection is unchanged.

## Implementation

- Featured previously put Play, selectors and Episodes in one mobile row. Play now occupies the first grid row at left; Episodes occupies the second row at left. Selectors remain in the centre column of equal outer columns, aligned vertically with Episodes. Desktop retains its existing row and dimensions. Artwork, focal positions, carousel selection, rotation and destinations are unchanged.
- Mobile Spotlight uses a left-aligned heading with a compact teal Watch More arrow button beside it, including at 320px. Desktop retains its centred heading, button styling and player sizing. Native player controls, active Arabic/English subtitles, guest allowance and mobile resize-grip visibility are unchanged.
- The Homepage-only selector requires 30-60 seconds, prefers completed thoughts at 40-60 seconds, and ends on actual segment boundaries. It may read contiguous neighbouring segments from the same ready, For You-published admin transcript. It rejects short fragments, missing segment positions and long gaps; no viable source yields no preview rather than a short fragment. Candidate retries are capped at eight. The existing normal feed loader, eligibility and English group classification are unchanged.
- Mobile For You toolbar gap/padding increases from 4px to 8px, with space-evenly distribution and wrapping. View/language spacing increases from 6px to 16px on For You only. Controls retain their sizes and actions. Explore spacing and desktop toolbars are unchanged.
- Imports is hidden below 900px and cannot be applied as an invisible mobile-only selection. All groups remains unrestricted, so eligible imported content can appear. Other filter options remain available; desktop retains Imports. No group, transcript, membership or Admin data was changed.

## Verification

Unit tests: 47 passed across homeSpotlight, forYouGroups, forYou actions, FeaturedHero and HomeDashboard. Accepted duration cases: 30, 40, 45, 59.75 and 60 seconds. Rejected cases: 5, 10, 15, 29.99 and 61 seconds. Tests cover extension to 45 seconds, Arabic sentence punctuation, missing/gapped segments, original normal-feed length and imported AR/EN eligibility.

Browser tests use isolated synthetic Supabase accounts/data and an instrumented YouTube fixture, not production writes or a real YouTube playback verification. Each Spotlight layout test checks an actual selected 45-second fixture clip and native-player wiring. Responsive tests cover 320/390/430, 768, both sides of md at 899/900, and 1024/1440 where applicable. Featured tests verify centring, alignment, no overlap/overflow, destinations, touch swipe and keyboard/resize behaviour. Toolbar tests verify view switching, language classification, unchanged guest allowance, filter opening/application and mobile/desktop Imports visibility. Spotlight tests verify header geometry, 16:9 ratio, centred Arabic above English, player visibility and Watch More routing.

Production Webpack build, TypeScript, focused ESLint and git diff --check passed. Final Chrome run: 27 passed (46.0s). Firefox: 17 Featured/toolbar cases passed, then all 8 applicable Spotlight cases passed (16.2s); two Chromium CDP touch cases were intentionally skipped in Firefox and passed in Chrome. Final screenshots at 320px were visually inspected: left-stacked Play/Episodes with centred selectors, and left-aligned Spotlight heading/button on one row.

Exact unit command:

```powershell
npx vitest run app/lib/homeSpotlight.test.ts app/lib/forYouGroups.test.ts app/actions/forYou.test.ts app/components/home/FeaturedHero.test.tsx app/components/home/HomeDashboard.test.tsx
npx tsc --noEmit
```

Focused ESLint covered the changed TS/TSX source/tests. Production builds used Next's supported `next build --webpack` in a temporary external copy of the existing synthetic fixture runner; application build configuration was not changed. The final Chrome browser command used the external `artifacts/playwright-existing-build.config.cjs` runner against the same built application:

```powershell
npx playwright test --config <external-artifacts>/playwright-existing-build.config.cjs e2e/spotlight-layout.pw.ts e2e/mobile-feed-toolbar.pw.ts e2e/featured-carousel-membership.pw.ts --grep 'responsive controls|responsive header|mobile view|desktop retains|Imports filter|genuine touch swipe|drag and keyboard resize|tablet touch drag|invalid stored size'
```

Firefox used `--browser=firefox`, an isolated Playwright Firefox executable, and the same synthetic backend/build. Its Spotlight rerun measured heading/button rectangles in one layout snapshot to avoid false failures when preceding page content settled between separate browser round trips. Arrow assertions use explicit Unicode escapes to avoid Windows shell encoding changes. No pending test failures remain in the targeted scope.

## Files changed

- app/actions/forYou.ts
- app/actions/forYou.test.ts
- app/lib/homeSpotlight.ts
- app/lib/homeSpotlight.test.ts
- app/lib/forYouGroups.test.ts
- app/components/home/FeaturedHero.tsx
- app/components/home/HomeForYouSpotlight.tsx
- app/components/home/HomeDashboard.test.tsx
- app/explore/ExploreViews.tsx
- app/explore/MobileForYouPanel.tsx
- app/explore/ForYouGroupFilter.tsx
- e2e/fixture-server.mjs
- e2e/featured-carousel-membership.pw.ts
- e2e/mobile-feed-toolbar.pw.ts
- e2e/spotlight-layout.pw.ts
- docs/mobile-featured-spotlight-toolbar-verification.md

No commit, push or deployment. Production settings/data, payment logic, AWM Kids and native applications were untouched.

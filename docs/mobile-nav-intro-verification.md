# Mobile floating navigation introduction

Reuses `app/components/MobileBottomNav.tsx`. The original fixed 52px circular menu button retains its icon, styling, shadow and bottom-right position. A fixed pill expands leftwards beside it without changing page layout.

The automatic preview shows only Explore (`/explore`), Watch (`/cartoons`), Read (`/books`) and Learn (`/learn`). The deliberately opened floating menu retains Home (`/`) and all four destinations. Existing account and role options in the main mobile drawer remain unchanged.

Expansion takes 450ms, followed by a 5,000ms hold and an 800ms width collapse. Labels fade over 220ms during collapse. Reduced-motion mode disables transitions and transforms while preserving navigation and session behavior.

`sessionStorage` key `awm-mobile-nav-intro-seen` prevents replay on internal navigation, remount and reload in the same tab session. A new session may show it again. A memory fallback avoids repeated introductions when storage is unavailable. Desktop does not consume the mobile introduction.

Opening the menu or choosing a preview destination cancels automation. Route changes, history navigation, hiding the floating navigation, viewport changes and unmount clean up timers and animation frames. Pointer/focus interaction cancels the countdown so focused controls cannot disappear underneath the user. The old timer cannot close the full menu.

Validation:

- Full Vitest suite: 180 files passed, 2 skipped; 1,281 tests passed, 4 skipped.
- Focused navigation and access suite: 30 passed.
- Chrome and Firefox: all 20 browser scenarios passed across the initial interaction run and corrected timing run. All six timing/geometry scenarios passed on rerun; the test now accounts for screenshot capture time when measuring the hold.
- 320/390/430px: four labels fit on one row, fixed right edge and original circle geometry verified, no horizontal overflow or page heading shift, decreasing width sampled during collapse.
- All preview routes, full-menu Home, manual menu persistence, reload/internal navigation session behavior, reduced motion and unchanged desktop navigation verified.
- TypeScript, targeted ESLint and `git diff --check` passed. The browser fixture successfully built the production app.

Screenshots: `docs/validation/mobile-nav-intro/{chrome,firefox}-nav-intro-{320,390,430}.png`.

Task files: `app/components/MobileBottomNav.tsx`, `app/components/MobileBottomNav.test.tsx`, `e2e/mobile-nav-intro.pw.ts`, `playwright.mobile-nav-intro.config.ts`, this report and the six screenshots. No backend data changes or deployment were performed.

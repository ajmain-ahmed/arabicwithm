# Mobile UI update

## Changed components

- `MobileBottomNav.tsx`: replaces the persistent bottom bar with a safe-area-aware floating navigation button. The menu closes on destination selection, outside click, or Escape. Desktop navigation remains unchanged. The existing compact mobile header is retained for account/theme controls.
- `SiteShell.tsx` and `ExploreFeed.tsx`: remove the old bottom-bar space reservation.
- `ChapterReader.tsx`: centres the header; groups Line by line, Book view and Settings; hides mobile per-line bookmark icons. Touch/pen holds open the existing bookmark action after 600 ms. Movement over 10 px, pointer cancellation and release cancel pending holds. Context-menu and Shift+F10 provide an accessible alternative. Book dictionary popovers remain unchanged.
- `EpisodePage.tsx`: Watch word taps/keyboard activation open an animated bottom drawer using the existing `WordTooltip`. Outside click, Escape and Close dismiss it. The mobile navigation button hides while it is open. Desktop hover definitions remain available.
- `CartoonsPage.tsx`: compact, labelled random-episode icon beside browsing modes; Clear all appears when filters are active. Shared filter reset remains available in drawers and desktop sidebars.
- `ContentCard.tsx`, Watch grids, book pages and Home cards: 16:9 video media and 2:3 book media, with cover cropping. Mobile Watch grids use two columns so landscape tiles remain usable.
- `WordOfTheDay.tsx`, `HomeDashboard.tsx`, `app/page.tsx`: Word of the Day moves first and uses the normal `lg` content width. Existing conditional reading/Watch sections remain. Weekly Memory counts replace total-card/Memory-XP displays and disappear if that data is unavailable.
- `PremiumPrompt.tsx` and billing/access messages: visible tier name is AWM Plus. The price uses `Intl.NumberFormat('en-GB', {style:'currency',currency:'GBP'})`; benefits are shortened. Internal billing identifiers are unchanged. Stripe-hosted product names are not editable without billing credentials.

## XP and database

- Memory awards zero points in the server action and stores zero session XP.
- Memory no longer contributes to level calculations. Existing historical XP records are retained.
- The generic time tracker excludes Memory, including while a floating video plays, to prevent indirect XP awards from practice.
- Weekly card counts reuse `memory_reviews.activity_date` and `memory_totals`, using the existing London Monday boundary. No new analytics tables or historical-data deletion.
- Apply `supabase/migrations/20260910180000_memory_no_xp.sql` after the earlier platform migrations. It replaces the existing review function while retaining its signature, ignores XP requested by old clients, and preserves quotas, idempotency and session saving. No new tables. This migration has been tested locally, not applied to the connected Supabase project; a SQL connection is still required.
- No book-completion reward system was found. The amount to award per completed book is pending the user's answer; no arbitrary award or completion event was invented. Current levels therefore use app time only.

## Verification and remaining work

- Production build and TypeScript passed. Regression suite: 108 tests passed, including legacy callers requesting XP, idempotent Memory submissions, preserved counts, and exclusion from time tracking.
- Lint passed during implementation; final small layout/gesture edits were type-checked and linted.
- Chrome/native browser inventory is empty and the in-app browser is unavailable. The requested visual and interaction checks at 320, 375, 390, 430, tablet and desktop widths remain unverified. In particular, real-device long press/scroll cancellation, floating-menu tap dismissal, sheet/FAB interaction, and overflow need browser verification.
- These changes have not been published in this update.

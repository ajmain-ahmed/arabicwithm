# Mobile Explore, For You and watch-page refinements

Every visual change in this task applies below 768px. Existing tablet layouts at 768–899px and desktop layouts from 900px are preserved.

## Explore pill

Before: a single compressed 58px current-view pill. After: the existing polished segmented `ViewSwitch mobile` is reused on Explore only: two 82px buttons, 36px minimum button height, 2px surrounding padding, rounded border, blurred dark background and the original active/inactive treatment. This implementation also exists in history at `2ccb611` in `ExploreViews.tsx`.

For You retains its current-view toggle. Canonical routes remain `/explore` and `/explore?view=foryou`, with existing browser history behavior. The language selector remains exclusive to For You.

## For You proportions

The current translucent bordered design, gold Short/Full selection and full control set are retained. Controls remain on one row below the video. Widths follow content rather than being identical:

| Width | Height | Icon controls | View | Language | Speed | Short/Full | Gap |
|---|---|---|---|---|---|---|---|
| 320px | 32px | 28px | 52px | 28px | 32px | 72px | 2px |
| 390/430px | 36px | 36px | 58px | 32px | 32px | 80px | 3px |

Below 390px, icons are 16px and text is 11px; at 390–767px, icons remain 18px and primary pill text is 12px. Short/Full retains its established compact typography. Consistent gaps and centered alignment replace stretched spacing. Existing tablet dimensions remain unchanged.

Control order remains For You, AR/EN, Filter, speed, Settings, Short/Full, previous and next. Imports stays absent from Filter Content. No feed classification, ordering, allowances, settings behavior or sound preference logic was changed.

## More cards and tabs

The existing recommendation source and canonical episode links are retained. The narrow-screen More branch renders up to three valid items using `slice(0,3)`; it adds no fabricated items. Fewer available items occupy the same grid cleanly, and the existing empty state remains.

The cards reuse `HOME_CAROUSEL_CARD_ASPECT_RATIO` from `NewOnRow.tsx`: 4:5 portrait artwork, cover-fit images, a 10px compact Home-style radius, the same forest background and bottom gradient. Titles overlay the image with shadow and a two-line clamp. The Homepage component and its styling were not modified.

At 320/390/430px, each card is approximately 92/115/129px wide and 115/144/161px tall, with 6px gaps. The tab bar spans viewport width minus 16px, leaving 8px normal side gutters. Script, More, Settings and Memory keep full-width allocation, current active indication and original handlers. Content aligns with the wider container. The sticky video compensates for the gutter change and retains its original viewport width.

## Verification

- 29 focused unit tests passed for mobile transcript presentation, feed, playback, filtering and English subtitle presentation.
- Final browser run: 42 scenarios passed across Chrome and Firefox.
- 320/390/430px: restored Explore pill, all For You controls and interactions, no overlap/wrapping/page overflow, three rounded cards in one row, title overlay/clamp and full-width tabs verified.
- Script selection, Settings dialog, recommendation navigation, transcript/player loading and Memory route verified.
- 767/768/769px and 899/900px boundaries checked. Tablet recommendation list and toolbar dimensions remain unchanged; desktop mobile-only elements remain hidden.
- Desktop Explore/For You regressions passed at 1024/1440px, including view controls, language controls, Settings and sound controls.
- A separate check detected watch-page horizontal overflow at desktop widths 900/1440px. Rebuilding with the original HEAD version of `EpisodePage.tsx` reproduced the same four failures in both browsers. This pre-existing desktop issue remains unchanged; the final no-overflow assertion is scoped to mobile/tablet. Desktop layout checks still run.
- Production fixture build, TypeScript, targeted ESLint and whitespace checks passed. YouTube interactions use the deterministic API fixture; screenshots use fixture artwork.

Screenshots are in `docs/validation/mobile-page-refinements/`: restored Explore pills, For You toolbar rows and More cards in both browsers at the primary mobile widths, plus 767px More captures.

Files changed: `app/explore/ExploreViews.tsx`, `app/explore/MobileForYouPanel.tsx`, `app/cartoons/[show]/[episode]/EpisodePage.tsx`, `e2e/spotlight-fix.pw.ts`, `e2e/mobile-refinements.pw.ts`, `playwright.mobile-refinements.config.ts`, this report and validation screenshots.

The Explore pill styling was reverted without changing desktop. The For You toolbar retained its current design language with balanced proportions. The mobile More tab displays three rounded video thumbnails in one row with title overlays when at least three items are available. The Script / More / Settings / Memory tab container spans the full mobile content width. No deployment or data changes were performed.

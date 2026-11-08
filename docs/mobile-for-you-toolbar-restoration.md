# Mobile For You toolbar restoration

Before: both Explore and For You were shown simultaneously, with speed, Settings, video mode and previous/next navigation inside a More popover.

After: one horizontal strip directly beneath the player, ordered **For You | AR/EN | Filter | speed | Settings | Short/Full | Previous | Next**. The More popover was removed. No mute control was added.

The view pill shows only the current view. For You switches to `/explore`; Explore switches to `/explore?view=foryou`. Back/Forward works and `/explore` still defaults to Explore. The language pill shows only AR or EN, appears only on For You, and restores the selected language when returning from Explore. Existing language classification and feed cache reset behavior are unchanged.

Filter retains the existing icon and functionality. Imports is absent from its choices; eligible imported content, Admin, transcript groups and backend data were not changed. Existing guest filter availability is preserved.

Speed displays the actual current player rate. Tests change 1x to 1.5x and verify both the player rate and unchanged playback time. Settings remains a gear button using the existing settings popover. Short/Full reuses the existing segmented switch and callbacks. Previous/next buttons reuse the existing feed navigation, ordering, disabled states and selection logic.

Controls share 36px outer height, rounded borders, 18px icons and compact spacing. At 320px the narrowest standalone buttons are 26px wide; at 390/430px they expand to 32px. The view/language pills and mode selector have separate widths to keep labels legible. No required controls are hidden, wrapped or placed over native YouTube controls.

Validation:

- 29 focused tests passed across MobileForYouPanel, ForYouFeed, playback, filter and English subtitle tests.
- 24 browser scenarios passed in Chrome and Firefox using `playwright.mobile-toolbar.config.ts`.
- 320/390/430px: all nine individual buttons are visible in one row, aligned vertically, at least 24px wide, nonoverlapping and within the viewport. No page horizontal overflow.
- View/language toggles, language restoration, filter with Imports absent, rate changes without seeking, Settings, both modes and previous/next navigation passed.
- Guest allowance and explicit sound preference remained unchanged through language switching.
- English subtitle regressions passed at 320/390/430/768/1024/1440px: Arabic sentence/word glosses/natural English sentence, native seeks and AR restoration.
- Desktop regression checks passed at 1024/1440px: existing two-view controls, 82px Explore control, AR/EN selector, settings and sound controls preserved; mobile toolbar hidden.
- TypeScript, targeted ESLint and `git diff --check` passed. Browser fixtures built the production app successfully. Player checks use the deterministic YouTube API fixture.

Screenshots: `docs/validation/mobile-toolbar-restoration/{chrome,firefox}-one-line-toolbar-bar-{320,390,430}.png`, plus full-page captures in the same directory.

Files changed:

- `app/explore/ExploreViews.tsx`: mobile current-view and language pills.
- `app/explore/MobileForYouPanel.tsx`: visible single-row controls and responsive styling.
- `app/explore/ForYouFeed.tsx`: mobile mode control reuses existing ShortFullSwitch.
- `e2e/spotlight-fix.pw.ts`: current-view toggle and visible control interaction checks.
- `playwright.mobile-toolbar.config.ts`: focused toolbar and subtitle browser regressions.
- This report and twelve screenshots.

The mobile For You toolbar is restored to one clean horizontal row. The Explore/For You control shows only the current view and toggles to the other view when tapped. The language control shows only AR or EN and appears only on For You. Filter, playback speed, Settings, Short/Full and video navigation are all visible on the mobile For You toolbar. Desktop toolbar behaviour was not changed. No deployment or database changes were performed.

# Mobile For You one-line refinement

Implemented locally on 8 November 2026. No deployment or database change.

Previously, the mobile toolbar deliberately used two rows: Explore/For You and the simultaneous AR/EN pill above playback, filters, settings, mode and video navigation.

The new toolbar is a single non-wrapping row:

`[ Explore | For You ] [ AR ] [ Filter icon ] [ More ]`

Only AR or EN is displayed in the language button. Activating it toggles the existing For You language state and reloads the appropriate group-based feed. Its accessible name describes both the active language and the action: “Arabic selected — switch For You to English”, or the reverse.

The existing speed, settings, Short/Full and previous/next controls remain available in the More popover. They operate the existing player. The popover does not add another toolbar row or remove functionality.

## Layout

Both mobile flex containers use `flex-wrap: nowrap`. The toolbar has 8px horizontal padding and 4px gaps. Language, Filter and More have 40px width and 42px height, with 1px borders and pill radii. The view pill grows into the remaining width; its two segments share that width and retain readable, single-line labels. Internal horizontal button padding is 6px.

| Viewport | View pill allocation | Each utility | Toolbar height |
| --- | ---: | ---: | ---: |
| 320px | 172px | 40 × 42px | 58px |
| 390px | 242px | 40 × 42px | 58px |
| 430px | 282px | 40 × 42px | 58px |

All outer pills have aligned vertical centers. Geometry tests check every visible toolbar button, ordering, non-overlap, bounds, no wrapping and absence of horizontal page overflow.

Screenshots from the production fixture:

- [320px](validation/mobile-for-you-one-line/chrome-one-line-toolbar-bar-320.png)
- [390px](validation/mobile-for-you-one-line/chrome-one-line-toolbar-bar-390.png)
- [430px](validation/mobile-for-you-one-line/chrome-one-line-toolbar-bar-430.png)

Matching Firefox screenshots are saved in the same directory.

## State, routing and filters

- Explore/For You remains a two-option segmented pill. Routes remain `/explore` and `/explore?view=foryou`; Back/Forward restores the correct view.
- Normal Explore has no mobile language button. Returning to For You retains EN when previously selected.
- AR → EN loads English-group fixture sources; EN → AR loads Arabic sources. The existing authoritative group selection code is unchanged. No `source_language` field was introduced.
- Filter remains on the same row. Opening, viewing Stories and applying the filter work; Imports remains absent from the mobile options. No content or groups were deleted.
- Guest usage remains at its seeded 123,000ms through language toggles with stationary fixture playback. Explicit mute preference remains `muted`. Authentication and allowance logic were not changed; the existing allowance regression tests pass.
- The compact sizing is enabled only by the mobile wrapper. Desktop Explore retains its icon navigation and sound controls; desktop For You retains its existing 82px view segments, simultaneous AR/EN buttons, settings and sound controls. Desktop checks run at 1024 and 1440px in both browsers.

## Verification

The targeted browser suite contains twelve cases: three mobile widths, guest allowance/sound preservation, and two desktop widths in both Chrome and Firefox. It builds and tests the production application with the isolated backend and instrumented YouTube fixture. This is a UI/state refinement; no real-media engine code changed.

Commands:

```powershell
npx playwright test --config playwright.spotlight-fix.config.ts --grep 'mobile one-line|guest language|desktop Explore'
npx vitest run app/explore/MobileForYouPanel.test.tsx app/explore/ForYouAllowance.test.tsx app/lib/forYouGroups.test.ts app/explore/ForYouFeed.playback.test.tsx
npx tsc --noEmit
npx eslint app/explore/ExploreViews.tsx app/explore/MobileForYouPanel.tsx e2e/spotlight-fix.pw.ts
git diff --check
```

Browser suite: 12 passed. Focused Vitest: 22 passed. TypeScript, ESLint and whitespace checks passed. The browser fixture's production build passed.

Files changed:

- `app/explore/ExploreViews.tsx`: one-button language toggle and mobile-only sizing variant.
- `app/explore/MobileForYouPanel.tsx`: one-line toolbar and More popover for secondary controls.
- `e2e/spotlight-fix.pw.ts`: updated mobile acceptance checks, state-preservation checks and desktop regression coverage.
- This report and its saved screenshots.

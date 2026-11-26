# Compact mobile layout and paused language options

Release work dated 26 November 2026; deployment status is reported separately.

## Product behaviour

- Public For You requests use the Arabic pool, even when an old client passes
  `en`. Canonical English-group descendants and explicit English source metadata
  are excluded before clip acceptance. Rejected candidates are skipped and the
  batch refills. Full-transcript requests use the same classification boundary.
- Both desktop/mobile source-language controls are removed. Old English session
  caches cannot seed the Arabic feed. Admin and Transcript Library content is
  retained; no transcript or content row is changed.
- `WEBSITE_LOCALISATION_ENABLED = false` keeps server HTML, provider, MUI and
  interface text English/LTR, including old Arabic cookies/local storage.
  Locale setters are dormant. Preferences, dictionaries, metadata and renderers
  are preserved, with no translation-provider calls or schema changes.

## Phone layout

`app/mobileCompact.css` applies only below 600px, using shared gutter, section,
panel, heading and touch-target tokens and component data attributes. No root
font, viewport, zoom or global scale change is used.

Key dimensions: navbar 59→53px for the signed-in fixture, Featured about
473→411px at an 844px viewport height, Quick Actions 76→66px, shortcut cards
145→126px, carousel card cap 152→132px, cover/card heights about 13% shorter,
Memory start panel 330→286px and profile avatar 88→76px. Controls retain their
existing accessible target sizes or larger; oversized CTAs stop at 44px high.
Inputs retain a 16px font to avoid iPhone focus zoom. Educational Arabic, Reader
prose, subtitles, diacritics and user text settings keep their original sizes.

Loaded guest Home measurements at all five phone widths (844px viewport
height): navbar **57→51px**, Featured **472.6→411.0px**, and the first episode
row starts at **645.6→562.6px**. The compact row and following section heading
fit in the first screen. At 1440px, navbar remains **65px**, Featured remains
**580.5px**, and the episode-row position remains unchanged. Root font remains
16px. See `home-guest.png` and `home-comparison.json` in the artifact directories.

Featured artwork, positions, rotation, links, lazy-loading/recovery and player
logic are retained. Existing Safari startup recovery code is unchanged.

The new Linux Chromium desktop check exposed an existing Episode keyboard-hint
row overflow (3px at 1440px; reproduced locally as 80px at 1280px). The Episode
component matched deployed commit `75ae740` before this correction. Hints now
wrap only when their row has insufficient space; control sizes, text sizes,
panel widths and normal desktop proportions remain unchanged. The regression
check covers 1280, 1366 and 1440px without allowing overflow.

## Verification artifacts

`e2e/mobile-compact.pw.ts` captures first-screen screenshots and geometry for
Home, Explore, For You, Watch, Shows, Show detail, Episode, Read, Book detail,
Learn, Memory, Profile and Listen Library. It waits for actual page content.
The before captures use deployed commit `75ae740` in an isolated checkout.
Screenshots and measurements live under ignored
`artifacts/mobile-compact/{before,after}/{browser}/{width}/` at 320, 375, 390,
414, 430 and desktop 1440px. Tests reject horizontal overflow, stale Arabic UI
and language selectors; desktop container and Featured geometry are compared.

Additional tests cover Arabic-only clip transitions/history with mixed source
fixtures, persisted Arabic preferences, settings/slider/player identity and
source-classification refills. Existing active bilingual/English-feed browser
tests remain explicitly dormant for reactivation; their renderers still have
unit coverage. Metadata review and Admin access tests remain active.

Validation: TypeScript, lint (zero errors; ten pre-existing warnings), the
Cloudflare build and all **1,700 unit tests** pass (266 files; six files/eight
tests skipped). The mobile/feed matrix has 32 passing journeys, with eight
settings/player journeys, four desktop keyboard-hint regressions and four loaded-Home capture journeys across Chrome,
WebKit, Firefox and Edge. Profile assertions select the visible retained route;
desktop comparisons use stable position/width/padding/type measurements rather
than random content-dependent container heights. Featured height is compared
directly against the deployed version.

Browser screenshots are fixture evidence, not authenticated production or
physical-iPhone acceptance. WebKit coverage is not a physical iPhone/Home Screen
test. The existing production smoke test and Worker evidence step remain in CI;
if Cloudflare challenges the runner, report that limitation rather than calling
the live test successful.

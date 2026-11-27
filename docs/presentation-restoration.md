# Restored website language and compact phone presentation

Comparison baseline: deployed source commit `60072f7`, using identical fixture
content and 844px-high viewports. No production content or publication state was
changed. The screenshot fixtures use placeholder artwork and a simulated player.

| Measurement | Before | After |
| --- | ---: | ---: |
| Phone header, signed out | 51px | 45px |
| Featured frame, all five phone widths | 411.02px | 349.41px |
| Latest Episodes row top | 562.61px | 488px |
| Latest Episodes row height | 177px | 162px |
| Desktop header / Featured | 65px / 580.5px | unchanged |
| Expanded navigation at 390px | 360 × 52px | 306 × 44px |
| Collapsed navigation | 52 × 52px | 44 × 44px |
| Phone section spacing / horizontal gutter | 21px / 14px | 18px / 12px |
| Phone Quick Actions minimum height | 66px | 56px |
| Matching Arabic target, phone / desktop | 16px / 16px | 23px / 28px |
| Matching Arabic label, phone / desktop | 16px / 16px | 22px / 26px |
| Main Arabic sentence, phone / desktop | 32px / 32px | 25px / 32px |

The Featured frame is 15% shorter. The episode row starts 74.61px earlier and
ends 89.61px earlier, exposing more of the following content in the same screen.
Home screenshots cover 320, 375, 390, 414 and 430px, plus a 1440px desktop control.
The floating introduction remains viewport-constrained at 320px; its height is
reduced even where its width is already constrained. Touch controls retain a
44px minimum where compact sizing is applied; search inputs remain 16px to avoid
Safari focus zoom. Root sizing, viewport configuration and educational reader /
subtitle sizes are unchanged.

The matching card's more specific English Typography and Button selectors had
overridden the intended Arabic sizes. Explicit Arabic target/label selectors and
shared responsive Grammar variables fix that precedence. Targets and wrapped
rows are centred in RTL order, labels and choices are centred, and line heights
preserve diacritics. Existing user text-size preferences still scale these values.
The shared Naḥw/Ṣarf provider, foundation choices, prepared pattern choices and
Learn ordering presentation use the same size variables.

The black surrounding Word Search box came from `WordSearchShell` applying
`background.default` inside an embedded Learn card. The dark theme defines that
page background as `#000000`. Embedded shells now use a transparent background
and inherit the existing card surface. Standalone pages retain their theme
background. Grammar cards use the Learn page's 12px radius and theme surface /
divider tokens. Selected/correct/incorrect states and focus indicators remain.

The existing website locale flag is enabled again. Desktop has the globe and
EN/AR indicator with a 6px gap; mobile keeps the control inside the top-left menu
beside AWM+ and streak controls. Cookies and local storage retain the existing
preference. The mobile trigger stays physically left in both directions while
menu text and page content follow the selected language. Admin chrome remains
English. For You's canonical server-side Arabic-source exclusions remain intact.

No activity or player is keyed by locale. The three Start cards, independent
progress, random continuation, lazy engines and square destination tiles remain.
Initial Learn activity-request count is zero; switching language with a running
puzzle preserves its DOM and content without another activity request.

## Reproducible verification and evidence

- `playwright.presentation.config.ts`: all five phone widths and desktop in
  Chrome, WebKit, Firefox and Edge; menus, preference persistence, RTL, reduced
  motion, light/dark shells, on-demand workload, matching drag/drop and tap,
  continuation, measured typography and retained independent activities.
- `playwright.localisation.config.ts`: bilingual catalogues, approved metadata,
  filters, retained player/question/grid identity and zero translation-provider
  calls. The Learn journey explicitly starts its activities.
- `playwright.localisation-settings.config.ts`: both languages, phone/desktop,
  keyboard-operable sliders and retained player identity in all four browsers.
- `playwright.mobile-compact.config.ts`: route-wide geometry, Arabic-only feed,
  desktop keyboard hints and identical-content Home screenshots. Set
  `AWM_SIZING_BASELINE` to an appropriate captured snapshot root for an explicit
  geometry comparison; historical pre-launcher Learn snapshots are not the
  deployed desktop baseline.

Local screenshots and measurements are in ignored `artifacts/presentation/` and
`artifacts/mobile-compact/`. The local comparison gallery is
`artifacts/presentation/comparison.html`. CI retains presentation screenshots as
part of its localisation artifact.

Recorded local results: 32 presentation checks, 12 bilingual journeys, one
metadata workflow, 16 bilingual settings checks and 10 compact-layout/feed/
Home checks passed. A fresh 13-route desktop comparison against `60072f7` found
no changes to container position, width, font or padding. The full unit suite
passed 1,701 tests in 266 files, with eight existing skips across six files.
TypeScript and the Cloudflare production build passed; lint had zero errors and
the same ten existing warnings. Initial stale pre-launcher baseline and
English-only font-label test expectations were corrected; they were test
expectations, not application regressions.

## Deployment and device limits

Deploy through the existing gated Cloudflare workflow. The public production
readback script records HTML/cache status and CSS asset path, hash and layout
version `v20261127-2`; it rejects a reachable deployment with missing/mismatched
phone CSS. A Cloudflare challenge is reported as blocked verification, without
bypassing it. Deployment telemetry records the active Worker version.

Source inspection found no service-worker registration or asset-cache strategy;
homepage HTML is configured `private, no-store`, while versioned assets remain
cacheable. This does not establish the cache state of the user's iPhone.

WebKit testing is browser-engine emulation, not physical iPhone Safari or an
installed Home Screen session. Physical iPhone verification is unavailable in
this environment. Production challenge restrictions, if present in CI, must be
reported separately from successful fixture tests and Worker deployment.

# Learner website localisation

Implemented and validated on 25–26 November 2026. Deployment status is reported
separately after the GitHub production workflow finishes.

## Behaviour

English remains the default. The EN/AR selector stores a validated preference
locally and in a SameSite preference cookie. Server HTML, document direction,
the MUI locale, theme direction and streaming Emotion styles agree on reload.
Switching language preserves mounted players and current activity progress.
Admin CMS chrome remains English and LTR.

The reviewed dictionaries contain more than 1,100 interface and legal message
keys. The runtime audit covers 26 route variants as a guest, free user and Admin.

| Area | Changes |
| --- | --- |
| Home | Quick Actions, For You Spotlight, Watch More, latest rows, Phrase of the Day and complete AWM+ promotional copy. Current Featured artwork, framing, destinations and navigation are preserved. |
| Watch | Controls, search, filters, actual database category variants and shared settings descriptions. Canonical category keys remain unchanged. |
| Read | Search, levels, category options, audiobook controls, release messages, Reader controls and settings. CEFR identifiers remain unchanged. |
| Metadata | Curated Arabic titles take precedence over approved, current-source metadata. Titles are propagated through catalogue, detail, Reader, audio, profile and activity-preview paths. This includes كِتَابُ الْأَمْثَالِ. |
| Footer | All sections, links, rights text and the requested Arabic brand description. Brand names and contact addresses are retained. |
| Other learner UI | Authentication, profile, support, feedback, loading/error messages, activity controls and completion states, and policy pages. |
| RTL | Existing Arabic UI font, MUI Arabic defaults and RTL styling. Numeric sliders and English educational text retain their own appropriate reading direction. Root font scale and viewport are unchanged. |
| Navbar | Desktop language and sign-in controls use measured 6–8px icon/text gaps. |
| Learn | Three equal near-square navigation tiles beneath the central Grammar panel on desktop; one row after all stacked activities on mobile. Word Search, Grammar and Memory remain independently mounted. |

Educational sentences, vocabulary meanings, Memory learning content, transcript
tokens and chapter JSON are intentionally unchanged. No Book/chapter publication
state was changed, and no migration was needed for these presentation changes.

## Main implementation paths

- `app/components/WebsiteLocaleProvider.tsx`, `DirectionalStyles.tsx`,
  `LocalisedContent.tsx`, `ThemeProvider.tsx`, and `app/layout.tsx`.
- `app/lib/localisation/{locale,messages,learnerMessages,activityMessages,legalMessages}.ts`.
- Shared navbar, footer, catalogue, settings and learner-page components.
- Metadata reads in `app/actions/{books,cartoons,profiles,puzzles,memory,forYou,transcripts}.ts`.
- `app/learn/{page,PracticePanel,LearnNavigationTiles}.tsx`.
- Localisation Playwright configurations/specifications and the production CI
  workflow. CI retains screenshots for 14 days.

## Validation

- TypeScript passes.
- Full Vitest suite: **265 files pass, 1,695 tests pass; 6 files / 8 tests skipped**.
- Lint: **0 errors**; 10 existing warnings remain in unrelated/pre-existing code.
- Cloudflare/vinext production build passes.
- **16 browser journeys pass**: EN/AR at 390, 768 and 1440px plus Admin metadata
  export/preview/import/retry/approval, in Chrome, WebKit, Firefox and Edge.
- **8 additional settings journeys pass**: mobile and desktop in all four
  browsers, with Arabic descriptions and preserved player identity. They also
  verify numeric slider alignment within 2px and increasing keyboard direction.
- **78 route audit visits pass**: 26 variants for guest, free and Admin contexts.
  Identified English interface defects are rejected by the audit assertion.
  The canonical lowercase reading-level route and public Transcript viewer
  have explicit page/title assertions, preventing a 404 from satisfying them.
- Browser journeys verify persistence, filter keys, curated Arabic title display,
  square tile dimensions/position, player/activity identity, no hydration
  warnings and no translation-provider requests.
- English supporting sentences and numeric timestamps have their own reading
  direction, including Watch headings and the bilingual Reader.
- Fixture server syntax, conflict-marker and staged credential/path checks pass.

The initial GitHub run passed all 1,695 assertions but exposed a pre-existing
late playback-store import during `AuthContext.test.tsx` teardown. That test now
uses an isolated playback-store mock and verifies its sign-out reset. Production
authentication and sign-out behaviour were not changed for this test fix.

An additional geometry check reproduced an 18px slider-thumb displacement when
RTL styling transformed a deliberately LTR numeric control. Numeric sliders now
use the existing LTR Emotion cache as well as LTR component behaviour, without a
new DOM wrapper or a locale-dependent key. All eight settings journeys pass the
geometry, keyboard and player-identity checks after this correction.

Screenshots are generated under `artifacts/localisation/screenshots/`, including
`chrome-1440-navbar-ar.png`, `chrome-1440-home-ar.png`,
`chrome-1440-watch-filters-ar.png`, `chrome-1440-read-ar.png`,
`chrome-390-footer-ar.png`, `chrome-1440-learn-tiles-ar.png` and
`chrome-390-learn-tiles-ar.png`. These use isolated fixture data; they do not
constitute authenticated production acceptance tests.

## Metadata availability and cost

Rendering and switching languages never request automatic translations.
The zero-cost bulk workflow is described in [metadata-translation.md](metadata-translation.md).
Existing curated and approved Arabic metadata is reused without overwriting it.
Records without either retain their original metadata. The exported backlog of
596 untranslated metadata fields still requires Arabic preparation and review;
exporting those fields is not a completed metadata backfill. This is separate
from translating the website's interface controls.

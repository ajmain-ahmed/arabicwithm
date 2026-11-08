# English For You subtitle layout — 8 November 2026

The EN-only renderer is implemented locally and tested. No deployment, transcript rewrite, migration, membership change or production write was performed. The previous mobile toolbar refinement remains intact.

## Live content limitation

A read-only audit of the authoritative English group `5b98c563-5c35-4696-98e1-06aa000eb622` and its descendants found two published ready transcripts containing 90 segments. Neither `english_text` nor `original_text` contains a usable full English source sentence in these records. Sampled rows store Arabic in both fields; `canonical_paragraph.translation` is also Arabic. Raw paragraph keys are `text`, `offset`, `tokens`, `english`, `duration` and `paragraph`; there is no separate preserved full English source field in the inspected records.

The new Arabic token/gloss layers can render these existing records. Their bottom English sentence cannot be faithfully displayed until original English sentences are supplied in an existing sentence field. The component displays “English source sentence is unavailable for this segment.” It does not manufacture a sentence from token glosses or label the stored Arabic translation as English. All production content remains unchanged, as requested.

The regression fixture contains the complete supplied example, including “Do you wish to confess?”, and verifies the fully populated three-layer design.

## Renderer and EN detection

`EnglishForYouSegment` now supports an explicit `arabicFirst` presentation. `ForYouFeed` passes the selected For You language into its player rather than choosing presentation from video metadata. Both desktop and mobile EN branches opt into `arabicFirst`; AR continues using its existing branch and `ForYouWords`/mobile token markup.

The existing `forYouGroupPool` remains responsible for authoritative group membership and descendant handling. No group rules, routing, selection RPCs, JSON schema, allowance, player timing or toolbar behavior were changed. No new `source_language` field was introduced. The new fixture deliberately omits that metadata and still displays EN correctly through the existing group-based language selection.

The previous English-source renderer was preserved as `EnglishSourceSegment`. Standalone transcript pages and existing non-opted-in consumers retain their previous presentation. The full unit suite includes those transcript-page regressions.

## Fields and hierarchy

| Display | Existing field | Presentation |
| --- | --- | --- |
| Arabic sentence/token line | `tokens[].arabic` | Largest, centred, RTL |
| Direct vocabulary gloss | `tokens[].english` | Smaller, centred beneath its Arabic token, LTR |
| Full natural English sentence | `english_text`, with `original_text` fallback for an English source sentence | Once below the token pairs, centred, LTR |

The complete Arabic token line supplies the top Arabic sentence; no duplicate Arabic sentence is printed above or below it. Each word/gloss pair is one grouped button, with Arabic then English children and their respective language/direction attributes. The existing definition popover remains available.

The bottom sentence is never assembled from glosses. A sentence-content validation guard rejects incorrectly populated Arabic sentence fields; it does not select a transcript's language mode. The Arabic `translation` field is not substituted into the English bottom line.

Closing punctuation is attached to the preceding Arabic word, and opening punctuation to the following word. Punctuation-only tokens do not create empty gloss labels. Missing glosses do not hide Arabic words. Stored token arrays are not mutated. Existing gloss/sentence visibility and text-size preferences remain supported.

## Timing, seeking and responsiveness

The renderer consumes the existing active timed segment; all three layers use that same segment. No player polling, timeline, seek handling or clip boundary logic changed.

Chrome and Firefox checks passed at 320, 390, 430, 768, 1024 and 1440px. They verify:

- Arabic-first pair order, smaller aligned English glosses, and exactly one natural English sentence beneath the complete token row.
- Paired wrapping, readable typography and no horizontal page overflow.
- Actual native fixture scrubber input while playing and paused, forward/backward seeks, an out-of-clip seek that resolves the full transcript, and repeated rapid seeks.
- All three layers update together at 1, 20, 36 and 55 seconds. Paused seeking remains paused.
- AR → EN → AR → EN changes presentation cleanly. AR has no English-only wrapper or stale EN sentence layout.
- Full transcript retrieval occurs once for the source, not on every seek.

These are browser integration tests with the isolated backend and instrumented YouTube API. They verify the existing native scrubber-to-player-to-renderer synchronization; this task did not repeat external YouTube network playback testing.

Screenshots:

| Width | Chrome | Firefox |
| --- | --- | --- |
| 320 | [Card](validation/english-for-you-layout/chrome-english-subtitle-320.png) | [Card](validation/english-for-you-layout/firefox-english-subtitle-320.png) |
| 390 | [Card](validation/english-for-you-layout/chrome-english-subtitle-390.png) | [Card](validation/english-for-you-layout/firefox-english-subtitle-390.png) |
| 430 | [Card](validation/english-for-you-layout/chrome-english-subtitle-430.png) | [Card](validation/english-for-you-layout/firefox-english-subtitle-430.png) |
| 768 | [Card](validation/english-for-you-layout/chrome-english-subtitle-768.png) | [Card](validation/english-for-you-layout/firefox-english-subtitle-768.png) |
| 1024 | [Card](validation/english-for-you-layout/chrome-english-subtitle-1024.png) | [Card](validation/english-for-you-layout/firefox-english-subtitle-1024.png) |
| 1440 | [Card](validation/english-for-you-layout/chrome-english-subtitle-1440.png) | [Card](validation/english-for-you-layout/firefox-english-subtitle-1440.png) |

## Exact verification

```powershell
npx vitest run
npx playwright test --config playwright.english-subtitles.config.ts
npx tsc --noEmit
npx eslint app/explore/EnglishForYouSegment.tsx app/explore/EnglishSourceSegment.tsx app/explore/EnglishForYouSegment.test.tsx app/explore/ForYouFeed.tsx e2e/english-subtitle-layout.pw.ts e2e/fixture-server.mjs playwright.english-subtitles.config.ts
git diff --check
```

Results: 1,268 unit tests passed across 178 files, with four optional live cases skipped; all 12 browser cases passed. TypeScript, focused lint, whitespace checks and the browser fixture's production build passed. The Arabic renderer and standalone transcript tests passed unchanged.

## Files changed for this request

- `app/explore/EnglishForYouSegment.tsx`: explicit Arabic-first presentation and stored English sentence handling.
- `app/explore/EnglishSourceSegment.tsx`: preserved standalone English-source presentation.
- `app/explore/ForYouFeed.tsx`: explicit selected-language presentation and desktop opt-in.
- `app/explore/MobileForYouPanel.tsx`: mobile EN presentation opt-in only; existing toolbar work retained.
- `app/explore/EnglishForYouSegment.test.tsx`: supplied example, pairing, punctuation, missing-source, visibility and timed-content regressions.
- `e2e/english-subtitle-data.json`: four distinct saved-sentence fixtures.
- `e2e/english-subtitle-layout.pw.ts`: all requested widths, seek states and AR restoration.
- `e2e/fixture-server.mjs`: optional isolated subtitle scenario, without language metadata.
- `playwright.english-subtitles.config.ts`: focused Chrome/Firefox runner.
- This report and its screenshots.

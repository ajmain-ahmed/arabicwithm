# English For You transcript display verification

Verified locally on 2026-11-07. No commit, push, deployment, production write, migration or canonical JSON rewrite was performed for this task.

## Root cause

Desktop ForYouWords and MobileForYouPanel always rendered Arabic as the primary token, with English below, irrespective of the existing group-validated AR/EN feed mode. The normalised ForYouSegment view model also discarded the existing canonical/raw translation field, so the final Arabic translation could not reliably reach the renderer.

## Field mapping and scope

- Only the EN branch uses the new shared EnglishForYouSegment renderer.
- Primary English source wording comes from tokens[].english in original array order, displayed as the dominant top token line. No Arabic source/translation sentence is duplicated above the tokens.
- Each pair's tokens[].arabic appears directly below its English token in smaller Arabic text. Stored diacritics are preserved, including when the AR tashkeel-removal preference is disabled.
- Existing translation appears beneath the token area as the complete Arabic sentence, lang=ar and dir=rtl. It is never substituted with english_text.
- Closing punctuation stays attached to its preceding English word and does not create an empty gloss row. Source token objects are not mutated.
- The existing meanings/sentence visibility and text-size preferences are respected. Token pairs retain English-then-Arabic DOM order and language/direction attributes.

Feed passes its existing language mode to ClipPlayer and MobileForYouPanel. That mode is already enforced by server forYouGroupPool against English group UUID 5b98c563-5c35-4696-98e1-06aa000eb622 and descendants before clips reach the client. There is no classification by text, title, channel, video ID or a source_language field. Tests use a renamed English root and a nested group to verify identity/subtree handling.

The same component renders mobile/desktop short and full transcript modes. The translation reader retains an existing segment/canonical/raw translation as an optional client view-model property; canonical stored schema is unchanged. If an EN clip response omits translation, the selected source uses the existing cached source-transcript reader once. There is no repeated source read on timing updates. No new database query endpoint, RPC, table or migration was introduced.

The AR branches retain their existing ForYouWords/mobile token renderers, field order, RTL treatment, English glosses and sentence display. Player code, clip timing/advancement, guest allowance, source classification, Admin editors/imports and Homepage AR Spotlight presentation were not modified.

## Responsive and browser results

All requested widths passed in Chrome and Firefox: 320, 390, 768, 1024 and 1440px. Checks verify English primary words, the correct fully vocalised Arabic gloss directly beneath each word, final complete RTL translation, natural wrapping, no horizontal overflow, full transcript at a later source time, and EN -> AR restoration without stale English layout.

The supplied Give / my / creature / life example is used verbatim as a synthetic fixture. The 320px result was visually inspected. Screenshots are preserved in the sibling workspace artifacts/english-for-you-screenshots directory.

- 57 focused unit tests passed across English component, existing mobile/desktop AR renderers, playback, normalisation, group classification and For You actions.
- Chrome: 26 browser cases passed, with all six English-specific cases rerun on the final production build.
- Firefox: all 25 applicable cases passed across the main suite and final English rerun. Its one Chromium CDP touch case is intentionally skipped in Firefox and passed in Chrome.
- The Firefox English rerun passed all six cases. Geometry assertions allow 0.01px floating-point precision; the initial strict assertion differed by approximately 0.00002px, without an actual UI overlap.
- Production Next Webpack build, TypeScript, focused ESLint and git diff --check passed.
- Browser playback uses an isolated synthetic YouTube API fixture, not a live YouTube network verification. No user browser profile was accessed.

## Exact tests

```powershell
npx vitest run app/explore/EnglishForYouSegment.test.tsx app/explore/MobileForYouPanel.test.tsx app/explore/ForYouFeed.test.tsx app/explore/ForYouFeed.playback.test.tsx app/lib/forYouData.test.ts app/lib/forYouGroups.test.ts app/actions/forYou.test.ts
npx tsc --noEmit
npx eslint app/explore/EnglishForYouSegment.tsx app/explore/EnglishForYouSegment.test.tsx app/explore/ForYouFeed.tsx app/explore/ForYouFeed.test.tsx app/explore/MobileForYouPanel.tsx app/lib/forYou.ts app/lib/forYouData.ts app/lib/forYouData.test.ts e2e/english-for-you.pw.ts
```

The browser suite uses the existing isolated synthetic backend and a temporary external copy of the fixture runner with Next's supported --webpack build flag. No application bundler configuration was changed:

```powershell
npx playwright test --config <external-artifacts>/playwright-webpack.config.cjs e2e/english-for-you.pw.ts e2e/mobile-feed-toolbar.pw.ts e2e/spotlight-layout.pw.ts
```

Firefox adds --browser=firefox and its isolated Playwright executable. Final English-only reruns reuse the built application with playwright-existing-build.config.cjs and e2e/english-for-you.pw.ts.

## Files changed for this task

- app/explore/EnglishForYouSegment.tsx
- app/explore/EnglishForYouSegment.test.tsx
- app/explore/ForYouFeed.tsx
- app/explore/ForYouFeed.test.tsx
- app/explore/MobileForYouPanel.tsx
- app/lib/forYou.ts
- app/lib/forYouData.ts
- app/lib/forYouData.test.ts
- e2e/fixture-server.mjs
- e2e/english-for-you-data.json
- e2e/english-for-you.pw.ts
- docs/english-for-you-display-verification.md

English-group videos use tokens[].english as primary text, tokens[].arabic underneath each English word, and the complete translation as the final Arabic sentence. Arabic-source rendering was not changed.

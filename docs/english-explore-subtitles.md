# English-source Explore subtitles

The real-data fixture comes from canonical Transcript Library record `ee29cd86-3134-46e3-91ac-73c013692d87`, YouTube `0cCvKCt1gB4` (As Told By Ginger), created 24 November 2026 at 17:34:47 UTC. Its stored title includes the prefix “GB Skip navigation Create Avatar image”. Membership is in English group `5b98c563-5c35-4696-98e1-06aa000eb622`; existing group filtering and source-language detection are unchanged.

Read-only production queries confirmed 456 stored segments. Four consecutive excerpts, source positions 390–393 (18:28–18:51), are copied into the isolated test fixture, including the longest seven-expression sentence. Token wording, grouping, diacritics, Arabic translation and timing values are copied without correcting or generating translations.

| Stored field | Presentation |
|---|---|
| `tokens[].english` | Prominent English source expression, in stored left-to-right order |
| `tokens[].arabic` | Vocalised Arabic equivalent directly beneath its own English expression |
| Canonical paragraph `translation` | Complete Arabic sentence beneath the paired token row, right-to-left |
| Raw source block `translation_EN` | Original full English sentence; preserved as source data, not reconstructed from glosses or substituted for the Arabic sentence |
| Canonical `timestamp` / indexed `start_seconds`, `end_seconds` | Existing subtitle timing, seeking and active-segment selection |

The stored upload has already been normalized: raw blocks use `offset`/`duration` in milliseconds, Arabic sentence text in `text`/`english`, and retain `translation_EN`. Indexed canonical paragraphs expose `translation` and `timestamp`; their legacy `english_text` column contains Arabic for this upload. The new layout does not depend on that incorrectly named column and does not rewrite it.

The bug was the explicit `arabicFirst` override in both desktop and mobile For You presentation. Both now reuse `EnglishSourceSegment`, keeping expressions and equivalents in one wrapping flex unit. Explore alone opts into larger Arabic equivalents and sentence typography. Standalone transcript and Homepage typography remain unchanged. Arabic-source rendering, video-player lifetime, playback, seeking, dictionary popovers and Memory code are unchanged.

Changed application files: `app/explore/EnglishForYouSegment.tsx`, `EnglishSourceSegment.tsx`, `ForYouFeed.tsx`, `MobileForYouPanel.tsx`. Test changes: `EnglishForYouSegment.test.tsx`, `e2e/english-upload-subtitle-data.json`, `e2e/english-subtitle-layout.pw.ts`, `e2e/fixture-server.mjs`, `playwright.english-subtitles.config.ts`, plus the English subtitle check in `.github/workflows/deploy.yml`.

Validation: TypeScript and lint passed; full unit suite 1,670 passed, seven skipped; Next production fixture and Cloudflare production builds passed. Chrome, WebKit, Firefox and Edge each passed mobile 390 px and desktop 1440 px real-transcript layout/timing tests. Assertions cover all equivalents, expression order/grouping, vertical alignment, diacritic-preserving text, multiline wrapping, complete Arabic sentence placement, native seeks, pause state, stable player identity and Arabic/English switching. These are isolated local browser tests with a simulated YouTube player and production transcript excerpts, not physical iPhone or live YouTube verification. No production transcript or schema was modified; no migration was added.

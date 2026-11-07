# Mobile Featured revert and real Spotlight audit

## Status

Mobile Featured changes are implemented and tested locally. Spotlight is blocked before production migration: preflight found a material production-type mismatch. In accordance with the user's explicit stop condition, the approved migration was NOT applied. No production objects were created, no migration fragments were executed, and no website deployment/commit/push occurred.

## Featured

Before: Play above Episodes, with selectors centred along the lower row.
After (below 900px only): Play and Episodes in the same lower-left row; selectors in the top-right, 12px inside the image content edges (13px from the outside card border). The existing understated dark/blurred pill remains, with active-slide highlighting and no visible 1/3 text.

Desktop retains its original button sizing, row placement and centred lower selectors. Artwork dimensions, cover crop and focal positioning were not changed. Rotation/maximum-three selection code and reduced-motion navigation were not changed.

Real local Chrome and Firefox checks passed 30 cases: three real featured artworks (Breaking Bad, Invincible, Arcane) at each of 320/390/430/900/1440px in both browsers. Images decoded successfully, buttons aligned, selectors stayed inside their safe area, dot navigation stayed on Home, and there was no horizontal page overflow. The 320px screenshot was visually inspected.

Eight focused fixture browser cases passed (28.5s): mobile/tablet/desktop placement at 320/390/430/899/900/1440px, all three dots, actual Play/Episodes link clicks on mobile, pointer drag, genuine touch swipe, keyboard interaction, viewport resize and stable rotation across users/refresh. Tests wait for smooth slide transitions to settle before clicking the next selector.

## Actual Spotlight findings

Both real signed-out local browsers received Homepage HTTP 200 and the recoverable Spotlight error with Retry and Watch More. No fixture or YouTube double was installed during these real attempts.

Production project: whbxgwucsoguqzpnpzjd.

The real RPC returned:

PGRST202: Could not find the function public.home_for_you_spotlight(p_allow_source_tokens, p_seed) in the schema cache.

Read-only real RPC attempts took 134.1ms, 95.4ms and 78.6ms. These are failed-request durations, NOT successful selection timings. The code uses the dedicated selector, not the generic feed refill path, with one optional compatibility request sharing a 1500ms deadline.

No Spotlight video was selected. Consequently there are no real selected clip IDs/durations to report, and the real iframe/API readiness/autoplay/muted fallback/native controls/subtitle progression/clip boundary/resize playback and usage charging could not be verified end-to-end in this run. No YouTube iframe/media requests occurred: failure precedes YouTube initialization. This audit must not be described as successful real Spotlight playback.

Firefox additionally logged an auth LockManager error, rejected image-domain cookies and a regional Google Analytics connect-src violation. Chrome also logged the Analytics CSP violation. Those are separate from the confirmed server-side missing RPC; no Auth/CSP changes were made to mask them. Current frame-src permits the YouTube and youtube-nocookie embed hosts; referrer policy remains strict-origin-when-cross-origin. Real embed origin/permissions/tracking/autoplay behavior remains unverified because selection never reached an iframe.

## Approved migration preflight: stopped

Exact reviewed file: supabase/migrations/20261107140000_home_for_you_spotlight.sql.
SHA256: 4CC38FDDC88FE880B4ACBE4ED6BD26FF66E0D01E379E4294F90E8086B07250D4.
The migration file was not edited.

Read-only catalog inspection confirmed:

- home_for_you_spotlight and home_spotlight_window do not exist; no conflicting overloads were found.
- Both planned index names are absent, with no conflicting definitions.
- Required existing quality helper functions and the authoritative English root exist.
- Existing canonical candidate index contains 9,162 candidates across 67 sources.
- The file contains two selection functions, two indexes and grants/revocations scoped to those new functions; no content/account/Auth/Storage updates or unrelated pending migration.

Material mismatch:

- Production youtube_transcripts.duration_seconds is double precision; the prior local fixture defined it as numeric.
- Production transcript_segments.start_seconds/end_seconds are double precision (and theme score is real); the prior fixture used numeric.
- The approved helper accepts p_duration numeric, but the public RPC passes production t.duration_seconds without an explicit cast.

A disposable local PostgreSQL reproduction using the production types confirms:

function transcript_private.home_spotlight_window(uuid, integer, numeric, double precision, boolean) does not exist

The earlier numeric fixture was inaccurate and its green tests did not establish production compatibility. The migration could create its PL/pgSQL wrapper yet fail when called. It was therefore stopped BEFORE apply_migration, as instructed. No live fix or alternative migration was improvised. A corrected migration and production-typed tests need review and separate approval before production execution.

Existing source eligibility helper definitions also reflect current user_import eligibility; they were inspected but not changed. Existing security advisor findings were read and left untouched because unrelated fixes were not authorised.

## Verification and remaining limits

- 39 focused unit/SQL tests passed; one optional scale benchmark skipped. Those existing migration tests use their original fixture and do not override the production-type diagnostic above.
- Separate disposable local diagnostic reproduced the exact production-type incompatibility; its temporary source test was removed after saving the diagnostic artifact.
- 14 Spotlight/navigation/guest fixture cases passed in the broader audit, covering shared guest balance/exhaustion, registration/account transition, Explore default routing, mobile header/subtitles and resize behavior. They are synthetic regression evidence, not real-player success.
- All eight final Featured fixture cases passed, plus 30 real-artwork browser cases.
- Production Webpack fixture build, TypeScript, focused ESLint and git diff --check passed.
- Normal For You, transcript, account and adult catalogue database objects/data were not modified. Their post-migration production verification was not performed because no migration was applied.

Real Spotlight end-to-end and responsive native-player QA remains outstanding until the migration is corrected, separately authorised and applied. The existing 30-60s/AR-only SQL constraints have local test coverage, but no successful real selection was available to verify runtime duration or exclusion against production.

## Exact tests and artifacts

```powershell
npx vitest run app/lib/homeSpotlightMigration.test.ts app/lib/homeSpotlight.server.test.ts app/lib/featuredShows.test.ts app/components/home/FeaturedHero.test.tsx
npx tsc --noEmit
npx eslint app/components/home/FeaturedHero.tsx e2e/featured-carousel-membership.pw.ts
```

The production fixture runner uses a temporary external copy of the existing e2e fixture with Next's supported --webpack flag. Final browser cases:

```powershell
npx playwright test --config <external-artifacts>/playwright-existing-build.config.cjs e2e/featured-carousel-membership.pw.ts --grep 'Featured responsive controls|swipe/drag|genuine touch swipe'
```

Broader fixture audit also ran the selected Spotlight layout, guest and navigation cases in e2e/spotlight-layout.pw.ts and e2e/home-spotlight.pw.ts. Real scripts used isolated Windows Chrome and Firefox profiles against http://127.0.0.1:3000, without mocks.

Artifacts in the sibling workspace artifacts directory: spotlight-real-audit.json, spotlight-real-selection.json, spotlight-production-type-error.json, spotlight-production-type-repro.log, featured-mobile-real/result.json and screenshots, featured-mobile-revert-final.log, featured-spotlight-audit-tests.log and featured-spotlight-audit-unit.log.

## Files changed

- app/components/home/FeaturedHero.tsx
- e2e/featured-carousel-membership.pw.ts
- docs/featured-mobile-spotlight-audit.md

Mobile Play and Episodes are on the same line again. Mobile dots are top-right. Desktop Featured was not changed. Real local Spotlight attempts were made in both browsers, but successful real-player end-to-end verification is blocked and is not claimed.

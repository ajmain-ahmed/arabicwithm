# Homepage promo placement and For You playback refinements

## Placement and layout

- Previously free/guest AWM+ cards appeared below mobile Quick Actions on Home; active membership cards appeared at the bottom of My Profile.
- The shared `AwmPromoSection` now has one rendered location: directly below Books on Home, before mobile Quick Actions, for guest/free/inactive and active entitlement states.
- Active entitlement still comes from the existing verified premium-status cache/server action. Active members see membership status and the existing Manage membership action when manageable. Free/expired accounts retain the existing upgrade flow. Administrator entitlement remains supported without inventing a Stripe customer.
- Profile no longer mounts the AWM+ card or its wrapper. Profile tabs and account/membership controls inside them are unchanged.
- AWM+ headings, descriptive text, pricing and primary actions are centered. The existing 1,200px outer cap is extracted into `HOME_PROMO_MAX_WIDTH` and reused for the app card; responsive side padding remains.
- **User clarification:** keep the app reminder in My Profile, not on Home. Its wording, artwork and signup actions remain unchanged. Previously it filled Profile's content width (1,152px at a 1,440px viewport), with 48px desktop vertical padding and a 290px phone. It now fits its contents, centered, approximately 750px wide on desktop, with the same 1,200px cap, 24px vertical padding, 32px horizontal padding, a 24px column gap and a 200px phone. Mobile stays fluid, with 20px side padding, 24px vertical padding and a phone capped at 180px/45vw. No fixed desktop width is forced on mobile.

## Seek root cause and synchronization

Paused current-time polling already existed in `useYouTubePlayer`. The mismatch was in the view/window pipeline: Short mode retained only snippet rows when their translations were complete, gated active subtitles to the initial snippet range and could treat a native timeline jump as ordinary short-clip completion.

The existing 100ms For You poll and state callbacks now detect discontinuities beyond elapsed playback time (with a tighter paused threshold). This is opt-in for For You. An explicit seek outside the snippet fetches the same source's full transcript through the existing cached request and computes the active segment from actual time. All three English/Arabic layers use that same segment. No extra timer, player, custom timeline or seek-triggered autoplay was added. Regular playback still advances once at the short boundary. Player reload/mode changes clear seek-inspection state. Gaps have no unrelated fallback sentence.

The async transcript fetch stores rows, not a captured active sentence: rapid seeks resolve against the latest time when rows arrive. Prior component/source requests are canceled logically on cleanup.

Player protocol reference: [YouTube IFrame API getCurrentTime, playback states and seekTo](https://developers.google.com/youtube/iframe_api_reference).

## Speech selection

A shared server-side guard checks existing timed transcript data after candidate normalization, before a clip is returned. It requires speech within 1.5 seconds of the start, at least 55% spoken coverage, no uncovered gap over 8 seconds, and at least five meaningful words. Coverage merges overlapping intervals instead of double counting them. Marker-only music, applause, silence, laughter and sound-effect segments do not count, including Arabic labels with diacritics and English marker glosses. Occasional marker segments/tokens are omitted from the derived For You display, including the full transcript; storage is unchanged.

Homepage Spotlight retains its 30-60 second requirement and bounded optional fallback. Normal For You retains its existing duration rules, including the earlier ten-second candidate compatibility; no unrelated duration policy was changed. Existing natural-boundary selection/ranking, group membership and Arabic rendering stay in place. This task adds no source-language metadata, migration, audio analysis or classification store.

### Actual public transcript examples

Read-only production inspection identified English-group video **uvX4k_3Cmvs**, *Game of Thrones ? Season 4, Episode 6*:

- Rejected music/applause region **02:13-02:22**: segment IDs 57524/57525/57526 contain `[Music]`, `[Applause]`, `[Music]`; all three are classified non-speech. The selector returns no clip for that region.
- Accepted spoken region **00:00-00:31**: positions 0-6 contain dialogue such as ?Father, I wish to confess.? The union of timed spoken intervals covers the entire 31-second window.

These are actual stored public transcript excerpts, not invented examples. They are retained in `forYouRealSpeechRegions.json` and passed through the exact new selector guard. External audio delivery was not used as proof; the non-speech identification is supported by the stored timed annotations. No production records were changed.

## Tests and constraints

Browser tests use the production Next build and isolated synthetic Supabase/YouTube fixtures. They exercise the real app, iframe controls and server actions without billing or production writes. Real-data speech checks are separate read-only excerpts as described above.

`e2e/promo-playback.pw.ts` covers guest/free/active/expired states and Profile cleanup at 320, 390, 768, 1024 and 1440px. It asserts Home order, centered geometry, controlled width, no overflow and compact app geometry. Seek cases cover playing, paused, backward, rapid and boundary transitions at 00:14/00:15/00:16, 00:20, 00:42, 00:44/00:45/00:46, 00:48, 01:10, 01:37 and 02:05. English tokens, each Arabic gloss and full Arabic sentence change together. It verifies the same player/source stays mounted and ordinary short playback still advances.

`e2e/english-for-you.pw.ts` retains English hierarchy, Full/Short, raw translation fallback and Arabic regression coverage. `e2e/featured-carousel-membership.pw.ts` updates the existing placement assertions while preserving its carousel checks. Its Previous-button assertion now waits for smooth scrolling to reach the actual slide boundary; aria-hidden changes partway through that animation. This resolves the observed test timing flake without changing carousel UI code.

Unit tests cover the existing billing action delegation, cancellation/admin/cache identity handling, player default boundaries and paused discontinuities, coverage/gaps/overlap/non-verbal labels, actual transcript examples, selection refill and Spotlight rejection. TypeScript and changed-file ESLint also run.

No commit, push, deployment, production mutation, migration, Auth/Storage change or billing configuration change is part of this task. The previously documented missing production Spotlight RPC is not repaired by these local website changes.

## Files changed for this task

- `app/components/home/AwmPromoSection.tsx` and its test
- `app/components/home/HomeDashboard.tsx`
- `app/components/home/AppDownloadSection.tsx`
- `app/components/home/promoLayout.ts`
- `app/profile/ProfileView.tsx` and its test
- `app/lib/useYouTubePlayer.ts` and its test
- `app/explore/ForYouFeed.tsx`
- `app/lib/forYouSpeech.ts` and its test
- `app/lib/fixtures/forYouRealSpeechRegions.json`
- `app/actions/forYou.ts` and its test
- `app/lib/homeSpotlight.server.ts` and its test
- `e2e/fixture-server.mjs`
- `e2e/promo-playback.pw.ts`
- `e2e/featured-carousel-membership.pw.ts` (placement assertions and animation-settle wait only in this task)
- This report

## Final verification results

- Production `next build --webpack` against the isolated synthetic backend: passed.
- `npm test -- --run --maxWorkers=2`: **177 test files passed**, 2 files skipped; **1,257 tests passed**, 4 tests skipped.
- Core Chrome: **32/32 passed** (`promo-playback.pw.ts` + `english-for-you.pw.ts`).
- Firefox: **32/32 passed** (same core specs).
- Additional Chrome carousel/membership regressions: **24/24 passed** after the test animation-settle correction. The initial combined 56-case run had 55 passes and the one moving-Previous-control timeout; the full 24-case carousel suite was then rerun successfully against the same final build.
- Final `npx tsc --noEmit`: passed.
- Changed-file ESLint: zero errors; one pre-existing unused `eslint-disable` warning in `AwmPromoSection.tsx`.
- `git diff --check`: passed.
- All requested widths (320, 390, 768, 1024, 1440px): no horizontal overflow; centered promo/card geometry and English gloss pairing assertions passed. App reminder stays in Profile per the explicit clarification.
- Existing reviewed Spotlight migration file was not changed (SHA-256 `4CC38FDDC88FE880B4ACBE4ED6BD26FF66E0D01E379E4294F90E8086B07250D4`). No production migration/deployment was included.

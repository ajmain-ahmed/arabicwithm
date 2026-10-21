# Website UI corrections — 21 October 2026

## Restored versions

- The homepage hero in `HomeDashboard.tsx` uses the layout from `3f2a94f`
  (`2eda3c7^`): 520px mobile / 610px desktop minimum height, centred background,
  and the original responsive container padding. The existing overlay, image,
  content and text alignment remain intact.
- `AppDownloadSection.tsx` was restored verbatim from `3f2a94f`. This is the
  Ajmain-authored QR/store/phone layout (Git author `Noon`, email
  `ajmain.ahmed@pm.me`; prior changes include `841d496` and `a555789`). It retains
  that version's existing QR placeholder and store controls; no new download
  destinations or replacement design were invented.
- The unwanted avatar diamond was introduced by `2eda3c7` through
  `PremiumMemberMark`. Its desktop and mobile navbar instances were removed.
  The AWM+ control beside the streak now contains `DiamondOutlined` with the
  existing gold-light accent instead of `AutoStories`.
- The homepage email signup component is no longer rendered by the restored
  app section. Notification backend code and records are unchanged.

## Explore / For You

- Mode controls are vertical beside the desktop player. Settings follows them
  in the same rail; mobile keeps its compact controls.
- Each hint is positioned relative to the alternate mode's button, with a green
  background, a pointer, centred copy and an X. Desktop hints disappear after
  four seconds. Both directions are tested.
- Settings is labelled **Settings** and opens an anchored, content-sized
  popover with the existing three controls. Its width is capped by the viewport.
- The standalone Mute control was removed. Native YouTube sound controls remain;
  a sound-on action is offered when muted autoplay needs it.

## Playback and source availability

- The shared player polls actual time every 200ms while mounted, including when
  paused, so native scrubbing is detected. State changes and programmatic seeks
  also report time immediately. There is no timer per token.
- Transcript selection uses half-open sentence intervals. A gap or out-of-range
  time no longer incorrectly falls back to the first sentence.
- A source transcript is loaded once on opening its clip and retained in a
  bounded browser-memory cache. Playback and seeking never query the database.
  The server action checks ready / For You publication independently of
  searchable-library publication.
- Real token timing, where supplied in seconds or explicitly labelled
  milliseconds, drives highlighting. No timings are inferred for untimed words.
- Clip start and end are explicit. Playback pauses at the end; **Replay clip**
  seeks to the original clip start. Native YouTube Replay from video zero is
  redirected back to that clip start, with matching transcript state.
- YouTube errors 100, 101 and 150 mark a source unavailable on this browser and
  persist across reloads. Other player/API failures are excluded for the session.
  The feed advances immediately. If a batch contains only blocked sources, their
  segment IDs are excluded and another batch is requested, with a finite budget.
- For You does not fall back to a plain iframe that cannot report time or errors.
  Existing plain-iframe fallback behavior elsewhere is preserved.
- The live schema has general status/error/publication fields but no dedicated
  embedding-availability field. Browser reports do not change shared publication
  or delete transcripts. There are no database writes or migrations in this work.

## Read / Listen cards

- Shared grid minimums increased from 160 to 175px at small desktop/tablet widths
  and from 180 to 200px on large screens. The two-column phone layout is unchanged.
- The 2:3 cover ratio and cover/title layout remain unchanged in Read and Listen.
- Fine-pointer hover uses a 1.025 scale, 2px lift and soft green glow. Grid
  dimensions stay fixed; overflow and spacing allow the transform to render.
- Reduced-motion users get static glow without scaling or a repeating pulse.
  Touch devices do not receive desktop hover scaling.

## Changed files

Application:

- `app/components/home/HomeDashboard.tsx`
- `app/components/home/AppDownloadSection.tsx`
- `app/components/navbar/index.tsx`
- `app/explore/ExploreViews.tsx`
- `app/explore/ForYouFeed.tsx`
- `app/actions/forYou.ts`
- `app/lib/forYou.ts`
- `app/lib/forYouPlayback.ts`
- `app/lib/useYouTubePlayer.ts`
- `app/books/LibraryBookCard.tsx`

Tests and fixtures:

- `app/components/home/HomeQuickActions.test.tsx`
- `app/actions/forYou.test.ts`
- `app/lib/forYou.test.ts`
- `app/lib/forYouPlayback.test.ts`
- `app/lib/useYouTubePlayer.test.tsx`
- `app/explore/ForYouFeed.playback.test.tsx`
- `e2e/helpers/youtube.ts`
- `e2e/fixture-server.mjs`
- `e2e/ui-corrections.pw.ts`
- `e2e/targeted-cleanup.pw.ts`
- `e2e/ui-polish.pw.ts`
- `e2e/website-update.pw.ts`

## Verification

- Production build passed; TypeScript and scoped ESLint passed.
- Full unit suite: 818 passed, 3 skipped. A subsequently added blocked-batch
  regression passed, together with all 16 shared-player tests.
- Eight new browser acceptance tests passed in the running Next application.
  They cover historical hero/app restoration, premium icon placement,
  desktop/mobile Settings, alternate-mode hints and timeout, paused seeking,
  non-zero replay, token highlighting, persistent source exclusion, and
  transform-based hover with reduced motion.
- Sixteen updated browser regression tests passed across 320, 390, 768, 1024,
  1440 and 1920px, covering restored app controls, Read/Listen hover, touch
  behavior, settings persistence and gloss rendering. The older tests now use
  the same controlled API fixture instead of real invalid YouTube IDs.
- Screenshots of the homepage, For You layout and library were inspected.
- Playback tests use a controlled YouTube IFrame API fixture with actual hook
  callbacks and seeks. They do not claim that every live third-party video was
  manually played or that YouTube availability is known before its error event.
- No production deployment is claimed.

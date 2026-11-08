# Homepage Spotlight sound control

`HomeForYouSpotlight.tsx` adds a 32px circular sound button directly beside Watch More in a compact header action group. Accessible labels are Mute For You Spotlight / Unmute For You Spotlight, with a visible keyboard focus outline. The player frame and desktop resize grip are unchanged.

The Spotlight sound preference defaults to ON. It reuses the existing Explore/For You sound preference (`awm-explore-sound-enabled-v1`), including its localStorage persistence and in-memory fallback; an existing explicit mute remains respected across reloads and clips. No competing preference store was added.

The existing YouTube hook attempts audible playback. Its `onAutoplayBlocked` handling falls back to muted playback without persisting a user mute. The first trusted page pointer/keyboard interaction while temporarily muted attempts sound restoration once per mounted clip. A rejected restoration falls back again; subsequent page gestures do not repeatedly retry. The explicit sound button can always request sound again.

The button uses the hook's actual effective mute state (`isMuted()` or volume zero). It invokes real `mute()` / `playWithSound()` operations, rather than toggling an independent boolean. Hook polling keeps native YouTube changes synchronized, including while paused. Native intent detection distinguishes autoplay fallback from user mute. External mute writes the existing preference immediately; recovery checks that preference before attempting sound and never overrides explicit mute.

Validation:

- 44 focused Spotlight, YouTube hook, player sound-intent and Explore utility tests passed.
- Chrome: six browser scenarios passed. Firefox: six browser scenarios passed.
- Layout checked at 320/390/430px and 1440px: circular 32px control directly beside Watch More, aligned centers, no horizontal overflow. At 320px the title uses two compact lines within the same header.
- Audible autoplay, blocked-autoplay fallback with continuing playback, successful gesture recovery, rejected recovery without repeated retries, actual external mute/unmute, native mute synchronization, persisted mute on reload, Watch More navigation and unchanged guest allowance verified.
- Browser tests use the deterministic YouTube IFrame API fixture, including simulated audible-autoplay rejection. They do not constitute a live YouTube/browser-policy smoke test.
- TypeScript, targeted ESLint and diff whitespace checks passed. The browser fixture built the production app successfully.

Screenshots: `docs/validation/spotlight-sound/{chrome,firefox}-spotlight-sound-{320,390,430,1440}.png`.

Files changed: `app/components/home/HomeForYouSpotlight.tsx`, its existing `.test.tsx`, `e2e/spotlight-sound.pw.ts`, `playwright.spotlight-sound.config.ts`, this report and eight screenshots. No database changes or deployment were performed.

API behavior reference: [YouTube IFrame Player API](https://developers.google.com/youtube/iframe_api_reference).

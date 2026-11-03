1. **Audiobook architecture audited.** Traced Read → Listen → book → language/chapter → `requestChapterAudioResult` → server entitlement/auth checks → canonical source resolver → `ChapterAudioPlayer`. The existing book/chapter/audio records and keyed `AudioSession` remain in use. No second audiobook model or database was introduced.

2. **Source resolution.** No production resolver defect was found. Relative paths, bucket-prefixed paths, same-project full public/signed Storage URLs, stable external HTTPS audio, and canonical YouTube references already have explicit handling. Tests exercise relative, bucket-prefixed, full Storage and external HTTPS references through the real application/player. YouTube source switching is tested through the IFrame API fixture, not a live YouTube stream. Expiring signed links from another project remain deliberately unsupported.

3. **Arabic/English playback.** Actual browser media decoding/playback is verified for both languages using seekable audio fixtures: current time advances, media is not paused, ready state is usable, and duration is finite. Pause/resume keeps the same media element and position. Switching language or chapter pauses the departing element; the next source, title, position and duration update independently. A read-only live delivery audit also verified all **35 published MP3 objects: 24 Arabic and 11 English**, each returning HTTP 206 and non-empty bytes from a newly resolved signed URL. Seven unpublished English records were excluded. Live storage delivery is distinct from an authenticated production-browser playback audit.

4. **Browser/device matrix.** Chrome 156.0.8078.80 passed 35 distinct focused checks across successful reruns; Edge 156.0.4314.58 passed all 13 selected checks in one final run. The eight audiobook checks passed in each browser, including real decoded audio at 320px, 390px and 1440px, source formats, single active player ownership and free-account gating. Chrome additionally covers native timeline ownership at 320/360/390/430px and Full transcript behavior through 1440px. Tests use the production application build with isolated synthetic accounts/data. Narrow widths and CDP touch input are browser tests, not physical iPhone/Android verification. Firefox, desktop Safari, iOS Safari, physical Android Chrome, and device lock/unlock are not directly exercised here. Tab focus/return is checked without claiming OS background playback support.

5. **Entitlement.** Free accounts can discover Listen entries but receive the existing AWM+ prompt and no playable media element. Plus accounts obtain playback through the unchanged server boundary. Unit tests verify entitlement rejection happens before source lookup/signing. Audio access was not made public.

6. **My List covers.** The root cause was the generic homepage carousel’s 4:5 crop and `object-fit: cover`. Book items now render the existing `LibraryBookCard`, using the canonical Book cover, 2:3 artwork slot, `object-fit: contain`, and the same caption treatment as Read Library. Show/episode artwork retains its existing carousel treatment. No thumbnail is inferred from chapter images or video art.

7. **My List navigation.** Books always link to `/books/{slug}`. Saved reading progress no longer changes that destination. Book Detail and its existing controls remain accessible.

8. **Continue Reading.** This row remains a direct resume entry and is available on desktop as well as mobile. It retains canonical chapter/page/logical-block progress. The audit found that its old link omitted a stored language; it now uses `bookReaderHref` when language exists, so English progress resumes in English. Legacy progress without language retains its existing fallback behavior.

9. **Grammar controls.** `ActivityControls` groups logical controls with the theme’s spacing scale: 3 units/24px horizontally and 2 units/16px when wrapping. Practice level uses a compact labelled selector beside Auto Next; Case Endings includes the synchronized tashkīl shortcut. Switch label margins are reset so they do not consume the intended gap. Controls wrap neatly when width is insufficient. Other evaluated activities use the same control-row spacing without adding an artificial level setting.

10. **Oversized Grammar cards.** The shared answer area reserved 360px, or 420px for Word Patterns, measured and retained hidden option height, and overlaid feedback inside that fixed space. Word Patterns also had an outer minimum height. These produced the large initial gap.

11. **Dynamic feedback.** `AnswerArea` now uses natural content flow. Options occupy only their own height before answering; after evaluation they are hidden/inert and replaced by the existing centred icon/heading/answer/explanation/Next. Feedback takes its required natural height without internal clipping or a permanent spacer. Existing focus with `preventScroll`, semantic announcements, wrapping limits, manual corrections and Auto Next timing remain. No animated height transition is introduced, so reduced-motion users receive the same static layout. Word Patterns retains its existing resizable workspace with no forced initial feedback-sized minimum or viewport-height cap. Flashcards remain separate.

12. **For You sound intent.** Missing preference means sound on; explicit mute via the existing sound control remains persisted. For You requests unmuted playback and restores a non-zero volume on ready. Actual playing/mute state remains read from the player; intended preference is not inferred from an autoplay rejection.

13. **Autoplay fallback.** For You no longer retries a rejected audible start by silently muting. A blocked start retains audible intent, shows a concise tap instruction, and retries on a valid page pointer/keyboard interaction, including ordinary toolbar controls. The mute control is excluded from that recovery handler so deliberate mute wins. Successful PLAYING state clears the blocked indicator; issuing a play request alone does not claim success. Other callers retain their existing optional muted-fallback behavior. This follows the platform’s [autoplay restrictions](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay) and [YouTube autoplay-blocked event](https://developers.google.com/youtube/iframe_api_reference#onAutoplayBlocked).

14. **Native controls.** Removed the transparent mobile layer covering the upper player. The whole iframe now owns its hit targets, including top Volume/CC/Settings controls and its timeline. `MobileClipNavigator` excludes the entire player, toolbar, transcript and interactive elements from feed gestures. Feed navigation remains available on noninteractive feed regions and existing navigation controls. No duplicate player buttons were added. Hit tests use iframe control fixtures; live YouTube control rendering is not claimed as tested.

15. **Scrubber preserved.** No For You scrubber was replaced or redesigned. Mouse and touch drag/tap checks use the existing native timeline path. Audiobooks retain their existing MUI scrubber and are tested independently with actual media current time.

16. **Seek synchronization.** Transcript selection remains derived from actual `getCurrentTime()` and segment timestamps. Player state changes report current time immediately, with a 100ms actual-time poll for transcript-aware players, including while paused (other player callers retain 200ms). Full mode uses the complete source transcript; Short retains its clip start/end and completion logic. This uses the [IFrame API’s time and state interfaces](https://developers.google.com/youtube/iframe_api_reference), rather than advancing a prior transcript index.

17. **Short/Full results.** Native timeline tests seek within Short in both directions and verify the active line, then seek substantially backward/forward in Full with mouse and touch while keeping one active source/player. Full tests also cover transcript gaps and word timing. Existing unit tests cover Short completion/end/replay boundaries. All four native timeline checks passed at 320/360/390/430px in Chrome, including Short keyboard seeks, Full mouse/touch seeking, top-control hit targets, and feed interaction isolation. Six further Full transcript checks passed at 320/360/390/430/900/1440px. No real YouTube media playback or physical-device result is implied by the IFrame fixture.

18. **Memory Exit Practice.** Renamed both active/completed practice actions to Exit Practice and removed stale saved-session wording from the allowance message. Exit clears only the local unfinished practice state and returns to Memory selection. It does not navigate away to Home or save an unfinished queue.

19. **No obsolete restoration.** Memory still does not load/resume an unfinished saved queue. Exit resets local session/completion identifiers without deleting review submissions, learned cards, scheduling, entitlement usage or history. Component tests verify a completed review stays submitted after exit and no obsolete save/resume action runs; reducer tests verify the selection reset.

20. **Changed files.**

    - `app/components/home/HomeDashboard.tsx`
    - `app/components/home/NewOnRow.tsx`
    - `app/components/home/continueReadingItems.ts`
    - `app/components/home/continueReadingItems.test.ts`
    - `app/explore/ForYouFeed.tsx`
    - `app/explore/MobileClipNavigator.tsx`
    - `app/grammar/BankActivity.tsx`
    - `app/grammar/GrammarPage.tsx`
    - `app/grammar/GrammarUI.tsx`
    - `app/grammar/PreparedActivity.tsx`
    - `app/lib/memorySession.ts`
    - `app/lib/memorySession.test.ts`
    - `app/lib/useYouTubePlayer.ts`
    - `app/lib/useYouTubePlayer.test.tsx`
    - `app/memory/MemoryPage.tsx`
    - `app/memory/MemoryPage.test.tsx`
    - `e2e/audiobook-audit.pw.ts` (new)
    - `e2e/website-ux-audit.pw.ts` (new)
    - `e2e/helpers/account.ts` (new)
    - `e2e/helpers/youtube.ts`
    - `e2e/fixture-server.mjs`
    - `e2e/dynamic-full-toolbar.pw.ts`
    - `e2e/mobile-player-controls.pw.ts`
    - `e2e/grammar-feedback.pw.ts`
    - `e2e/home-my-list-resume.pw.ts`
    - `e2e/memory-layout.pw.ts`
    - `docs/website-playback-ux-audit.md` (this report)
    - `docs/validation/website-audit/` (screenshots)

21. **Tests/results.** 166 focused unit/component tests passed across 21 files; TypeScript passed. All changed source/test files passed ESLint. There are 48 successful browser checks: 35 distinct Chrome cases across focused reruns and 13 Edge cases. Relevant initially failing cases were corrected and rerun successfully; the Continue Reading language omission was a product defect fixed during this audit, while other iterations corrected test setup/fixture assumptions (audio availability before build, authenticated For You, actual current Memory pool size, and native slider/touch targeting). Production builds passed, and `git diff --check` passed. Screenshots were reviewed and saved under `docs/validation/website-audit/{chrome,edge}/`. Browser assertions verify decoded playback/current time, single-stream ownership, language/chapter source changes, mouse/touch seeks, free/Plus gating, canonical cover/ratio, Book Detail vs direct resume, compact Grammar controls/natural height, autoplay-rejection recovery without preference mutation, native control ownership, Short/Full transcript synchronization and Memory exit/reload. Production-build fixture checks do not imply production frontend deployment. No commit, push, production content mutation or database migration was performed for this request.

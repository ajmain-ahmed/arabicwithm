# Website UI polish report

This update is implemented in the local website repository. It has not been
deployed. The previous update's email consent, storage and audiobook access rules
remain in place. This task adds no database migration.

1. **Email CTA containment and centring.** The notification form mixed a wrapping
   input/button row with MUI's negatively margined `FormControlLabel`. This could
   push label/background treatment beyond the available width. The form now uses
   a centred, bounded, border-box panel with internal padding, zero label margin,
   a full-width input and a separate full-width action. Its grey/transparent
   treatment stays inside the panel. The action reads “Email me once the app
   launches”. Consent and signed-in account behaviour are unchanged.
2. **Desktop discovery bubble.** Green `#174832`, matching the site's existing
   forest palette, with white centred text and a tail on the left pointing to
   the relevant button. It appears to the right of the alternate-mode button,
   fades out after four seconds, and has an immediate close control. State and
   timers belong to the view owner, so preloaded slides cannot restart timers.
   Session storage remembers each view's hint. Desktop For You reserves space
   for the rail and hint instead of clipping the bubble at the screen edge.
3. **Word hover removed.** For You renders Arabic and supplied inline English
   as plain text. There are no token buttons, tooltip state or word-hover/tap
   popovers. English token data and the inline-meaning preference are preserved.
4. **Autoplay.** Only the mounted active clip requests autoplay. It attempts
   sound unless the saved sound preference is muted. If the IFrame API reports
   autoplay blocked, it retries muted once; a second refusal exposes a manual
   play path. “Turn sound on”, “Mute” and “Play with sound” controls communicate
   the current state. Clip/view changes destroy the previous player. The native
   fallback remains muted for policy compatibility and uses YouTube's controls.
   No browser-policy bypass is used.
5. **Book cards.** One shared `LibraryBookCard` provides the same cover dimensions
   and grid rules for Read and Listen. Titles now use restrained 13–14 px text,
   a small gap, a maximum of two lines, and no fixed-height title panel. Fine
   pointers get a soft green shadow without translation, resizing or layout
   shift. Touch users get the normal cover/title card.
6. **Listen route/player.** Both library modes stay on `/books`, with
   `?mode=listen` selecting audiobooks. Selecting an audiobook navigates through
   a normal page link to `/listen/[book]`, using its existing slug. Entering this
   media page starts a fresh document to isolate it from pending library actions;
   mode switching remains a client-side App Router transition. The player is no longer
   embedded in either library. The focused page retains cover/title, chapter and
   language selectors, play/pause, timeline, elapsed/duration, previous/next and
   exact reader links. A back link returns to the Listen library. It reuses the
   same chapter metadata, source resolution, player, saved progress and canonical
   server Premium guard; in-reader audio is preserved. Play stays disabled until
   account restoration finishes, preventing a click from being lost as the
   authenticated audio session replaces its initial signed-out render.
7. **Grammar structure/footer.** Both branches are visible immediately; there
   is no initial branch-choice screen. Removed the duplicate large header offset.
   The site shell now uses a viewport-height flex column with a growing main and
   naturally flowing footer. There is no absolute footer or spacer. Existing
   mobile footer visibility and Watch/Explore footer rules are preserved.
8. **Naḥw landing:** Word Type; Sentence Role; Case Endings; Revise Naḥw Rules.
   The phrase/clause and experimental entries are hidden from this landing page;
   their curriculum and underlying logic have not been deleted.
9. **Ṣarf landing:** Root Types; Context Ṣarf; Weak Verbs; Word Patterns; Revise
   the Ten Forms. Root Types exposes All Root Types, Three-Letter Roots and
   Four-Letter Roots through a selector over the existing reviewed root-
   identification questions. Ten Forms retains its
   existing reveal-and-recall flashcard interface.
10. **Correct-answer progression.** A shared hook schedules a single transition
    after 800 ms and cancels it when resetting or leaving. It covers reviewed
    foundation questions, completed label placements, verb-form questions, weak
    type identification, prepared contextual/pattern targets and retained
    relationship logic. A partial mapping never advances. Incorrect answers do
    not start the timer. Self-rated recall and reference screens retain their
    intentional manual actions.
11. **Learn.** `/learn` has exactly three main destinations, in order: Memory,
    Grammar, Word Search. It uses short descriptions and existing protected
    destination routes. Explore remains a separate primary destination.
12. **Standard navigation.** Mobile drawers show My Profile, Home, Explore,
    Watch, Read, Learn, Feedback and Support, with account controls retained.
    Individual learning tools are reached from Learn. Desktop Learn is a proper
    keyboard-accessible Next Link, replacing the previous clickable-text menu.
    Profile remains available through the account menu on desktop.
13. **Privileged navigation.** Admin and Reviewer/editor entries remain role
    controlled, including on Home. Admins/editors also retain the existing direct
    learning shortcuts. Navigation consumes the existing verified account-access
    provider, avoiding redundant role requests on every menu open/close; server
    permissions are unchanged.
14. **Floating mobile navigation.** Replaced Memory with Learn and a school icon.
    It navigates to `/learn`; the other four floating destinations are unchanged.
15. **Watch tabs.** Mobile tabs are Script, Vocab, Settings and Memory. Settings
    and Memory indices were adjusted so they still open the correct actions.
    Grammar curriculum and desktop transcript functionality remain available.
16. **Homepage hero.** Desktop minimum height is 520 px instead of 610 px, with
    slightly reduced vertical padding and a 46% background position. The mobile
    520 px minimum and mobile composition are unchanged.
17. **Premium marker.** A small diamond appears beside the account avatar only
    after the existing authenticated `account_has_premium` RPC confirms membership.
    The RPC already checks that callers request their own identity; no grants or
    schema were changed. This decorative read does not add a Next navigation
    action. The marker has the
    accessible name “AWM Plus member”, resets with identity, and refreshes on
    focus/access changes. It does not grant any permissions.
18. **Mobile Explore.** A compact 56 px switch row sits directly below the header.
    Its alternate-mode hint lasts 2.5 seconds and occupies the switch row, outside
    the player. The video aligns to the top of its frame; previously the
    bottom-aligned portrait frame left a visible top gap. Available-height
    calculations subtract the switch row once and retain the existing header
    and safe-area handling. For You also removes its extra mobile top padding.
19. **Mobile library controls.** Read, Listen and Filters sit in one responsive
    row below Library. Read and Listen use the same compact cover/title cards.
20. **Changed files:** listed below. Existing changes from the preceding request
    remain in the workspace and were not discarded.
21. **Database/schema:** none for this update. No book, chapter, transcript,
    audiobook, consent or entitlement records were changed for implementation.
    Browser writes use an isolated fixture backend; public production-preview
    inspection did not request private audio or submit signup data.
22. **Verification:** recorded below, including responsive Chrome checks and
    public catalogue screenshot review.
23. **Limits:** unmuted autoplay depends on the browser, user activation and
    video-owner permissions. Deterministic tests exercise the real hook against
    a controlled IFrame API contract; they cannot certify every externally
    hosted YouTube video/device. Native audiobook checks use real, seekable WAV
    playback. No live customer account was used. The earlier app launch still
    needs real store URLs and an announcement sender/provider; this task does
    not send announcements or deploy the website.

## Changed files in this refinement

- `app/components/home/AppLaunchSignup.tsx`
- `app/components/home/HomeDashboard.tsx`
- `app/components/SiteShell.tsx`
- `app/components/MobileBottomNav.tsx`
- `app/components/navbar/index.tsx`
- `app/components/navbar/MobileDrawer.tsx`
- `app/components/navbar/PremiumMemberMark.tsx`
- `app/components/navbar/NavigationAccess.test.tsx`
- `app/lib/navigation.ts`
- `app/lib/useYouTubePlayer.ts` and `useYouTubePlayer.test.tsx`
- `app/explore/ExploreViews.tsx`, `ExploreFeed.tsx`, `ForYouFeed.tsx`
- `app/books/BooksLibrary.tsx`, `LibraryBookCard.tsx`, `AudiobookPlayer.tsx`
  (player extracted from the preceding `ListenLibrary.tsx` implementation)
- `app/books/[book]/[chapter]/ChapterAudioPlayer.tsx` and its test
- `app/listen/[book]/page.tsx`
- `app/learn/page.tsx`
- `app/grammar/GrammarPage.tsx`, `WebsiteActivity.tsx`, `models.ts`
- `app/grammar/useCorrectAutoAdvance.ts` and its test
- `app/cartoons/[show]/[episode]/EpisodePage.tsx`
- `e2e/ui-polish.pw.ts`, `website-update.pw.ts`, `learning-update.pw.ts`
- `e2e/fixture-server.mjs`
- `docs/ui-polish-report.md` and the historical note in
  `docs/website-update-report.md`

## Verification results

- Full unit suite: **807 passed, 3 skipped**, 121 passing files.
- Production build: **passed**, including TypeScript and 171 generated pages.
- Changed-file ESLint, final TypeScript and whitespace checks: **passed**.
- Grammar browser regressions: **6 passed**, including Home → Learn → Grammar,
  weak-type auto-advance, hidden experimental entries, Word Type, Case Endings,
  Context Ṣarf and Word Patterns.
- Browser coverage includes all five widths (320, 390, 768, 1440 and 1920 px),
  four account roles, the dedicated route, Explore timers/autoplay/cleanup,
  mobile Watch tabs, card hover stability and correct-only Grammar progression.
  Final complete UI run: **16 passed** (1.9 minutes).
- Actual WAV playback: **6 passed**, covering all five widths and immediate
  playback after entering Listen, plus pause/seek, both language directions,
  chapter boundaries, reader links and cleanup.
- The final role rerun passed **4/4**. An earlier fixture-only failure was traced
  to missing CORS `content-profile` permission on the local RPC fixture; its
  allowlist now matches browser PostgREST requests. Production policy was unchanged.
- Real public production preview reviewed at **390 and 1440 px**: Learn, Read,
  Listen selection and the dedicated `/listen/dos` page, using existing covers
  and metadata. Private audio elements remained absent during this inspection.
- Browser tests use Next's supported Webpack development compiler because an
  intermittent Turbopack development font-module error prevented one fixture
  startup. The production build uses Turbopack and passed.

Screenshots are generated in Git-ignored `test-results/`. Responsive CTA,
Grammar, For You and dedicated Listen captures are produced by the UI tests.
Public catalogue previews use `live-polish-*` names. Browser runs regenerate
that directory.

## Screenshot examples

- [Mobile email CTA](../test-results/polish-cta-320.png)
- [Mobile Grammar](../test-results/polish-grammar-390.png)
- [Desktop Grammar](../test-results/polish-grammar-1440.png)
- [Mobile For You](../test-results/polish-for-you-390.png)
- [Desktop For You](../test-results/polish-for-you-1440.png)
- [Mobile dedicated Listen page](../test-results/polish-listen-390.png)
- [Desktop dedicated Listen page](../test-results/polish-listen-1440.png)
- [Public Learn preview](../test-results/live-polish-learn-1440.png)
- [Public mobile library](../test-results/live-polish-read-390.png)

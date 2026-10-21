# Website update verification

Historical report for the preceding update. The later UI refinements supersede
the word-hover, bubble, library-card and embedded Listen behaviour described
below; see [the current UI polish report](ui-polish-report.md).

Implementation is in the local repository. The two email-preference migrations
have also been applied to the connected ArabicWithM Supabase project. The website
has not been deployed by this task.

1. **Store badges:** replaced the handmade badges with official Apple and Google
   assets. Both occupy 168 × 52 px slots, with 48 px visible artwork height.
   Google's transparent padding is accounted for without cropping or stretching.
   Removed the fake QR/download links and labelled availability as coming soon.
2. **Guest signup:** a Server Action validates, trims and lowercases email,
   requires specific launch-email consent, rate-limits submissions and writes
   through the server-only service client. Errors are recoverable in the form.
3. **Account holders:** auth loading hides the form; authenticated visitors get
   an account-email opt-in button and an opt-out button, never an email field.
   The server resolves their verified session email rather than trusting input.
4. **Consent:** inspected signup, account code, schema and metadata keys; no
   existing email marketing consent was found. A single purpose-scoped
   `email_preferences` table serves guests and accounts. No accounts were enrolled
   automatically. Consent version/time are recorded. Guest duplicate submissions
   do not overwrite an account's stored preference or withdrawal.
5. **Explore styles:** both controls have identical base, hover and focus styles;
   only the active control gets the gold treatment and `aria-pressed=true`.
6. **Discovery hints:** desktop-only bubbles point to the opposite experience.
   They can be dismissed, disappear after 12 seconds and remember dismissal per
   view for the browser session. Only the active Explore slide gets the switcher.
7. **Meanings:** Arabic words are keyboard-focusable buttons; hover/focus/tap
   opens the actual JSON token gloss. Existing inline meanings remain available.
8. **Tashkīl:** one For You transcript settings dialog groups Tashkīl, inline
   meanings and English sentence options. Local preferences persist. The display
   helper removes vowel marks without changing source text, letters, hamza,
   punctuation, digits or word order. No stored transcript was edited.
9. **Library width:** retained the existing full-width page container and replaced
   fixed column counts with responsive, compact auto-filling desktop columns.
10. **Cards:** cover and two-line title below only. Removed description, tags,
    CEFR, chapter count, exclusive badge and Free/exclusive browsing filters.
    Difficulty, genre and audiobook availability filtering remain.
11. **Read / Listen:** `/books` defaults to Read; `/books?mode=listen` opens Listen.
    Next's native history integration switches mode without a document reload
    and supports browser Back/Forward. Filters stay in component state.
12. **Player:** the dedicated interface adds cover, book/chapter titles, language
    and chapter selectors, seek slider, elapsed/total time, play/pause, previous
    and next controls. It extends the existing `ChapterAudioPlayer`; there is no
    second audio engine. YouTube sources retain the existing embedded player.
13. **Data reuse:** uses `fetchChaptersForBookPublic`,
    `fetchPublishedAudioForBook`, `requestChapterAudioResult` and
    `saveAudioProgress`, backed by the existing chapter/audio/progress records.
    No content, audio sources, storage buckets or progress collections were copied.
14. **Premium:** audio source resolution still calls canonical
    `requireEntitlement('audiobooks')`. Free users get the existing Premium prompt;
    Premium and admin access rules are unchanged. Public metadata contains no
    private playback URLs.
15. **Navigation/cleanup:** previous/next move through chapters with published
    audio in the selected book and language; boundaries disable the controls.
    Changing language/chapter/book, changing account or leaving Listen unmounts
    the prior session. Native audio is paused and saved; pending source requests
    are invalidated. New language/chapter audio waits for an explicit Play action.
16. **Read chapter:** uses existing `bookReaderHref` with the exact book slug,
    chapter slug and selected language. Normal reading and in-reader audio remain.
17. **Mobile:** selected books become a compact horizontal selection row above
    the full-width player; controls have at least 44 px targets. Desktop uses a
    library/player split with a sticky player.
18. **Database:** applied `20261021153500_app_launch_email_preferences.sql` and
    `20261021154225_app_launch_account_index.sql`. Composite primary key prevents
    duplicate email/purpose pairs; the account foreign key is indexed. RLS is
    enabled and public/anon/authenticated table privileges are revoked. Only the
    service role accesses records through guarded Server Actions. Live SQL checks
    confirmed deduplication and denied public/account reads. Security advisors
    report the intentional server-only table as RLS enabled without public
    policies; existing unrelated advisories were not changed.
19. **Files:** see the file inventory below.
20. **Verification:** see the final results below. Browser checks use the actual
    Next application and server authorization against an isolated synthetic
    backend, with real seekable WAV playback in Chrome. They do not use live
    customer accounts or alter live book/audio content.
21. **Limitations:** real App Store/Google Play listing URLs do not exist in the
    project, so badges are clearly marked coming soon. This implements consent
    collection/persistence; no email provider, launch date or announcement sender
    is configured, and no announcement was sent. The fixture's YouTube ID is
    intentionally unavailable: transcript interactions and error fallback were
    verified; successful external YouTube playback was not certified by these
    browser tests. The existing in-memory limiter remains per application instance.

## File inventory

- `app/actions/appLaunch.ts` and `app/actions/appLaunch.test.ts`
- `app/components/home/AppDownloadSection.tsx`
- `app/components/home/AppLaunchSignup.tsx`
- `app/lib/appLaunch.ts`
- `app/lib/displayArabic.ts` and `app/lib/displayArabic.test.ts`
- `app/explore/ExploreViews.tsx`, `ExploreFeed.tsx` and `ForYouFeed.tsx`
- `app/books/page.tsx`, `BooksLibrary.tsx` and `ListenLibrary.tsx`
- `app/books/[book]/[chapter]/ChapterAudioPlayer.tsx`
- `app/lib/useYouTubePlayer.ts`
- `app/lib/supabase/database.types.ts`
- `public/store-badges/app-store.svg`, `google-play.png` and `README.md`
- `supabase/migrations/20261021153500_app_launch_email_preferences.sql`
- `supabase/migrations/20261021154225_app_launch_account_index.sql`
- `e2e/fixture-server.mjs` and `e2e/website-update.pw.ts`
- `docs/website-update-report.md`

## Final results

- Full Vitest suite: **801 passed; 3 skipped** across 120 passing test files.
- Focused player, consent, Arabic, audiobook and reader settings checks after
  player refinements: **48 passed** across 7 files.
- Production build: **passed**, including TypeScript and 170 generated pages.
- Changed TypeScript files: **ESLint passed**; `git diff --check` passed.
- Browser acceptance and existing audiobook upload/save regression checks:
  **15 passed** in the final combined run. CTA, Read and Listen were checked at
  320, 390, 768, 1440 and 1920 px; For You was also checked at 1024 px. Checks
  include both language-switch directions, paused old media elements, seek,
  play/pause, chapter boundaries, exact reader links and playback cleanup.
- Real public catalogue: additionally opened Read and Listen at 390 and 1440 px,
  selected existing audiobooks and visually inspected covers/layouts. No private
  audio was requested during that inspection.
- Final TypeScript check and whitespace check: **passed**.

Screenshots from the local preview are in `test-results/`, including
`live-read-1440.png`, `live-listen-390.png`, `app-cta-390.png`,
`for-you-1440.png` and the other responsive test captures. This directory is
ignored by Git and is regenerated by browser tests.

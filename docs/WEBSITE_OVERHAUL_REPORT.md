# Website overhaul verification

Implemented in the existing Next.js website; Supabase project `whbxgwucsoguqzpnpzjd`. No website publication, commit or push was performed.

1. **Premium source of truth:** `public.account_has_premium` calls `private.has_premium`: an active/trialing unexpired subscription OR an enabled manual grant OR existing administrator inclusion. Server Actions, profile status, admin directory and the audiobook Edge Function consume it. Browser state is display-only.
2. **Manual Premium:** verified administrators grant/revoke from Users with a reason. The grant and audit entry persist transactionally. The UI confirms success after the RPC returns, updates the selected user and refetches the directory. Active access without a billing account offers Continue learning.
3. **Paid/manual interaction:** grants never change Stripe/subscription records. Revoking a manual grant leaves eligible paid access intact; cancellation/expiry of paid access leaves an enabled manual grant intact.
4. **Memory:** `private.website_memory_starts` records a UUID start, owner, London calendar date and immutable queue. A per-account transaction lock atomically permits one free start/day. Cards do not consume starts. Sessions support up to 50 cards; Premium has unlimited starts. Retried IDs, existing-session resume and completed recap do not create starts. Existing latest snapshots and card reviews remain in use. Completed snapshots now survive refresh.
5. **Audiobooks:** server entitlements gate signed playback requests. The deployed `audiobook-library` Edge Function verifies the JWT identity and checks the canonical RPC. Current published storage audio uses a private bucket; clients cannot invoke the new service-only RPCs.
6. **Language:** selecting either language synchronously pauses owned audio/video, invalidates pending requests, clears the source and remounts the language-owned player. One media element remains; the other language requires an explicit Play action. Existing per-language progress remains separate.
7. **Books:** guests can browse catalogue metadata and receive sign-in when opening chapters. Signed-in free users read every chapter, including later chapters. Anonymous raw chapter SELECT is revoked. Existing Premium PDF policy is preserved. Explore, Watch and Word Search retain public access.
8. **Support:** deliberate Support / Arabic with M lines, unbroken second line and responsive sizes. It uses the exact homepage hero asset via a shared constant with a dark readability gradient. The checkout button has explicit readable white text.
9. **Explore/activity:** removed the public Search transcripts entry; administrative transcript tools remain. Removed only the redundant Current level activity tile; profile levels and achievements remain.
10. **Mobile spacing:** book, chapter and Support pages use shared 104px plus safe-area bottom clearance. Browser checks verify chapter navigation clears fixed navigation and book controls can be scrolled into view and tapped.
11. **Reader controls:** Reading view group background is transparent; individual buttons and active states remain. Computed browser style confirms removal of the group overlay.
12. **Trophies:** explicit Add/Remove controls, up to four earned highlights, server-side milestone validation before saving existing auth metadata. Empty selection remains empty after refresh. Profile identity changes remount account-scoped Premium display state.
13. **Reviews:** Flutter publishes into existing `public.book_reviews`, keyed by book/user UUID, with rating 1-5 and text up to 2000 characters. Older on-device drafts remain local until published. Website reuses the same record and own-row RLS for load/save/delete. Inline personal form only; no public averages, counts, review panels or review modal.
14. **Schema/RLS:** deployed migration `20261006222630_website_premium_sessions.sql` adds three private tables (grants, audit, session starts), service-only invoker RPCs, and updates the existing admin directory function. Private RLS/no client privileges intentionally deny all direct client access. Existing review policies and Hans Wehr/dictionary schemas are unchanged. The legacy mobile Memory completion RPC is retained.
15. **Files:** see the file list below. No package/dependency installation was needed.
16. **Verification:** production build, TypeScript and changed-file lint pass. Eleven Chrome browser scenarios pass, using normal app authorization with isolated synthetic Supabase records and real decodable audio. They cover persisted manual grants, native playback, both language stops, free/Premium Memory starts, refresh recaps, saved reviews, saved/empty trophy highlights, later chapters, responsive Support, mobile actions and transparent controls. Additional reruns verify active manual-access billing UI, unearned trophy controls and retained profile levels. Live Supabase transaction checks verify grants/revocation/paid preservation/session starts; live review RLS checks verify own CRUD and cross-account denial. All synthetic live data was rolled back. Broader Vitest run: 535 passes, 3 skips, one new mock-history assertion failure; its isolation fix was rerun successfully (4/4). Final policy checks pass 15/15; the focused run's other 79 tests pass. No unresolved product failure remains from those runs.
17. **Limits:** website changes are local and need the existing hosting publication workflow. No real Stripe charge or production user entitlement was changed. Chrome interactions use synthetic accounts/media; live database checks separately validate deployed SQL. Previously issued audio URLs remain usable until their existing two-hour expiry. Native browser autoplay restrictions can require the existing second explicit Play tap. No external/public audio source can provide private-storage revocation. Legacy mobile Memory behavior is intentionally unchanged by this website task.

## Deployment notes

The migration and audiobook Edge Function (version 5, JWT verification enabled) are already deployed. Website Server Actions require server-side Supabase service credentials, as before; never expose them to client components. Billing webhooks continue writing only subscription data. Manual access is maintained through the admin Users interface, not by editing billing status. Future quota changes should retain the atomic start ledger and idempotent IDs. Existing on-device decks/cards/reviews remain local.

## Validation artifacts

Logs and screenshots are under `docs/validation/website/`. The full-suite/focused-suite logs include the subsequently fixed mock-history assertion; policy/recap logs record its successful reruns. The profile-before-fix log also records an exact-text selector mismatch; final-layout.log verifies the actual complete level/progress label. One generated Next.js font-resolver error cleared on retry; the failure and successful final build logs are retained. Screenshots capture responsive Support and mobile book actions.

## Changed files

- `app/(admin)/admin/users/UsersDashboard.test.tsx`
- `app/(admin)/admin/users/UsersDashboard.tsx`
- `app/actions/bookReviews.ts`
- `app/actions/memory-errors.test.ts`
- `app/actions/memory-review.test.ts`
- `app/actions/memory.ts`
- `app/actions/premium.test.ts`
- `app/actions/premium.ts`
- `app/actions/profiles.ts`
- `app/actions/reviews.ts`
- `app/books/[book]/BookReadingCta.tsx`
- `app/books/[book]/BookReviewButton.tsx`
- `app/books/[book]/[chapter]/ChapterAudioPlayer.test.tsx`
- `app/books/[book]/[chapter]/ChapterAudioPlayer.tsx`
- `app/books/[book]/[chapter]/ChapterReader.tsx`
- `app/books/[book]/[chapter]/page.tsx`
- `app/books/[book]/page.tsx`
- `app/components/HomeHero.tsx`
- `app/components/PdfDownloadButton.tsx`
- `app/components/PremiumPrompt.tsx`
- `app/components/home/HomeDashboard.tsx`
- `app/explore/ExploreFeed.tsx`
- `app/globals.css`
- `app/lib/accountPremium.ts`
- `app/lib/achievementPreview.test.ts`
- `app/lib/achievements.ts`
- `app/lib/bookReaderSettings.ts`
- `app/lib/brand.ts`
- `app/lib/entitlements.test.ts`
- `app/lib/entitlements.ts`
- `app/lib/memory.test.ts`
- `app/lib/memory.ts`
- `app/lib/memorySession.ts`
- `app/lib/reviews.ts`
- `app/lib/supabase/database.types.ts`
- `app/lib/websitePremiumMigration.test.ts`
- `app/memory/MemoryPage.test.tsx`
- `app/memory/MemoryPage.tsx`
- `app/memory/page.tsx`
- `app/profile/AchievementCabinet.tsx`
- `app/profile/ProfileView.test.tsx`
- `app/support/page.tsx`
- `app/support/SupportForm.tsx`
- `e2e/fixture-server.mjs`
- `e2e/website-overhaul.pw.ts`
- `playwright.config.ts`
- `supabase/functions/audiobook-library/index.ts`
- `supabase/migrations/20261006222630_website_premium_sessions.sql`

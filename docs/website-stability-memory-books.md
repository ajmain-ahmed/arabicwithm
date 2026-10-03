# Website stability report - 4 October 2026

Changes are in the website working tree only. Nothing was staged, committed, pushed or deployed. No Flutter code, production records, database policies or live functions were changed.

## 1. Memory root causes

The website called `complete_memory_card` through the service client. The live canonical function requires an authenticated user subject matching `p_user_id`; a service JWT supplies no `auth.uid()`. Production logs show HTTP 400 / P0001 at the function's authorization guard. This explains the reported failure on **Knew it**. The database guard is correct and remains enforced.

A second defect rejected valid saved progress: the session schema capped XP at one point per card, while the canonical database function awards five for known and one for again. Independent queue/index/reveal/completion states also admitted stale or duplicate transitions.

## 2. Memory implementation

- Use the authenticated SSR cookie client for reviews; keep the service client out of this authenticated RPC path. Share the existing auth-client implementation in an internal server utility.
- Validate RPC responses and saved-session invariants with shared schemas. Accept the actual maximum earned XP.
- Use a reducer with selection, practice and complete phases, queue/index/reveal invariants, and explicit restart/advance transitions.
- Lock start/review interactions synchronously, keep one advance per completion ID, retain the card and ID on recoverable review failure, and reject stale progress responses or responses after unmount.
- Return serializable action results for review/persistence failures so the UI displays useful retry messages instead of a redacted Server Components exception.
- Keep the existing Didn't know/Knew it ratings, guest practice, source scope and fresh-deck New behavior. Empty queues and malformed or deleted sources return useful selection states. Database transport failures are not cached as missing content.

## 3. Practice transition

The source panel fades out, then collapses and leaves the layout; the practice panel moves upward through layout animation. Completion restores selection. New preserves scroll position while navigation is pending. Reduced-motion settings disable these animation durations. Component behavior is covered by tests; visual timing and responsive appearance still need a connected browser.

## 4. Add Book root cause

Production logs contain two POST `/rest/v1/books` failures with **PGRST204**, which indicates a schema-column mismatch, not a duplicate-book constraint failure. The response did not retain the exact missing column name. The previously identified missing `reading_time_minutes` column was repaired by the earlier transcript/admin migration, before this task. A current read through the real REST API successfully selects the complete book field set, including reading time.

The former action threw validation/database failures, which Next.js redacted in production. The form also depended on loosely validated input, and the list could overwrite a newly created book with an older asynchronous load. No conclusion is drawn that the user's submission was a duplicate.

## 5. Add Book implementation

Shared validation trims required title/slug, validates meaningful description, reading time, CEFR and cover crop, and handles nullable fields consistently. Admin authorization remains mandatory. Create/update return structured results containing the persisted ID or a safe validation/database message. The dialog stays open on failure and closes/refreshes only after success.

The list uses one catalogue snapshot, parallel chapter retrieval, and ignores stale loads. Cover upload ignores obsolete path/unmount completions, prevents duplicate uploads, and blocks save/delete while upload is pending. Local PostgreSQL-backed tests create a valid book, retrieve it and verify invalid constraints; component tests cover successful rendering/refresh and failure recovery. A real production book was not created because production-data changes are explicitly prohibited.

## 6. Other bugs fixed

- Explore passed Next Link as a function prop from a Server Component into a MUI Client Component, causing another production render exception. A dedicated client-side link component fixes that boundary; an AST regression test checks this pattern across the app. This defect came from the earlier pass and is corrected here.
- YouTube initial seek rounded fractional seconds, and same-video timestamp changes did not seek. Both now use the precise timestamp without recreating the player.
- Bookmark writes could reject without handling or complete in the wrong order. Writes are queued and isolated by account; the reader keeps local state and reports synchronization failure.
- Reading-position persistence now handles network rejection.
- Invalid Memory source UUIDs now produce a normal missing-source state before database access.

## 7. Changed files

- `app/(admin)/admin/books/BooksAdminPage.test.tsx`
- `app/(admin)/admin/books/page.tsx`
- `app/(admin)/admin/components/BookEditDialog.test.tsx`
- `app/(admin)/admin/components/BookEditDialog.tsx`
- `app/(admin)/admin/components/ImageUploadField.test.tsx`
- `app/(admin)/admin/components/ImageUploadField.tsx`
- `app/actions/admin-books.test.ts`
- `app/actions/admin.ts`
- `app/actions/auth.ts`
- `app/actions/memory-review.test.ts`
- `app/actions/memory.ts`
- `app/books/[book]/[chapter]/ChapterReader.tsx`
- `app/books/[book]/[chapter]/ReadingProgress.tsx`
- `app/explore/TranscriptSearchLink.tsx`
- `app/explore/page.tsx`
- `app/lib/actionResult.ts`
- `app/lib/bookBookmarkSync.test.ts`
- `app/lib/bookBookmarkSync.ts`
- `app/lib/bookInput.ts`
- `app/lib/memoryReviewMigration.test.ts`
- `app/lib/memorySession.test.ts`
- `app/lib/memorySession.ts`
- `app/lib/serverClientBoundary.test.ts`
- `app/lib/supabase/server.ts`
- `app/lib/useYouTubePlayer.test.tsx`
- `app/lib/useYouTubePlayer.ts`
- `app/memory/MemoryPage.test.tsx`
- `app/memory/MemoryPage.tsx`
- `docs/website-stability-memory-books.md`
- `supabase/migrations/20261003231524_memory_authenticated_review_integrity.sql`

## 8. Database migration

`supabase/migrations/20261003231524_memory_authenticated_review_integrity.sql` is **prepared but unapplied**. It preserves the canonical authenticated-user guard, XP awards, locking, idempotency and quota/session behavior; adds database-verified admin quota exemption and null rating/completion-ID validation; and preserves authenticated/service execution while denying public/anonymous execution.

The website's main authentication fix works with the current canonical function. The additional database admin exemption remains pending migration review/application: admins can still encounter the existing database daily cap until that migration is applied. No production migration or policy change occurred in this task.

## 9. Regression coverage

New/updated tests cover Memory reducer invariants, start/reveal/New, repeated and rapid reviews, final/empty cards, restart, stale responses, unmount and recoverable failures; authenticated canonical RPC behavior and local database idempotency/quota checks; saved XP; book validation/persistence/dialog/list races; obsolete uploads; bookmark ordering/account isolation; exact YouTube seeks; and Server/Client component boundaries.

Existing tests for transcripts, readers, authentication and shared utilities remain passing. No package or lockfile changes were required.

## 10. Validation

- Full Vitest suite: **71 files, 371 tests passed**.
- TypeScript: `npx tsc --noEmit` passed.
- ESLint: passed with no warnings.
- Formatting: new modules/tests formatted; no broad reformat of existing pages.
- Production build: passed after all code changes.
- Production preview HTTP audit: **190 unique route checks passed**, including all 19 shows, 113 episodes and 9 books, Explore/search, source scopes, public pages, protected redirects and missing routes. No unexpected render failures occurred in that audit.
- Production Server Action transport: three signed-out denial checks passed (Memory review, session persistence, Add Book), returning useful serializable failures rather than redacted exceptions. Their intentional authorization-denial logging is expected.
- Local PostgreSQL/PGlite regression tests passed for canonical Memory reviews and book persistence/constraints.
- `git diff --check` passed. Git contains only the unstaged modifications/new files listed above; no existing local changes were discarded.

## 11. Coverage and manual verification

| Area | Completed evidence | Remaining live/manual check |
| --- | --- | --- |
| Home, Watch, shows, episodes, navigation/search/filter URLs | Production route checks and existing tests | Browser navigation/back behavior and responsive layout |
| Video, transcripts and translations | Episode routes, existing transcript tests, precise player lifecycle tests | Actual YouTube playback, scrolling/follow-along, translation controls and browser console/network |
| Explore | Production render/search routes and component-boundary regression | Interactive search/filter controls |
| Library and readers | Book routes, chapter-language URLs, existing reader tests, bookmark/progress regressions | Signed-in Arabic/English reading, chapter navigation and reload/resume |
| Memory | Component/reducer/action/database tests, source routes and failure transport | Signed-in real review, reveal/New, refresh/resume, motion and mobile layout |
| Profile/settings/auth | Existing tests, public routes and protected redirects | Signed-in account/settings interactions |
| Admin/content/uploads/forms | Book action/database/dialog/list/upload tests and protected redirects | Signed-in valid book save/edit/delete, actual storage upload and other admin controls |

No browser surface was connected, so browser UI automation, developer-console inspection and signed-in end-to-end flows were unavailable. HTTP checks do not prove client-side interactivity; signed-out chapter responses do not prove authenticated reader rendering. Live review/book writes and real storage mutations were intentionally not performed under the production-data restriction. The local preview runs at http://127.0.0.1:3000; the deployed website has not received these working-tree fixes.

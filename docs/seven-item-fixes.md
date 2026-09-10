# Application fixes — 10 September 2026

## Changes

- **Watch covers:** `app/actions/cartoons.ts` now uses the shared record-based `app/api/covers/[kind]/[id]/route.ts`. It resolves stored object paths or full Storage URLs, refreshes signed links, and checks uploaded objects before a YouTube fallback. Only catalogue-record covers can be resolved; request parameters cannot supply arbitrary private object paths. Book and Memory covers also reuse the resolver. Cached catalogue keys were updated.
- **Memory:** `app/actions/memory.ts` returns structured load failures through `loadMemoryProgress`/`loadSavedMemorySession`, logs original database errors server-side, and handles null aggregate/session data. `app/memory/MemoryPage.tsx` displays those errors with retries. `page.tsx` logs source-load exceptions and shows a safe page error; `error.tsx` protects against unexpected render failures and displays a digest reference.
- **Book editing:** `app/(admin)/admin/books/page.tsx` opens the existing edit modal when a row is clicked. The separate expansion button still opens chapters. `BookEditDialog.tsx` populates author and other existing fields, preserves the stored cover when editing text, updates it after uploads, ignores stale fetches, and prevents saving a failed load. Existing `fetchBookForAdmin`, `createBook`, and `updateBook` actions enforce `guardAdmin()` before database access.
- **Mobile filters:** `app/components/content-grid/FilterSidebar.tsx` shows “Clear all” above active filters, clears all shared filter setters, and removes filter query parameters while preserving unrelated parameters and the hash. The existing Reset Filters action uses the same logic.
- **Feedback:** `/feedback` provides 1–5 stars and optional comments (maximum 2,000 characters). `app/actions/feedback.ts` validates input and uses the server-verified user ID. The database supplies the timestamp; a submission UUID makes retries idempotent. Sign-in is required, with an inline sign-in button. No test feedback was submitted to production.
- **Feature recommendations:** separate footer/mobile-menu links open `mailto:hello@arabicwithm.com?subject=Feature%20Recommendation`.
- **Dark footer:** `app/components/footer.tsx` overrides the wordmark gradient/text fill to white in dark mode.

## Database work still required

The connected database was checked with real read-only Supabase requests:

- `memory_reviews` and `memory_sessions`: `PGRST205` (missing relation).
- `memory_totals`: `PGRST202` (missing function).
- `books` exists but has no `author` column.
- `feedback`: `PGRST205` (missing relation).

Apply **`docs/platform-setup.sql` first**, then **`supabase/migrations/20260910120000_feedback_book_permissions.sql`** using the Supabase SQL Editor or an authenticated database migration connection. The latter adds author/feedback and revokes direct anonymous/authenticated catalogue mutations. Feedback has RLS enabled and no direct client grants; validated server actions write using the service role.

These migrations were validated against embedded PostgreSQL, but have **not** been applied to the connected project: no SQL connection is configured. Until then, Memory progress and feedback persistence cannot succeed, and author updates cannot be saved.

## Verification and limits

- Production build, TypeScript, lint, and regression tests passed during implementation. Tests cover Storage path/full/private URL resolution, absent catalogue records, Memory missing-schema/null/signed-out states, feedback authentication/input validation, and actual PostgreSQL feedback constraints/permissions.
- Local production `/memory` returned HTTP 200 without a digest and displayed the guest sign-in state in Chrome.
- Chrome: Watch uploaded covers loaded; desktop images measured 306×408 and mobile show images 112×149, all `object-fit: cover`. Mobile Clear all restored 101 episodes. Tablet 768px had no horizontal overflow. Desktop dark footer computed foreground was white. Guest `/admin/books` redirected home. No console errors appeared in these checks.
- The available old local server log contained a Navbar hydration trace, not the reported deployed Memory digest. The current production browser checks did not reproduce that hydration failure.
- The deployed Memory stack/digest and an authenticated admin session were not available. The verified missing-schema errors explain progress failures, but the exact deployed render exception is **not yet conclusively identified**. A server log/digest is still needed to correlate it. Authenticated persistence and admin save need final live verification after migration.
- My Profile remains removed/deferred as requested.

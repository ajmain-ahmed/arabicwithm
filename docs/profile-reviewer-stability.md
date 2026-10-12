# Profile and Reviewer stability update

## Admin recognition

The confirmed account is **xiggeth@gmail.com**. Its existing `account_roles` row and Auth application metadata already identify it as Admin. No email-specific rule or role promotion was added.

Previously, every `useAccountAccess` consumer owned a separate role request and local result. Remounting navigation, opening menus, changing the Auth user object and changing pages restarted those requests. A rejected request cleared the result; an unverified/loading state therefore appeared as “not Admin”. Supabase same-account `SIGNED_IN` events also refreshed the route unnecessarily.

`AccountAccessProvider`, mounted within the existing Auth provider above page layouts, now shares one identity-bound, server-verified role snapshot. Concurrent requests are deduplicated. Known roles remain visible during rechecks, with explicit checking/error/retry states. Sign-out clears the snapshot, account changes cannot reuse another account's permissions, and late responses are discarded. Token/session restoration triggers revalidation. Same-account profile updates do not restart role loading or refresh the route. No role is authorized from email or editable user metadata; server actions and protected layouts still verify Supabase identity and current database role independently.

## Review permissions and workflow

The only live pending suggestion belonged to the Admin account. The original review procedure rejected **all** self-review, and the UI disabled Admin Accept/Reject for their own suggestions. The original restriction concerned Editors, who have no review privilege at all; Admins already have canonical CMS write access.

Migration `20261002230036_admin_suggestion_review_permissions.sql` replaces that existing procedure, removing only the Admin self-review restriction. It retains the current database Admin check, authenticated server actor, service-only execution grants, row locks, pending-status checks, source-snapshot conflict detection and annotated Arabic-token validation. No tables or RLS policies were changed. Live verification confirmed `authenticated` and `anon` cannot execute the procedure while `service_role` can. Existing last-Admin protection remains unchanged. No production suggestions/content/users were altered for testing.

The primary actions are **Accept** and **Reject**. Successful mutations immediately reload the current list, show the result and revalidate Reviewer/Admin review routes. In-flight guards prevent duplicate submissions/reviews. CSV/PDF/source JSON functionality remains Admin-only and uses the existing scoped export endpoint.

## Profile and chapter controls

Reviewer Workspace now has ordinary profile-menu styling on desktop and mobile. Initial role lookup shows “Checking permissions”; failed lookup exposes retry rather than silently treating the account as a learner.

Profile-photo selection uses an accessible edit icon and tooltip. A valid new selection creates pending state and exposes **Adjust photo**; an existing saved photo alone never does. The existing circular cropper, profile-media storage and Auth avatar metadata remain in use. Saving, cancelling, removing or replacing a selection resets pending state and releases object URLs. Saving verifies the same account again before metadata persistence and prevents duplicate uploads.

One `ChapterNavigator` serves source review and suggestion management. **Dropdown View** and **Scroll View** share the same selected unit ID. Chapter labels use actual `chapter_number` values, including headings, options, suggestion labels and report exports. Switching view does not change the chapter. The chapter list has its own bounded scrolling area on small screens.

Equivalent export/download actions use `ReviewActionButton`, with shared height, radius, padding, typography, icons, border/hover/focus/disabled/loading states. Primary acceptance and destructive rejection retain distinct hierarchy.

## Navigation and scrolling repairs

The existing paginated source review and suggestions lists call `useContentPageTop`. It records a navigation request and scrolls once in a layout effect after the latest content has rendered/loaded. It finds a genuine scrollable ancestor; otherwise it scrolls the document, accounting for the fixed navbar. No timeout or second navigation system was introduced. Rapid requests coalesce, and view-mode changes alone do not scroll the page. The existing standalone headword editors are not paginated, so no artificial pagination was added there.

Two additional reproducible transition bugs were fixed:

- Chapter/episode editors reused a boolean cancellation flag. A new request reset the flag and allowed an older response to overwrite the new editor. Request revisions and active target identity now reject late results/reloads/errors after navigation or unmount; old content/edit dialogs are cleared on target changes.
- The shared error boundary retained its error state after navigation. Keying it by pathname lets a newly navigated page render normally while retaining genuine error reporting on the failing page.

Auth/session promises also have unmount cleanup and the email-link session promise has a visible console error path instead of an unhandled rejection.

## Verification and limits

Focused tests cover shared-role loading/retries, identity changes, stale responses, auth restoration and repeated same-account events; pending photo replacement/crop/save/cancel/removal; chapter view switching/number labels; Admin Accept/Reject and duplicate-action prevention; actual procedure/RLS behavior in PGlite; desktop/mobile-width scroll calculations, delayed results, repeated/rapid navigation and internal scroll panels; old editor requests and page-error recovery. Existing export tests generate actual CSV/PDF/JSON files and remain in the regression suite.

Results: all **54 test files / 276 tests passed**. Website lint, TypeScript checking and the production build passed. `scripts/check-review-pdf.py` verified the generated CSV and Arabic/mixed-text PDF artifacts, including a five-page report.

Authenticated browser sessions/passwords are unavailable in this environment. The existing account's stored Admin role and live procedure grants were verified, but actual password sign-in, physical/mobile browser scrolling, signed-in production clicks and browser-console walkthroughs cannot be claimed. Those require a signed-in desktop/mobile walkthrough.

Supabase's existing advisor findings outside this change remain: vocabulary statistics search-path configuration, the public `pg_trgm` extension, legacy callable definer functions and Auth leaked-password protection settings. Some no-policy RLS tables intentionally use service-only access. Changing those unrelated function/configuration contracts without auditing their callers would risk breaking vocabulary/Memory/auth flows. Follow-up references: [function search paths](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable), [definer execution](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [extension schema](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public), [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Files changed

- Auth/access: `app/AuthContext.tsx`, `app/AccountAccessContext.tsx`, `app/lib/useAccountAccess.ts`, related tests.
- Menus/layout: `app/components/navbar/{index,UserMenu,MobileDrawer}.tsx`, `app/components/SiteShell.tsx`, related tests.
- Profile: `app/profile/ProfileAvatar.tsx`, `ProfileAvatar.test.tsx`, `ProfileView.test.tsx`.
- Reviewer: `app/reviewer/{page,ReviewerWorkspace,SuggestionsList,ChapterNavigator,ReviewActionButton}.tsx`, `ReviewerWorkspace.test.tsx`.
- Server/data: `app/actions/reviews.ts`, `app/lib/{reviewLabels,reviewExportData,useContentPageTop}.ts`, scrolling and migration tests.
- Admin: `app/(admin)/admin/reviews/page.tsx`, `books/[chapterId]/page.tsx`, `episodes/[episodeId]/page.tsx`, `editorNavigation.test.tsx`.
- Database: `supabase/migrations/20261002230036_admin_suggestion_review_permissions.sql`.
- Documentation: this report and `docs/reviewer-exports.md`.

No Flutter/Dart files, dependencies or unrelated visual areas were changed.

# Website final overhaul verification

Implemented in the existing Next.js website on 7 October 2026. The Supabase migration is deployed to `whbxgwucsoguqzpnpzjd`; website code remains local. No commit, push or website publication was performed.

1. **Mobile Admin navigation.** Below the desktop breakpoint, one Admin menu opens all seven existing destinations vertically, plus Back to website. Targets are at least 48px high. Selecting closes the menu, and its maximum height accounts for the viewport and bottom safe area. Desktop destinations and layout remain in place.

2. **Username and uniqueness source.** The live schema inspection discovered the mobile app's existing `leaderboard_public_profiles.handle`, `leaderboard_public_profiles_handle_unique` index and authenticated `set_public_handle` RPC. The website reuses them. No extra username column or identifier table was added. Profile settings says Select a username, checks availability after a short debounce, trims whitespace, folds case, enforces the existing 3-24 character rule and reserved names, and handles save-time unique conflicts. Username routes resolve the same user and retain existing profile privacy checks. Existing UUID routes remain compatible; UUIDs are not shown as usernames.

3. **Admin user layout.** The main dialog shows name/email, Access Level, four compact checkboxes and Notes (optional). A top-right Information icon reveals joined, last sign-in, billing and review activity. Notes & History is collapsed initially. Mandatory UUID entry and reason controls were removed from this interface.

4. **Permission architecture.** User is the baseline for every registered account. The existing `account_roles.role` retains user/editor/admin editorial authority. Premium remains an independent grant or paid subscription, so both a free Editor and a Premium Editor are supported. Four UI controls expose capabilities, rather than requiring a mutually exclusive selector for Premium and editorial authority. Editors retain the existing review/propose-correction workflow; canonical content and user administration still require Admin.

5. **Admin inheritance.** `private.has_premium` includes Admin. Shared entitlement resolution marks Admin as both Editor and Premium, and reviewer guards already accept Admin. The UI checks inherited controls while Admin is selected. The database does not duplicate inherited grants. Final-Admin demotion remains protected by the existing serialized role-change lock.

6. **Paid/manual interaction.** Effective Premium is an eligible active/trialing unexpired subscription OR an enabled manual grant OR Admin inheritance. Revoking manual Premium preserves paid access. Role changes do not change billing. An active paid checkbox displays effective access and cannot cancel a subscription. No real Stripe charges or production account permissions were changed during verification.

7. **Optional notes.** Blank notes are accepted in Server Actions and database functions. Entered notes are trimmed and retained in the existing `access_change_audit` and `private.manual_premium_audit` architecture. `admin_set_account_access` saves the grant and role in one transaction. Notes entered without changing a capability also remain available in the collapsed history. Earlier history is preserved.

8. **Transcript root causes.** `manualTranscriptJson.ts` accepted only an object with `content[]`, required every item to use text/offset/duration, rejected token-block arrays, and discarded rich metadata. It imposed 1 MB, 5,000 segments and 10,000 characters per text/translation. The SRT/VTT helper duplicated count/text caps. The live `admin_import_youtube_transcript` repeated those restrictions; changing an error label alone would have left imports broken. The underlying indexer can process larger canonical arrays.

9. **Limits changed.** Removed per-segment 10,000-character and 5,000-segment/cue restrictions. Both normalized imports and the database use a 20 MB payload resource budget, with the existing 12-hour media timing boundary. The existing Next Server Action envelope is 51 MB. These are resource/timing guards, not sentence count limits. Backend validation messages are returned when actionable.

10. **Supported formats.** Legacy `content[]` with millisecond offset/duration; `sentences[]` with Arabic/English and start_ms/end_ms; `segments[]` with millisecond or second timing; native timed AWM token arrays and array wrappers under content, transcript or scriptBlocks; bilingual SRT/VTT through the existing server path. Arabic may come from text, arabic, original_text or Arabic tokens. Translation aliases are recognized. Start-only AWM blocks use the following timestamp for each boundary and an explicitly supplied video duration for the final block.

11. **Canonical flow and preserved data.** Server-side detection normalizes once into provider=manual/lang=ar/content. It validates Arabic, integer millisecond intervals, sentence/token bounds and field types; sorts chronologically; and atomically imports through the established RPC. Arabic/plain/gloss, token IDs/indices and timings, lexical metadata, sentence IDs/indices and translations persist in existing raw_transcript JSONB. Existing indexed segments/tokens continue serving search and playback. JSON export retains matching rich metadata while using the latest indexed English text. Large arrays are never rendered as thousands of editor controls. Importing state prevents duplicate submission. SRT English pairing now uses a timing map instead of repeatedly scanning every cue.

12. **Memory daily enforcement.** The existing `private.website_memory_starts` ledger, London calendar dates, per-user transaction lock and canonical Premium check allow one new free session/day and unlimited Premium sessions. Retried IDs, resumed sessions and completed recaps do not consume another start. Usage remains server-persisted.

13. **Session sizes.** Website choices are 5, 10, 15 and 20. The 50-card choice is removed. Initial selection is capped at 20. The existing parser/backend maximum of 50 remains so historical queues still resume and recap safely. These historical cards do not change the daily-session rule.

14. **Support hero.** Preserved the already implemented shared homepage image constant, background/overlay/gradient treatment and deliberate Support / Arabic with M heading lines. Browser verification covers 320px, 375px and desktop widths with no second-line clipping.

15. **Audiobook language changes.** Preserved the reader's synchronous stop event, invalidation of pending playback requests and language-owned player remount. Current audio/video stops before text switches, and the new language requires explicit Play. Chrome checks use actual decodable audio in both directions. Playback requests remain gated server-side by canonical Premium.

16. **Trophy removal cause and controls.** The prior Add/Remove actions changed temporary choices and depended on a separate Save click, so closing or refreshing lost the apparent removal. Compact labelled plus/minus icons now await persistence immediately, then update selection and preview. The minus control has a small red danger treatment. Busy state prevents competing writes; failed saves retain the previous confirmed state.

17. **Four earned highlights.** Attempting a fifth displays You can highlight up to 4 trophies. The server validates at most four unique IDs against earned milestones from current persisted learning activity. Unearned items have no add control. Existing auth profile display metadata stores highlights; empty arrays stay empty. Chrome verifies add, remove, empty selection, four-choice persistence and rejection of a fifth after refresh, plus a newly authenticated browser session restoring saved highlights.

18. **Explore.** The public Search transcripts entry remains absent. Admin transcript tools remain available. No new For You feed, extraction, ranking or public review display was added. Existing public Explore/Watch/Word Search access is preserved.

19. **Reader/mobile layout.** Preserved the shared 104px-plus-safe-area bottom clearance and transparent reading-view wrapper. Chrome verifies final chapter navigation clears fixed navigation, the PDF/review buttons remain balanced and tappable, and the controls have no group overlay. Only the redundant learning-activity level tile is removed; profile levels remain visible.

20. **Review investigation.** Mobile and website reuse `public.book_reviews`, with book/user linkage, rating 1-5 and review text up to 2,000 characters. Existing own-row SELECT/INSERT/UPDATE/DELETE policies include ownership checks. Leave a Review edits the user's existing personal record. Browser verification saves and restores it after reload. No duplicate table, public averages, counts or review-list/modal was introduced.

21. **Database/security.** Deployed `20261007154352_website_final_overhaul.sql` changes optional-note validation and existing role/Premium/import functions, and adds the service-only atomic access RPC. No new tables or username column. All access/import mutations reject client execution; server identity comes from verified cookies. Live transaction checks verify independent roles, notes, inherited Premium, revocation, existing handle persistence, duplicate rejection, 5,001 indexed segments, rich token retention and client denial. All synthetic records were rolled back. The security advisor comparison showed no new findings; existing unrelated findings were unchanged. Existing RLS boundaries are retained, following the [Supabase RLS guide](https://supabase.com/docs/guides/database/postgres/row-level-security).

22. **Changed files.** See the list below. The lint configuration now excludes generated browser-build/test artifacts so verification checks source code.

23. **Verification results.** Production build, TypeScript and lint pass. The final complete Vitest run passes **91 test files, 559 tests**, with two opt-in live files / three live audiobook tests skipped (562 tests total), in 274.67 seconds. Command: `npm test -- --run --maxWorkers=8 --testTimeout=15000`. All 16 distinct Chrome acceptance scenarios pass across the main run and targeted reruns, including fresh-login trophy persistence. Rich-export checks pass 22/22 and the separate reviewer run passes 11/11. Earlier verification exposed stale Memory auth mocks, browser selectors acting during redirects and two five-second UI timeouts while build/browser workers competed; the final run uses corrected mocks/selectors, completed-save waits and sufficient UI test time without concurrent build/browser work. Detailed results are in `docs/validation/website/final-overhaul-vitest-verified.log`, `final-overhaul-build.log`, `final-overhaul-lint.log`, `final-overhaul-final-lint.log`, `final-overhaul-persistence-rerun.log`, and the other targeted logs. Live transaction checks also passed the database cases described in item 21.

24. **Practical limitations.** Website changes need the existing hosting publication workflow. Untimed book text cannot become a timed video transcript without genuine start/end times; the importer explains this instead of fabricating timings. Start-only episode arrays need the final video duration. Rich token timings are retained in raw JSON and exports; this task does not add a new word-level playback UI. Already issued signed audio URLs retain their existing expiry. Browser tests use isolated synthetic accounts/media, while separate live checks validate the actual deployed database. Three opt-in live audiobook upload/source tests are skipped in the default suite; actual browser playback and deployed-database entitlement checks are covered separately. No real checkout or external-video privacy change was tested.

Changed source and test files:

- `app/(admin)/admin/components/AdminNav.tsx`
- `app/(admin)/admin/components/TranscriptJsonField.tsx`
- `app/(admin)/admin/transcripts/AdminTranscripts.test.tsx`
- `app/(admin)/admin/transcripts/AdminTranscripts.tsx`
- `app/(admin)/admin/users/UsersDashboard.test.tsx`
- `app/(admin)/admin/users/UsersDashboard.tsx`
- `app/AccountAccessContext.tsx`
- `app/actions/entitlements.ts`
- `app/actions/memory-errors.test.ts`
- `app/actions/profiles.test.ts`
- `app/actions/profiles.ts`
- `app/actions/reviews.ts`
- `app/actions/transcripts.test.ts`
- `app/actions/transcripts.ts`
- `app/components/PremiumPrompt.tsx`
- `app/lib/entitlements.test.ts`
- `app/lib/entitlements.ts`
- `app/lib/finalOverhaulMigration.test.ts`
- `app/lib/manualTranscriptJson.test.ts`
- `app/lib/manualTranscriptJson.ts`
- `app/lib/manualTranscripts.ts`
- `app/lib/supabase/database.types.ts`
- `app/lib/useAccountAccess.ts`
- `app/lib/username.test.ts`
- `app/lib/username.ts`
- `app/memory/MemoryPage.tsx`
- `app/profile/AchievementCabinet.tsx`
- `app/profile/ProfileView.test.tsx`
- `app/profile/ProfileView.tsx`
- `docs/WEBSITE_OVERHAUL_REPORT.md`
- `e2e/fixture-server.mjs`
- `e2e/website-overhaul.pw.ts`
- `eslint.config.mjs`
- `supabase/migrations/20261007154352_website_final_overhaul.sql`

Validation logs and refreshed mobile screenshots are in `docs/validation/website/`.

Follow-up format verification: the supplied bare array of `tokens`, `timestamp`, `translation`, and positive integer `paragraph` blocks is supported. All seven token fields, including uppercase CEFR, are retained. Paragraph grouping now survives normalization and JSON export. Start-only timestamps use the next block boundary and the supplied video duration for the last block. The focused importer/export suites pass 56 tests; TypeScript and targeted lint pass. Placeholder WORD_1/WORD_2 values must be replaced by Arabic text.

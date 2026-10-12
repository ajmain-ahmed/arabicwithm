# Inline chapter comments

The existing Reviewer Workspace now renders a comment field and **Comment** button inside each source-line card. The desktop field expands with the button beside it; narrow layouts stack them. The per-line source suggestion dialog and separate Arabic/English/reason inputs were removed from chapter review. Original translations, chapter selectors, numbering, pagination, My Suggestions and Admin review/export tools remain.

Each line owns an independent draft, loading/error and success state within the selected chapter. Drafts survive Next/Previous pagination. Successful submission clears only that line's input and shows subtle inline feedback without reloading source content or changing scroll position. Errors preserve the draft; a synchronous per-line request guard prevents duplicate clicks. Requests from a previous chapter cannot update the current chapter after navigation.

Clicking the already-selected chapter in Scroll View now leaves its source and drafts intact. Previously that click cleared the source, but the unchanged chapter ID could not trigger the loading effect again.

A final production check also reproduced Turbopack's `next/font/google queries have exactly one entry` error on the existing fixed-weight Jost URLs. Jost now uses Next's documented variable-font default instead of requesting five fixed-weight files. The font family, CSS variable and all existing requested weights remain available; no typeface or design was replaced. The subsequent production build passed.

Submissions reuse `submitSuggestion` and the existing `submit_content_suggestion` procedure, writing comment-only `content_suggestions` records with the verified reviewer, book/show, chapter/episode, zero-based line index, source snapshot and database timestamp. Corrections can be described in the comment. Existing structured suggestions and Admin Accept/Reject/reply/export workflows remain compatible. No database schema, role or RLS change was required for this follow-up.

Recent saved comments and Admin replies appear beneath their corresponding fields. `loadReviewerComments` enforces the existing My Suggestions ownership rule on the server for both Editors and Admins; it returns only the authenticated reviewer's comments from the selected content. Withdrawn and empty comments are excluded. History is bounded to the newest 1,000 records per chapter/episode. Admins continue to see the full authorized aggregation in their existing management area. Retrying comment history does not reload the chapter.

My Profile, Reviewer Workspace and Admin now use the exact same desktop menu item and text styles, including colors, padding and hover treatment. None uses route-dependent selection. Mobile navigation already uses one shared item layout.

## Changed files

- `app/reviewer/ReviewerWorkspace.tsx`: inline fields, per-line state, historical comments and removal of the unused source suggestion modal.
- `app/components/navbar/UserMenu.tsx`: identical account navigation styling.
- `app/actions/reviews.ts`, `app/lib/reviews.ts`: guarded history read and existing-record projection.
- `app/reviewer/ReviewerWorkspace.test.tsx`: inline success/error, duplicates, drafts across pages, historical replies and late chapter responses.
- `app/actions/reviews.test.ts`: history authorization and scope checks.
- `app/components/navbar/NavigationAccess.test.tsx`: identical account menu styling and existing Admin/Editor/User visibility checks.
- `app/lib/reviewMigration.test.ts`: comment-only persistence, identity/chapter/line/timestamp relationships, Admin review and unchanged canonical content.
- `app/lib/fonts.ts`: targeted Jost variable-font loading repair.

Authenticated browser and physical mobile walkthroughs require a signed-in browser session, which is unavailable here. Component tests exercise the interactive flows; this is not a claim of signed-in production browser verification.

The full website suite passed: **54 files / 280 tests**. Focused navigation/reviewer/server checks also passed. Lint, TypeScript and the production build passed. Database tests verify persisted comment-only records and Admin review without changing canonical content. The actual CSV/PDF export checks also passed.

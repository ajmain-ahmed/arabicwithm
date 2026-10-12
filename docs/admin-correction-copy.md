# Admin correction collection

Website-only feature in the existing book Reviewer Workspace and Admin review cards. No new database tables, migrations or RLS grants were introduced.

## Using it

Select **Books → Book → Chapter** in `/reviewer`. Admins see comments from all reviewers beneath their source-line cards. Each saved comment has a small copy icon on the right. **Copy All Corrections** collects the whole selected chapter, including comments on other pagination pages. **Select corrections** reveals checkboxes; selections survive Next/Previous navigation, and **Copy Selected (N)** copies those records. Changing chapter/book clears selection. Checkboxes are absent from the normal view.

Individual copy icons also appear on book comment cards in `/admin/reviews`, the Admin workspace's management tab and an Admin's My Suggestions list. The latter retains its existing own-record mode. Selecting a specific book/chapter in the management area exposes Copy All Corrections for that chapter. Bulk collection includes pending, accepted and rejected comments; withdrawn or empty comments are excluded, matching visible chapter history.

Copying shows a checkmark/“Copied” feedback for 1.8 seconds. Failed server or clipboard operations show a small inline error. No modal opens, source content reloads, database writes or book changes occur during copying. Existing commenting, editing, review and export flows remain in use.

## Data and permissions

`loadAdminBookCorrections` verifies the authenticated user and current database Admin role before every collection read, including every copy click. Editors and ordinary users are rejected before any database query. Editors retain the existing own-comment history and submission/edit permissions.

The collection projects existing `content_suggestions` fields: record ID, author, book/chapter IDs, line index, saved `original_arabic`, comment, timestamp, status and Admin response. It uses cursor batches until the query returns no rows, avoiding the API row limit and the UI's 25-line pagination. Selected IDs are validated and scoped to the same book/chapter; missing/withdrawn records raise an error rather than silently disappearing.

The pure formatter pairs each comment with its own saved original passage. It never scrapes rendered HTML or substitutes the current edited source. Output contains only Original/Suggestion text and sequential correction headings for bulk copies. Reading order is line index, creation time, then ID. Multiple comments and different source snapshots on the same line remain separate records. The current comment model stores whole-line snapshots, not selected text ranges; the formatter accepts a selected passage if such data becomes available without inventing one now.

Clipboard writes use verified structured data. The promise-based ClipboardItem path begins during the click gesture, while the server checks access; browsers with only writeText use that fallback. A failed authorization promise cannot yield clipboard text. This follows the [ClipboardItem API](https://developer.mozilla.org/en-US/docs/Web/API/ClipboardItem/ClipboardItem).

## Files

- `app/actions/reviews.ts`, `app/lib/reviews.ts`: Admin-only scoped collection read and existing-data projection.
- `app/lib/correctionClipboard.ts`: reading order, pure formatting and clipboard write helper.
- `app/reviewer/CorrectionCopyButton.tsx`: shared individual/bulk control, duplicate-click guard, brief feedback and cleanup.
- `app/reviewer/ReviewerWorkspace.tsx`: all-reviewer Admin history, collection toolbar and optional selection.
- `app/reviewer/SuggestionsList.tsx`: Admin review card copy controls and selected-chapter bulk action.
- Tests alongside the server actions, formatter/browser helper and Reviewer Workspace.

Verification includes exact Arabic/whitespace preservation, no copied metadata, source-version pairing, multiple comments per line, >1,000-record collection, reading order, Admin/Editor/User boundaries, revoked access, clipboard feedback/expiry, cross-page selection and existing inline comments. Live read-only Supabase verification confirmed the existing book-comment records and schema. Authenticated desktop/mobile browser and physical OS clipboard walkthroughs remain unavailable in this environment; browser APIs are covered by component mocks instead.

Results: the full website suite passed **56 files / 291 tests**; the final Reviewer Workspace check passed **11 tests**, including Admin copy access in My Suggestions. Lint, TypeScript and the production build passed.

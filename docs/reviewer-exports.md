# Reviewer amendment workflow

Open `/reviewer` from the profile menu. Editors and Admins can review Books or Shows and manage their own suggestions. Admins additionally have **Manage Suggestions & Exports**. The existing `/admin/reviews` page remains available.

In the Admin tab, choose Books → Book → optional Chapter, or Shows → Show → optional Episode. Choose a status and, optionally, an author/date range. The list and CSV/PDF exports use the same scope and filters. Exports include all matching pages, not just the 25 rows on screen. Source JSON uses the selected content scope and includes every chapter/episode when no individual unit is selected.

CSV contains original/proposed Arabic and English, line numbers (1-based), comments, reasons, public reviewer display names, status/date, responses and original token/block JSON. It uses UTF-8 with a BOM, RFC-style quoted cells, and spreadsheet formula neutralization. PDF provides a readable Arabic/English report with an embedded, openly licensed Amiri font and page numbers.

Source downloads use an explicit `awm-persisted-source-v1` envelope:

```json
{
  "format": "awm-persisted-source-v1",
  "version": "Current saved content; original upload formatting is not archived.",
  "content_type": "book",
  "book": { "all stored book metadata": "retained" },
  "chapters": [{ "all stored chapter fields": "retained", "content": [] }]
}
```

Shows use `show` and `episodes`; each episode retains its stored `transcript` unchanged. Individual-unit downloads contain one chapter/episode plus its parent metadata. JSONB stores parsed JSON rather than original whitespace/key formatting. No original-upload archive is available, so downloads deliberately represent the **current persisted version**. Unknown/custom fields, token annotations, paragraph/timestamp fields and legacy transcript objects are preserved. Chapters are ordered by `chapter_number`; episodes use descending `created_at` as in the existing public show catalogue, with IDs as deterministic tie-breakers. Suggestion reports group units in the same order, then by line and submission date. Internal IDs remain in source JSON because they map stored content; suggestion reports omit UUID noise.

Upload the source JSON and suggestion report together to ChatGPT. Compare suggestions against current source because a suggestion records the source as it existed when submitted. Re-upload corrected `content`/`transcript` arrays through the existing Chapter/Episode JSON editor; the envelope itself is not an import format. Existing approval actions still detect concurrent source changes before writing.

Examples: `Arabic-Reader_Chapter-03_suggestions.csv`, `Arabic-Reader_Chapter-03_suggestions.pdf`, `Arabic-Reader_Chapter-03_source.json`. Unicode titles are supported in download filenames.

## Authorization and schema

`/api/reviewer/export` verifies the authenticated account's current database Admin role before any privileged read. The underlying data-loading functions independently verify it as well. Editors, learners and signed-out callers receive HTTP 403. Responses are private/no-store. Existing role RPCs, RLS and service-only review RPC grants remain unchanged. No new tables, migrations or policies were required.

Application dependencies added are PDFKit (plus its development TypeScript types) and the small Unicode `bidi-js` library, which keeps mixed Arabic/English PDF text readable. The Amiri font and OFL license are bundled locally; downloads do not fetch fonts from third parties. Next file tracing explicitly includes the font for deployment.

## Verification

The suite generates actual CSV, source JSON and single/multiple-page Arabic PDFs into ignored `.next/review-export-qa/`. `python scripts/check-review-pdf.py` parses the CSV and PDF, checks page bounds, and renders a preview for inspection (local QA requires PyMuPDF). Tests also verify all-pages export, scope ownership, malformed-source errors, Admin/Editor/User endpoint restrictions, form submission and failed-query recovery. Existing database tests execute review/role procedures and RLS checks in PGlite without modifying production content.

The complete website suite passed: 50 files / 263 tests. Lint, `tsc --noEmit` and production build passed. The affected export tests were rerun after final Arabic/English shaping changes. A separate read-only live check compared single-unit JSON with actual persisted rows, downloaded full book/show scopes, and generated CSV/PDF from the existing real suggestion. Rendered Arabic, mixed Arabic/English, single-page and five-page reports were inspected. All live chapter/episode blocks satisfy the supported token/translation structure. No production users, suggestions or content were modified for verification.

Authenticated live desktop/mobile browser sessions were unavailable in the automation environment. Component interaction and desktop/mobile permission tests passed; a signed-in browser walkthrough remains the practical follow-up.

## Repairs and retained behavior

- Reviewer catalogue/source loading, empty and error states now distinguish pending reads from genuinely empty content; failed reads offer retry.
- Changing content clears an old suggestion dialog. Busy submissions cannot switch scope.
- Malformed persisted blocks report a useful source error instead of crashing the token renderer.
- Failed suggestion reads clear stale rows and never show a false successful empty state.
- Admins can accept/reject pending suggestions, including their own. Editors and learners remain unable to review suggestions. Source conflict and annotation validation still apply.
- Admin scope controls and exports are inside Reviewer Workspace; `/admin/reviews` reuses the same component and remains available.
- Tabs scroll on narrow screens; date fields and download actions stack on mobile.
- Home shortcuts, role-specific profile links, persistent avatar crop, Plus icon, Trophy Cabinet, consolidated progress and unchanged Learning Rhythm passed the existing regression checks. `/admin/users` and its role/subscription controls remain in the existing Admin area.

Current permissions: learners have no Admin or Reviewer entry/access; Editors can read reviewable content, submit suggestions and edit/withdraw their own pending suggestions; Admins additionally manage users/roles, review suggestions and export scoped suggestions/source JSON. Backend role persistence and last-Admin protection remain authoritative.

## Files changed

- `app/reviewer/ReviewerWorkspace.tsx`, `SuggestionsList.tsx`, `page.tsx`, `ReviewerWorkspace.test.tsx`
- `app/(admin)/admin/reviews/page.tsx`
- `app/actions/reviews.ts`, `reviews.test.ts`
- `app/api/reviewer/export/route.ts`
- `app/lib/reviewExportData.ts`, `reviewExports.ts`, `reviewExports.test.ts`, `reviewPdf.ts`, `reviewPdfText.ts`, `bidi-js.d.ts`
- `next.config.ts`, `package.json`, `package-lock.json`
- `public/fonts/review/Amiri-Regular.ttf`, `OFL.txt`
- `scripts/fetch-review-font.mjs`, `check-review-pdf.py`
- `docs/reviewer-exports.md`

No Flutter/Dart files were changed. No schema/RLS changes or unrelated redesigns were made.

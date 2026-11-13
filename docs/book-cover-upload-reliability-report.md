# Book cover upload reliability repair

Date: 13 November 2026. Implemented locally; not deployed. Baseline application commit: `1b845c1`. Production inspection was read-only. All upload/create/edit/failure tests used isolated synthetic accounts, books, and Storage endpoints.

## Diagnosis

### Reproduced before changing application code

1. Open Admin > Books > New book, choose a real portrait PNG **before entering Slug**. The browser receives the file, but `ImageUploadField` returns at `!path`, because the path is derived from the empty slug. No conversion, Storage request, preview, error, or selected-file feedback occurs. The baseline fixture recorded zero writes. Selecting an image silently fails at the client-to-upload transition.
2. Open the existing Test Book and replace its cover with a real PNG. The original implementation uploads with `upsert: true` to the same `books/test-book.webp` filename. A controlled HTTP 500 during responsive-variant storage makes the action fail **after the original object has already changed**. Before/after image bytes differed, and the fixture recorded exactly one successful write to the old source path. The book Save step was not reached in that failed attempt.
3. The server logged `Unable to save image variant: Synthetic storage failure` (production action digest `2430545851`). In the production-mode browser, the field displayed `Minified React error #441` instead of a useful upload error. Expected failure details were being thrown across the production Server Action boundary rather than returned as safe action-result data.

Both baseline reproduction checks passed against the original application code after the test selectors were aligned with the current Admin UI. The injected Storage failure represents a failed downstream upload, not a claim that production Storage returned that artificial message.

### Deployment and rendering findings

The book-cover action eagerly imported `syncImageVariants`, which imports native Sharp and performs server-side encoding after the primary upload. The deployed application runs on Cloudflare Workers. Workers cannot load Node-API addons such as Sharp; this is explicitly documented by [Vinext](https://github.com/cloudflare/vinext#cloudflare-workers). This incompatible dependency was removed from the book-cover action path. A unit test makes native processing unavailable and still successfully exercises book uploads. No live failing Worker request/log was captured; this runtime finding is based on the actual dependency graph and documented platform limitation.

The public cover resolver also assumed the source filename was always `books/{current-slug}.webp`. The cover proxy chose variants using that slug rather than a separately saved book-cover path. These assumptions needed to honor the persisted asset when adopting safe, immutable replacement names. Homepage My List also uses an unversioned `/api/covers/books/{id}` URL, whose old cache headers could retain a previous image.

### Live Storage and database evidence

Read-only inspection of project `whbxgwucsoguqzpnpzjd` found:

- `covers` exists and is already public; its bucket-level file-size and MIME restrictions are unset.
- Existing policies grant no ordinary client INSERT/UPDATE/DELETE access to `covers`. Application uploads use the existing Admin-guarded service client.
- Twenty book records existed, nineteen with a cover value. Recent existing book objects were WebP files in the same `books/` namespace.
- An anonymous HEAD request to an existing public book cover returned **200**, `image/webp`, and a 232,766-byte content length. Its gateway cache header was `private, no-cache`; this does not prevent anonymous reads.

No missing bucket or broken cover-write policy was found, and no policy change was needed. Production book records and assets were not modified.

## Fix

### Upload path and runtime

The canonical model stays the same: a public URL in `books.cover`, pointing to the existing `covers` bucket and flat `books/` namespace.

- Existing book uploads use the book ID as the request identifier. New-book uploads use a per-draft UUID, available before Slug is entered. A book is still created only when Save succeeds.
- The server adds a fresh UUID for every attempt: `books/{book-or-draft-id}--{asset-uuid}.webp`. Source filenames, spaces, apostrophes, Arabic characters, and uppercase extensions do not become Storage keys.
- The browser decodes once and prepares the WebP original plus the existing 640/1080 responsive variants. The book-cover action uploads those validated bytes; it does not load native Sharp.
- All new book assets use `upsert: false`. Variants are uploaded first and the source last. The URL is returned only after all three writes succeed. A partial failure can leave an unattached new asset, but cannot overwrite or remove the saved cover.
- The existing non-book image path keeps its prior processing behavior, loaded lazily. Audiobook upload/save functions were not changed.

Using a new object path also avoids overwriting cached images, consistent with [Supabase's upload guidance](https://supabase.com/docs/guides/storage/uploads/standard-uploads).

### Validation and bounded handling

- JPG/JPEG, PNG, and WebP are supported; other browser-decodable image formats retain the existing conversion route.
- The source must be nonempty and at most 20 MB; decoded images above 40 megapixels are rejected with a clear message. The converted original remains bounded to 1280 x 1280, preserving aspect ratio.
- Unsupported, empty, unreadable/corrupt, oversized, and failed-conversion images receive specific safe feedback before upload.
- Server validation retains Admin authorization, the fixed bucket allowlist, flat path checks, the 5 MB output bound, and WebP header checks. Both responsive files are checked before any book asset is written.
- The client bounds the whole operation to 45 seconds. Existing server fetches are bounded and do not automatically retry writes. A late result cannot update an aborted attempt or another book's form.

### Form state and persistence

The field immediately shows the selected filename and an upload state. Duplicate selection, Save, reset, and crop actions are disabled as appropriate during upload. Completion uses the actual uploaded URL for the preview, with a 4:5 book preview and `object-fit: contain`. Admin and public book-detail image-load failures have an explicit fallback/diagnostic rather than a broken-image icon. The public detail fallback also handles eager images that fail before hydration.

Successful upload says **Cover uploaded. Save this book to keep the change.** This distinguishes asset upload from a committed book update. Expected Storage failures return a safe typed result and display **We couldn't upload this cover. Please try again.** Technical error details stay in server/development logs.

The book metadata is changed only through the existing create/update action on Save. A failed upload leaves the old cover in form state; a failed book save leaves the database value unchanged and retains the staged replacement for retry. Existing book/chapter/audio/publication behavior is preserved. No old source or variant is deleted, even after success; this repair introduces no automatic old-object cleanup.

### URL resolution and replacement caching

`catalogueCoverUrl` now honors a trusted, saved public book-cover URL/path within the existing bucket rather than rebuilding its filename from the current slug. Existing canonical slug covers and existing private/external proxy behavior remain supported. There is no cover-URL text-entry field in the current Book editor; no URL-entry feature was removed.

The cover proxy selects a book variant from the actual saved path. Unversioned book proxy URLs used by My List revalidate with `public, no-cache, must-revalidate`; versioned URLs retain the existing cache treatment. Direct uploaded assets have immutable names, and metadata versions are stable rather than random on each render.

Trace: Admin preview uses the saved URL; public book mapping uses the shared resolver for catalogue/detail/listen views; homepage book cards use that mapped cover; homepage My List uses the corrected proxy. The current Admin Books table has metadata rows rather than cover thumbnails; re-opening its editor verifies the actual persisted preview.

## Verification

### Browser matrix

`npx playwright test --config playwright.book-cover-upload.config.ts`: **18 upload scenarios passed** in Chrome and Firefox. After adding the public image fallback, both fallback scenarios and two representative PNG upload scenarios passed in a targeted rerun: **4/4 passed**. Across these runs, all **20 distinct browser scenarios passed**.

- Each browser: JPG/JPEG, PNG, and WebP at 390px and 1440px. New covers are selected **before** entering the slug, saved, re-opened after browser reload, checked against the book record, and displayed on the anonymous public detail and Books catalogue pages.
- The 1440px cases use larger 3200 x 4000 real image files. Repeated filenames include spaces, an apostrophe, Arabic characters and uppercase extensions. Files with the same name have different contents across widths, and hashes of all previously uploaded objects remain unchanged.
- Existing-book replacement: Storage variant failure, readable error, retry, failed book save, successful save, reload/reopen, new public artwork, and unchanged old asset bytes.
- A chapter/audio metadata digest stays unchanged, and the saved publication flag is preserved.
- The My List cover proxy returns the exact new variant bytes and the revalidation header rather than the old asset.
- At 320px: invalid PDF, corrupt JPEG, and source above 20 MB fail without Storage writes; a timeout releases Save and permits retry. The preview fits, controls are accessible, and error text does not overflow.
- Non-service clients receive HTTP 403 for upload attempts; public asset reads succeed.
- A forced failed public detail image displays an accessible placeholder without overflow in both browsers. The fallback checks already-completed images on attachment, covering an eager SSR image that fails before hydration attaches its error handler. Unit coverage also verifies recovery when its URL changes.

A targeted rerun of the timeout case in both browsers additionally waits until the stalled request is recorded by the Storage fixture **before** advancing the client clock. This verifies a real pending network write, not merely a delayed image decode. The strengthened timeout rerun passed in both browsers: **2/2 passed** (`--grep "invalid files explain"`).

The first full matrix exposed test-only issues (a required-title label selector, a hidden responsive card, an unsynchronized simulated-save failure, and an undefined fixture completion flag). The final matrix used the current UI selectors, waited for the failed save response, and modeled the real non-null publication flag. Those were not additional application defects.

The 320px Admin preview was visually inspected. Test files are real encoded JPEG/PNG/WebP images, not arbitrary bytes labeled as images.

### Unit and build checks

- `npx vitest run --maxWorkers=4`: **204 test files passed**, 2 skipped; **1,418 tests passed**, 4 skipped. This includes existing book JSON, structured-reader, chapter, and audiobook regression coverage.
- Added coverage checks immutable names, no native processing in book uploads, safe downstream failure, missing variant data, duplicate filenames, Admin-only authorization, traversal rejection, client file validation, stalled-action recovery/retry/late results, stored-path resolution, proxy variant selection, and unversioned-book revalidation.
- Production Next.js builds succeeded in the isolated browser fixture.
- `npm run build:vinext`: passed for the current Cloudflare target. This was a local build, not a deployed Worker test.
- `npx next typegen` then `npx tsc --noEmit`: passed.
- Lint passed for new helpers, server/route changes, and tests/configuration. Two existing `react-hooks/set-state-in-effect` findings remain in the Book editor and shared upload field. Lint on the original HEAD versions reproduced the same findings; no additional rule category was introduced.
- `git diff --check`: passed.

## Security

The existing `guardAdmin()` still runs before validation or Storage access. Editors retain their existing lack of book-management permission; signed-out and ordinary accounts remain unauthorized. The service key stays server-side. Fixed bucket/path checks and output-size/header validation remain enforced.

The live bucket was already public; this task did not change its visibility. No grants, RLS policies, Storage policies, schemas, migrations, entitlement rules, or authentication roles were changed. No production upload was performed to test the fix. All write and negative-write scenarios ran against isolated fixtures; the live checks were SQL reads and an anonymous HEAD request only.

## Engineering

Files changed:

- `app/(admin)/admin/components/BookEditDialog.tsx`
- `app/(admin)/admin/components/ImageUploadField.tsx`
- `app/(admin)/admin/components/ImageUploadField.test.tsx`
- `app/books/[book]/page.tsx`
- `app/books/BookCoverImage.tsx`
- `app/books/BookCoverImage.test.tsx`
- `app/actions/storage.ts`
- `app/actions/book-cover-upload.test.ts`
- `app/lib/bookCoverUpload.ts`
- `app/lib/prepareCoverImage.ts`
- `app/lib/catalogueCoverUrl.ts`
- `app/lib/catalogueCoverUrl.test.ts`
- `app/api/covers/[kind]/[id]/route.ts`
- `app/api/covers/[kind]/[id]/route.test.ts`
- `e2e/fixture-server.mjs` (opt-in, isolated book-cover fixture)
- `e2e/book-cover-upload.pw.ts`
- `playwright.book-cover-upload.config.ts`
- This report.

No chapter JSON/schema/parser, structured renderer, audiobook metadata or playback implementation was edited. No new dependencies were installed.

**The original cause of the failed Book cover uploads was identified and fixed.** The application failures above were reproduced and repaired locally; live rollout remains pending deployment.

**Book covers now persist after save and browser refresh.** Verified in the isolated browser workflow for both create and edit.

**Replacing a cover does not remove the existing cover unless the new upload and Book update succeed.** This repair is stricter: it retains the old objects on both failure and success rather than deleting them automatically.

**Existing Books JSON, chapter rendering and audiobook behaviour were not changed.**

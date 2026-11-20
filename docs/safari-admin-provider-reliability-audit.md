# Safari, Admin and grammar provider reliability audit

20 November 2026. Changes are local; production data diagnosis was read-only. This is an incremental audit of the current checkout, building on [the learner reliability audit](full-website-reliability-audit.md). A fresh source inventory confirms **43 page routes, 9 handlers and 14 Admin page routes**. [Changed-file manifest](validation/safari-admin/changed-files.txt).

## Admin Books root cause and repair

The production Admin chapter metadata projection fails with PostgreSQL `42703`: `chapters.is_published` does not exist. `fetchBooksIndexForAdmin` loads Books and chapter metadata together, so this chapter failure prevents the entire Books screen from loading. Production contains **21 Books and 134 chapters**, not an empty catalogue. The compatible projection returns all 134 chapter rows.

`app/actions/admin.ts` now uses the existing `readChapterPublication` helper. It retries only the exact missing-publication-column error, omits that optional column on legacy deployments, retains pagination and Book scoping, and preserves failures for network/permission errors. Legacy publication presentation follows the existing `chapterPublished` policy. No source JSON or publication flags were changed. No migration is needed for this list-reader repair. Publication writes on an unmigrated schema are a separate capability and were not silently emulated.

The final Books browser check passed in **WebKit, Chrome, Firefox and Edge**: existing list, editor, create-dialog open/cancel, chapter expansion, preview, browser Back, chapter management, refresh and history. Cover creation/upload/persistence also passed in all four with isolated synthetic images and records. These are not live Admin-account checks. The preview test explicitly waits for the preview URL and heading before Back, and for the restored table before reopening its chapter panel; early test versions raced navigation and their failed reports are retained.

See [Admin route matrix](validation/safari-admin/admin-route-matrix.md) and [raw four-browser results](validation/safari-admin/browser-admin.json). A lifecycle smoke pass alone does not certify every mutation on that route. Initial Grammar dashboard fixture reads were incomplete; final verification must explicitly enable its enrichment fixtures.

## Canonical Admin authorization

The source of truth remains `account_role` through `getAuthenticatedAccess`, `isAdminUser` and `guardAdmin`. The Admin server layout denies non-Admins, and privileged actions enforce guards before storage access. Editors retain Reviewer permissions but do not acquire Admin. The worker API is separately service-authenticated through `transcript_worker_authorised`; it is not a client role override.

`useAccountAccess` now hides management capabilities while verification is pending or fails. Tests cover pending rechecks, failed rechecks, identity changes, and delayed responses. Existing server guards were retained.

The browser role matrix supplies a deliberately spoofed `user_metadata.role = admin` for signed-in fixture users and checks direct `/admin/books` access, plus mobile and desktop entries:

| Account | Observed UI in fixtures | Observed direct route behavior |
| --- | --- | --- |
| Signed out | HIDDEN | DENIED |
| Normal/free | HIDDEN | DENIED |
| AWM+ | HIDDEN | DENIED |
| Editor | HIDDEN | DENIED |
| Admin | VISIBLE | ALLOWED |

Actual per-browser results are retained in the browser artifact. Real authenticated production sessions were unavailable; fixture results must not be described as live account QA.

An attempt to inspect an existing signed-in desktop browser was stopped by the Computer Use runtime: browser URL policy enforcement is not supported for the current Windows browser. No site interaction occurred through that path. The connected browser host was also unavailable. This is a concrete limit on live account QA, not a failed Admin authorization result.

All **20 role/browser combinations passed** the direct-access and entry checks at mobile/desktop sizes. Pending/error role visibility and identity changes passed their unit regressions. This does not certify all privileged mutation controls through the browser; action guard tests supply additional server-boundary coverage.

## Grammar provider diagnosis

The adapter **exists** in `app/lib/contentEnrichment/provider.ts`. It is a server-only, authenticated HTTPS JSON endpoint contract, not a vendor model implementation. It reads **`CONTENT_ANALYSIS_URL` and `CONTENT_ANALYSIS_TOKEN`**. `service.ts` calls it from bounded enrichment chunks, validates exact source evidence, caches results, and writes candidates through existing RPCs. Public readers never call a model.

Both configuration variables are **absent locally**. Deployed Cloudflare secret presence is **UNVERIFIED**: neither Cloudflare API credentials nor an authenticated deployment session is available here. The diagnostic script prints presence booleans only, never secret values. The Admin warning originates from the server-side configuration check; it was not an RLS empty-result error.

| Provider acceptance field | Result |
| --- | --- |
| Provider implementation present | YES: generic server-only HTTP adapter; no backing model endpoint implemented in this repository |
| Provider configuration present locally | NO; no local OpenAI key is available either |
| Provider configuration present in deployed Cloudflare runtime | UNVERIFIED |
| Scheduled worker connected | NO in inspected deployed function; YES in repository source |
| Controlled real-provider analysis | BLOCKED |
| Isolated mock-provider pipeline and failure-isolation tests | PASS |

There is also a deployment mismatch: the deployed `transcript-library` Edge Function (version 30) contains existing OpenAI integration but **does not contain `AWM_ENRICHMENT_WORKER_URL` dispatch**, whereas repository source does. Its transcript cron is active once per minute. Therefore scheduled grammar-worker connection is **NO in the inspected deployed code**, **YES in repository source**, and model configuration remains blocked. Existing OpenAI integration does not make its secret available to the Cloudflare runtime or implement this separate grammar endpoint contract. No credential was copied or invented.

This is a combination of missing compatible-endpoint configuration and missing deployed worker dispatch (cases A/C), rather than evidence of an operational context provider whose warning should be hidden. The model service behind the generic endpoint has not been supplied.

Secure activation steps, for an authorized operator:

1. Supply an HTTPS analysis service that implements `provider.ts`'s `awm-grammar-v1` request and `notes` output schema, reusing the existing model service where appropriate. A raw vendor API URL is not contract-compatible.
2. In Cloudflare Dashboard → Workers & Pages → `arabicwithm` → Settings → Variables and Secrets, configure `CONTENT_ANALYSIS_URL` and encrypted `CONTENT_ANALYSIS_TOKEN`. Enter credentials only in the provider's secure secret UI, never in chat or source files.
3. Deploy the tested repository `transcript-library` function and set **`AWM_ENRICHMENT_WORKER_URL=https://arabicwithm.com/api/admin/content-enrichment/work`** in that function's Supabase secrets. Preserve its existing worker authentication token.
4. After deployment gates pass, perform one deliberately scoped Episode/transcript/chapter discovery, inspect candidates and provenance, then approve only reviewed evidence. Do not scan the historical corpus.

The Admin message now names the missing runtime configuration. Existing job counts, per-job failure information, Retry enrichment, and authored rule evidence remain visible. It does not claim the scheduled worker is connected or expose credentials.

The dedicated missing-provider diagnostics and authored-review availability check passed in all four browsers with the correct enrichment fixture enabled. The initial Admin lifecycle fixture omitted that RPC and was insufficient to certify the dashboard data; the route matrix preserves this distinction.

Controlled real-provider production analysis: **BLOCKED** by the absent compatible endpoint/credentials and deployed dispatcher. Isolated provider-contract and PGlite pipeline tests cover Episode/transcript/chapter candidates, preserved source text, provenance, deduplication, and provider-failure isolation. These are **mock-provider tests**, not a live model-quality acceptance test. No production job was queued or processed.

Production has **0 canonical Grammar Notes, 0 approved Notes and 0 enrichment jobs** at this inspection. Existing authored/practice evidence is separate and was preserved. Learner lists query `rule_cefr`, approved status and unmerged notes. A1–C2 routes support clean empty states; real populated level/detail acceptance remains blocked by absent stored content. Existing source text and terminology formatting were not redesigned.

| Level | Local reader verification | Real production note verification |
| --- | --- | --- |
| A1 | Approved fixture list/detail/examples PASS | BLOCKED: no stored notes |
| A2 | Clean empty state PASS | BLOCKED: no stored notes |
| B1 | Clean empty state PASS | BLOCKED: no stored notes |
| B2 | Clean empty state PASS | BLOCKED: no stored notes |
| C1 | Clean empty state PASS | BLOCKED: no stored notes |
| C2 | Clean empty state PASS | BLOCKED: no stored notes |

## Safari and browser findings

WebKit 26.6 was installed and executed as a real runtime, including touch-enabled learner checks. Windows Playwright WebKit is not physical macOS/iPhone/iPad Safari. Those physical browser targets remain **UNTESTED**.

Initial local WebKit learner suite: **7 passed, 6 failed**. All six connected flows reached their final assertions and screenshots, then failed the zero-page-error assertion. Network traces for equivalent Admin failures show `Load request cancelled` on interrupted document/action requests during navigation. WebKit reports some of these as access-control exceptions, including same-origin URLs. These were retained, not globally filtered or suppressed. This is insufficient evidence to claim a production RLS/CORS failure or a fixed Safari root cause. Strict zero-error WebKit certification is still outstanding.

Live public WebKit smoke was run at **320, 375, 390, 414, 430, 768, 1024 and 1440px**. Initial results passed six widths and retained two failures: a module-import exception at 430px and a missing-main timeout at 1440px. Targeted rechecks of 430/1440 passed without page errors or failed static assets. Intermittency remains a limitation, not a blanket Safari PASS. These checks include public routes, Episode Settings and browser Back/Forward/refresh; they do not prove authenticated Reader or Admin production behavior.

- [Initial production WebKit checks](validation/safari-admin/production-webkit.json)
- [Targeted rechecks with asset diagnostics](validation/safari-admin/production-webkit-recheck.json)
- [Initial local learner WebKit suite](validation/safari-admin/browser-webkit.json)
- [Provider runtime presence](validation/safari-admin/provider-runtime.json)
- [Read-only production data diagnostics](validation/safari-admin/database-readonly.json)
- [Deployed worker inspection](validation/safari-admin/deployed-worker.json)
- [Final Books controls, four browsers](validation/safari-admin/browser-admin-books-final.json)
- [Cover persistence and provider diagnostics](validation/safari-admin/browser-admin-followup.json) — eight passes; four early chapter-test timing failures were superseded by the final Books check.

Existing auth uses `browserAuthLock`, with a process-lock fallback when Web Locks are unavailable. Capability detection was retained. Server-only Node APIs were not moved into browser code. No Safari user-agent workaround, global cache disabling, warning suppression, or visual redesign was introduced. Cookies, URL state, fixed controls, viewport units and media fixtures were exercised by the learner suite; physical autoplay/fullscreen/audio behavior and older Safari versions remain unverified.

## Verification and deployment

<!-- FINAL-SAFARI-VERIFICATION -->
Full unit suite: **229 files passed, 4 skipped; 1,560 tests passed, 6 skipped**. Final compatibility/role regression check: **9 passed**. TypeScript, targeted ESLint and the Cloudflare production build passed. Raw failures are retained; a test that passes before asynchronous data arrives does not certify that data pipeline.

Initial four-browser Admin run: **74/84 passed**. Six WebKit lifecycle checks retained cancellation diagnostics; four cover checks failed an outdated assertion that disallowed the preview's cache-busting query parameter. Corrected cover persistence and provider diagnostics passed in all four browsers (eight checks); the final expanded Books editor/create/preview/chapter/history sequence separately passed in all four. Early chapter test versions raced route commits/restored table state; those failures are retained separately rather than counted as application repairs. All 20 canonical role/browser checks passed.

Fresh learner run: **43/45 passed**. Chrome **15/15**, Edge **15/15**, Firefox **13/15**. All **24 connected width/browser flows** passed across 320/375/390/414/430/768/1024/1440px, including pointer hit-testing, Grammar, Reader and Episode controls. The Firefox Admin failure expected an exact URL but the preview correctly added `?block=0`; the canonical-path assertion then passed **two repetitions**. The separate Firefox Profile→Library navigation wait failed **both follow-up repetitions**, despite explicit DOM readiness. It remains unresolved; neither application failure nor an automation-only cause has been conclusively established. Screenshots show the Library rendered while Playwright waits for navigation. This blocks a universal Firefox PASS.

| Browser | Current result |
| --- | --- |
| WebKit | BLOCKED strict zero-error acceptance; learner 7/13, six cancellation-diagnostic failures; dedicated Books, provider diagnostics, cover and role controls passed |
| Chrome | PASS current learner 15/15 and dedicated Admin checks; initial Grammar fixture limitation recorded |
| Firefox | BLOCKED overall by reproducible Profile→Library wait; 13/15 full run, Admin path follow-ups passed, dedicated Admin checks passed |
| Edge | PASS current learner 15/15 and dedicated Admin checks; initial Grammar fixture limitation recorded |
| Physical Safari macOS/iPhone/iPad and Android Chrome | UNTESTED; Windows runtimes/responsive viewports are not physical-device certification |

Evidence: [current learner cross-browser run](validation/safari-admin/browser-cross.json), [Firefox follow-ups](validation/safari-admin/browser-firefox-followup.json), [initial Admin run](validation/safari-admin/browser-admin-initial.json), [final Books checks](validation/safari-admin/browser-admin-books-final.json). A single clean cross-browser run is not claimed.

The unresolved Firefox navigation failure has a retained [trace archive](validation/safari-admin/firefox-navigation-trace.zip) and [error context](validation/safari-admin/firefox-navigation-error.md). WebKit cancellation observations are recorded [separately](validation/safari-admin/webkit-cancellation-evidence.json). No production code was changed to hide these errors. Final read-only counts remain 21 Books, 134 chapters, zero canonical notes and zero enrichment jobs.
<!-- END-FINAL-SAFARI-VERIFICATION -->

Application deployed: **NO**. Edge Function deployed: **NO**. Migration required for these repairs: **NO**. Production migration applied: **NO**. No Git push was performed (the repository has a production deployment workflow). Deployment is withheld while WebKit/Firefox acceptance remains incomplete; deployment credentials and live Admin sessions are also unavailable. Post-deployment public/Admin smoke is consequently **BLOCKED**, not PASS.

## Data safety

**DELETE statements executed against production content: NO**

**TRUNCATE statements executed: NO**

**DROP statements executed: NO**

**Books deleted: NO**

**Chapters deleted: NO**

**Shows deleted: NO**

**Episodes deleted: NO**

**Transcripts deleted: NO**

**Phrases deleted: NO**

**Grammar Notes deleted: NO**

**Existing production content replaced: NO**

No production enrichment/backfill, source recreation or subscription/user-data mutation was performed. Test uploads and pipeline fixtures are isolated from production.

Admin availability is limited to canonical Admin users in the repaired UI and server authorization. Non-Admins cannot obtain access through client-controlled metadata or manually entering Admin routes. Admin Books has an application-level compatibility repair and dedicated tests. The provider warning was diagnosed rather than hidden. Server-side discovery remains externally blocked; it is not claimed operational. WebKit, Chromium/Chrome, Firefox and Edge runtime results and remaining limitations are recorded above. Existing production content was preserved.

# Admin reliability audit

13 November 2026. Local implementation and isolated Chrome/Firefox testing. Production inspection used read-only SQL and GET requests. Production changes applied: **NO**. Deployment remains pending.

## 1. Admin route inventory

The inventory comes from the current `app/(admin)/admin/**/page.tsx` tree and `AdminNav.tsx`, including routes absent from the top menu.

1. `/admin` ? `/admin/shows`
2. `/admin/shows`
3. `/admin/episodes` ? `/admin/shows`
4. `/admin/episodes/[episodeId]`
5. `/admin/books`
6. `/admin/books/[chapterId]`
7. `/admin/featured`
8. `/admin/transcripts`
9. `/admin/users`
10. `/admin/reviews`
11. `/admin/hans-wehr`
12. `/admin/phrases`

Transcript groups, Ungrouped, Imports, Drafts, generation, enrichment and For You diagnostics are tools within `/admin/transcripts`. Chapter and bilingual audiobook dialogs live under Books. Shared supporting routes include `/transcripts/[id]?from=admin`, `/reviewer`, `/api/admin/audio-upload`, and `/api/reviewer/export`. There are no separate Admin Imports, Groups, Memory or Audiobooks page routes in this tree.

## 2. Featured diagnosis

The pre-repair action eagerly imported `imageVariants`, which imports native Sharp. The Featured Server Component and its client manager both depend on that action module. Making the native module unavailable reproduced an import failure **before any Featured data read or save**. This matches the deployment incompatibility documented by Vinext for Workers native addons. The controlled reproduction is distinct from a captured live authenticated Worker exception; a live failing Admin request was not available in this session.

Before application edits, the original browser CRUD suite ran against isolated Storage. Eight cases passed. Both save cases exposed a separate test-fixture defect: responsive-variant POSTs fell through to binary image responses, producing `Unable to save image variant: Unexpected token ... is not valid JSON`, digest `1012339234`. The fixture now stores and returns real variant bytes through its multipart contract.

The application repair removes native processing from Featured. The browser prepares 828/1600 WebP variants while retaining the original uploaded artwork. The server validates image headers, sizes, coordinates, Show identity and Admin permission, then stores new UUID-versioned assets. Existing AVIF variants remain supported. The canonical config is saved after all uploads succeed. Superseded formats are cleaned only after the config write. Failed uploads leave the previous config and artwork intact.

Expected save failures return safe action-result data. The dialog bounds preparation/save to 45 seconds and retains its inputs on failure. Focal positions, preview framing, links, swipe controls and the maximum of three selected Shows remain intact. Legacy and versioned filenames both resolve to the same Show. The existing deterministic three-London-day selection remains unchanged. The Admin description now says three days.

Featured CRUD and Homepage read-back passed in both browsers. Each browser also passed twenty direct loads with four position-save/reload/read-back cycles and zero unexpected page errors.

## 3. Other Admin issues found

| Area | Symptom and cause | Repair |
|---|---|---|
| Hans Wehr | Production partial-ID query used `ILIKE` on integer IDs. Read-only reproduction returned HTTP 404, PostgreSQL `42883`, `operator does not exist: integer ~~* unknown`. | Cache a paginated ID-only index, perform substring matching on numeric IDs, then query matching IDs in batches of 200 with existing word/definition filters and the 100-result cap. Admin authorization remains first. The full search has an eight-second data deadline. |
| Show/Episode cover uploads | The shared upload action still entered native Sharp after uploading the source. | Reuse browser-produced, server-validated WebP variants for these uploads. Book uploads retain immutable paths. Show/Episode canonical paths retain their existing model and use zero-age object caching. |
| Show, Book, Episode, Chapter record reads | Backend errors were returned as `null`, making outages look like missing records. | Throw on backend failure; retain the genuine PostgREST no-row case. Dialog read failures show safe messages. |
| Admin dialogs, detail pages, directory, search and diagnostics | Several browser Server Action reads had no client response deadline. | Reuse `boundedRead` for these read operations. Existing server `boundedFetch` deadlines remain in effect. Mutations receive no automatic replay. |
| Show/Episode dialogs | A slow response could populate a closed or subsequently opened editor. Save/close could also overlap artwork upload. | Ignore stale effect responses and disable conflicting Save/close/upload actions while work is active. |
| Chapter editor | Optional audio read failure rejected the combined chapter/audio load. | Load the chapter independently of settled audio results. Keep metadata available, warn clearly, and disable audio editing until reloaded. Saving metadata leaves unavailable audio untouched. |
| Phrases, Hans Wehr, detail pages, Users, Reviews | Failed reads could display raw errors or stale/empty results. | Use the existing AWM detour/Reload card for page failures. Omit contradictory empty results and clear failed directory results. Preserve genuine missing-record and valid-empty states. |
| Transcript diagnostics/generation | Diagnostic reads could wait indefinitely for an action response. | Bound enrichment and generation-status reads. Generation polling stops after 60 attempts with a clear status message. |

The Hans index read all **24,799 IDs in 26 requests in 2,224 ms**, within the eight-second deadline. A corrected numeric-ID production GET returned **HTTP 200** with three matches. No dictionary records changed.

## 4. Admin health matrix

`PASS` indicates tested current behavior. `FIXED` indicates a repaired behavior with regression checks. Redirects and read-only tools have no record mutation to persist.

| Route | Loads | Refresh | Main Action | Persistence | Error State | Chrome | Firefox |
|---|---|---|---|---|---|---|---|
| `/admin` | PASS | PASS | PASS ? redirect | PASS ? destination | PASS ? shared auth boundary | PASS | PASS |
| `/admin/shows` | PASS | PASS | FIXED ? edit/save, cover path | PASS | PASS | PASS | PASS |
| `/admin/episodes` | PASS | PASS | PASS ? redirect | PASS ? destination | PASS ? shared auth boundary | PASS | PASS |
| `/admin/episodes/[episodeId]` | PASS | PASS | FIXED ? metadata/read failures | PASS | FIXED | PASS | PASS |
| `/admin/books` | PASS | PASS | PASS ? create/edit/covers/audio | PASS | PASS | PASS | PASS |
| `/admin/books/[chapterId]` | PASS | PASS | FIXED ? read failures/token editor | PASS | FIXED | PASS | PASS |
| `/admin/featured` | FIXED | FIXED | FIXED ? artwork/position/save/delete | FIXED | PASS | PASS | PASS |
| `/admin/transcripts` | PASS | PASS | PASS ? import/edit/publish/groups/drafts | PASS | PASS | PASS | PASS |
| `/admin/users` | PASS | PASS | FIXED ? bounded reads/access save | PASS | FIXED | PASS | PASS |
| `/admin/reviews` | PASS | PASS | FIXED ? bounded reads/review decisions | PASS | FIXED | PASS | PASS |
| `/admin/hans-wehr` | PASS | PASS | FIXED ? partial ID/search | PASS ? read-only | FIXED | PASS | PASS |
| `/admin/phrases` | PASS | PASS | FIXED ? bounded load/inline edits | PASS | FIXED | PASS | PASS |

All matrix behaviors are now verified across the full suite and corrective reruns. The final authorization/recovery run passed 32/32 cases. The final persistence/audio/token rerun passed 12 cases, and the two enrichment cases passed after fixing the readiness race. Across these runs, all 146 distinct browser scenarios passed.

The optional enrichment controls were mounted before versioned transcript JSON finished loading. Opening them during that interval caused their keyed component to be replaced, collapsing the controls. They now mount only once JSON and its version are ready. Both browsers and all 37 transcript-editor unit tests verify the repair.

## 5. Auth / permissions

The existing server-verified `account_role`, `guardAdmin`, `guardReviewer` and Admin layout remain authoritative. Admin pages retain Admin-only access. Editors retain their existing reviewer capabilities without gaining Admin access. Ordinary and signed-out accounts are denied.

Auth and role outages must render the recovery experience while retaining the requested Admin URL. They must not become a false signed-out or non-Admin redirect. No role was changed in production. Synthetic role changes were exercised against the fixture only.

The production function inventory confirmed the transcript import/draft/group/origin functions, account-directory/access functions, review functions, For You diagnostics and `website_search_content_v1` are present. No replacement search RPC, migration, role policy or Storage grant was required.

## 6. Reliability

- Existing server fetches remain bounded to eight seconds. Canonical identity checks retain their own bounds.
- Browser read promises now use the shared 30-second deadline where missing.
- Featured preparation/save has a 45-second recovery limit. Other image uploads retain their existing 45-second bound.
- Reads may use the existing single transient retry. Destructive writes are not automatically replayed.
- Admin lists retain the existing session cache and mutation invalidation. Featured still invalidates `homepage-featured`, `/` and `/admin/featured`.
- The Hans ID index caches IDs for one hour; dictionary text is queried for current results.
- Failed pages use **This page took a little detour** and **Reload**. Valid empty lists and missing records remain distinct.
- Optional audio failure leaves chapter metadata usable and prevents editing unavailable audio state.

## 7. Browser results

The application ran in production-mode Next.js with isolated HTTP/Supabase/Auth/Storage fixtures. These are real Chrome and Firefox executions through the current UI, Server Actions and network contracts. Tests do not insert mock records into production.

The route suite discovered all twelve routes automatically and exercised direct loads, reloads, navigation away/history return, repeated visits and new tabs. Featured received twenty loads per browser plus saved focal-position readbacks. Responsive Admin checks cover 320, 390, 430, 1024 and 1440 pixels.

Action suites cover Featured CRUD and Homepage framing, Show/Episode metadata, Book JPG/PNG/WebP creates and replacements, failed cover preservation/retry/timeouts, bilingual audio URLs/uploads/playback/retry, manual transcript imports/publication/drafts, groups/Imports/membership, and the canonical English group plus its subtree. Additional targeted cases cover dictionary ID searches, directory access changes, review decisions, exports, auth outages, optional-audio outages and chapter token persistence.

Pre-existing browser tests needed current publication labels, expansion of Enrichment Details, portable fixture ports, a Node-compatible JSON import, and a Chromium-only CDP condition for throttling. The synthetic review fixture also used an invalid author ID; it now uses the existing reviewer UUID. These were test defects rather than production repairs.

Provider-backed generation was not submitted against production. The UI/status/read paths are tested through fixtures/unit coverage. No external generation or paid enrichment request was launched. The current Transcript Admin exposes JSON downloads; CSV/PDF exports belong to Reviews rather than a separate Transcript-list CSV button.

## 8. Engineering

- Full unit run: 1,449 passed, four skipped. Final record-error checks: 8/8 passed. Final transcript-editor checks: 37/37 passed.
- Browser checks: all 146 distinct scenarios passed across full and targeted runs, including both browsers.
- Next production fixture builds, Cloudflare build, TypeScript and diff whitespace checks passed. New helper/test lint had no errors; an unused test parameter warning was removed.
- Application files include Admin record reads, Featured actions/storage/manager, shared cover upload, Show/Episode/Book/Chapter dialogs, detail pages, Phrases/Hans/Users pages, Reviews shared renderer, transcript enrichment/generation reads, and the small Featured filename/Hans ID/browser image helpers.
- Test files include Featured/cover/record/Hans action regressions, chapter-audio tests, automatically discovered route smoke tests, recovery tests, and existing Featured/audio/transcript/English-group fixtures updated to current contracts.
- New report: `docs/admin-reliability-audit.md`. Existing token-case and homepage daily-rotation work remains separate and preserved.

No Book/transcript JSON schemas, acceptance validators, chapter renderer, AWM+ entitlement, AWM Kids rules or production records were modified by this audit. The preceding token-case and homepage-rotation work was already present in the workspace and was preserved.

Database migrations required: **NO**. Storage policy changes required: **NO**. Production changes applied: **NO**.


Admin Featured was reproduced, diagnosed and fixed rather than merely visually patched, using the controlled native-unavailable runtime reproduction described above.

Every current Admin page was tested in Chrome and Firefox.

No known Admin page remains stuck indefinitely on loading or blank output in the tested scenarios.

Main Admin actions were verified through persistence/read-back, not merely by checking that buttons render.

No production database, Storage policy or migration change was applied without explicit approval. No production changes were applied at all.

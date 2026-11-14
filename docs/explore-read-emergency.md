# Explore and Read visibility repair

## 1. Pre-fix production safety snapshot

Read-only checks against `whbxgwucsoguqzpnpzjd` confirmed the following before application changes.

| Content | Rows |
|---|---:|
| Books | 21 |
| Chapters | 134 |
| Shows | 24 |
| Episodes | 127 |
| Transcripts | 181 |
| Phrases | 6 |
| Transcript groups | 9 |
| Grammar Notes | 0 |

There are 18 completed Books, three incomplete Books, 179 ready transcripts, 178 public-readable transcripts, 180 feed-eligible transcripts and 68 Explore-published transcripts. The canonical English group `5b98c563-5c35-4696-98e1-06aa000eb622` exists.

The production schema has no `chapters.is_published` column. The proposed chapter-publication migration is still unapplied. This investigation applied no migration.

## 2. Read diagnosis

The canonical Read route is `/books`.

| Stage | Before | Corrected application |
|---|---:|---:|
| Database Book rows | 21 | 21 |
| Book query rows | 21 | 21 |
| Chapter metadata query | Missing-column failure | 134 legacy chapter rows |
| Released-Book chapter rows | Query prevented completion | 125 |
| Mapped Book loader results | Loader throws | 21 |
| Completed Book metadata | Loader throws | 18 |
| In-preparation Book metadata | Loader throws | 3 |
| Book props / unique rendered destinations | 0 | 21 |

**Root cause**. The deployed application assumes the chapter-publication migration exists. `fetchBooksForPublic` filters chapter counts with `is_published=true`. Production returns PostgreSQL missing-column error `42703`. The whole loader throws, so Read displays the existing AWM recovery state instead of its Book cards. Live Chrome and Firefox checks reproduced this recovery screen before the fix.

**Fix**. The new shared `readChapterPublication` helper retries without the chapter publication projection/filter only for the exact missing `is_published` column error. It retains the existing Book release gate. If the column exists, explicit publication filtering remains active. Permissions, network and unrelated query errors still propagate.

The compatibility boundary covers catalogue counts, Book details, teasers, chapter navigation, reader access, Explore Book queries and optional audiobook metadata. No whole-Book completeness rule or chapter-format filter was added. Existing catalogue behavior includes metadata for all 21 Books, with the existing released/preparation distinctions.

A related detail-page count query used `HEAD`, which strips the error response body. It now uses an exact count with at most one metadata row so the helper can recognize the specific missing-column error. This was verified through the real production detail loader and the controlled production-build regression fixture.

## 3. Explore diagnosis

The two routes retain their separate sources and behavior.

| Stage | Normal Explore | For You |
|---|---|---|
| Canonical source | Shows/Episodes and signed-in Book passages | Imported/YouTube transcript candidate RPC |
| Database inventory | 127 Episodes, 134 chapters | 181 transcripts |
| Initial eligibility | 125 Episodes with nonempty stored transcript | 179 ready, 178 public-readable, 68 Explore-published |
| Valid Episode metadata | 124 after parent/video-source validation | Existing candidate RPC handles clip eligibility |
| Signed-in Book sampler | 125 released-Book chapters sampled to 32 metadata entries | Separate pipeline |
| Hydrated first batch after correction | 12 items for guest and simulated signed-in loader calls | Real source/clip displayed in browser checks |
| Rendered normal Explore batch | 12 sections | Separate For You source stage |

**Root cause**. Signed-in normal Explore requests Book metadata/page counts in addition to Episode metadata. The same missing publication column rejects that Book branch and therefore rejects the whole feed batch. The client previously swallowed initial and pagination failures, which could disguise the error as empty content.

Guest normal Explore already rendered 12 video sections in the live pre-fix inspection. The mobile video design carries little visible text, so the DOM and actual feed sections were inspected directly. For You also returned real clips in live pre-fix Chrome and Firefox checks. Those working paths were retained.

**Fix**. Normal Explore's Book branch uses the shared publication compatibility boundary. Initial fetch failures now log context and use the branded AWM recovery state. Pagination failures retain existing items and show a retry control. Client reads have a timeout. The server first-batch fallback logs its failure before allowing the existing client retry.

No group memberships, AR/EN classification, Imports eligibility, publication state, transcript content or For You selection logic were changed. No `source_language` field was added. Normal Explore continues using its existing Episode/Book plan rather than changing to the For You transcript feed.

## 4. Auth / RLS

Read-only role checks produced the following counts.

| Database context | Books | Chapters | Episodes | Transcripts |
|---|---:|---:|---:|---:|
| Anon | 21 | 0 | 127 | 178 |
| Authenticated policy simulation | 21 | 125 | 127 | 178 |
| Privileged application query | 21 | 134 | 127 | 181 |

The authenticated SQL check used a transaction-local claim to exercise existing policies. It was not a login to a real production user's account. Actual application auth states were tested with isolated synthetic guest/free/premium/Admin accounts in the browser regression fixture. Real production content was separately verified through real loaders and guest browser access.

The chapter policy intentionally requires sign-in and a released parent Book. Public Book metadata remains available independently. Public content loading does not require Admin identity.

**Policy changes — NO.** RLS was neither disabled nor broadened. The English group and all existing policies remain in place.

## 5. Cache / rendering

**Cache issue found — NO confirmed stale-empty-cache root cause.** The proven failure is an invalid schema assumption. The Book catalogue/detail cache key was versioned for the repaired query. Global caching and existing revalidation remain enabled.

**Hydration issue found — NO confirmed server-items-to-empty reset.** Live guest Explore already contained 12 rendered sections. The repaired client boundary distinguishes request failure from a genuinely empty pool and keeps valid items visible after a pagination failure.

## 6. Files changed

Production application files changed in this task follow.

- `app/lib/chapterPublicationRead.ts`
- `app/lib/bookRelease.ts`
- `app/actions/books.ts`
- `app/actions/audiobooks.ts`
- `app/explore/ExploreFeed.tsx`
- `app/explore/page.tsx`

Verification files include `app/lib/chapterPublicationRead.test.ts`, `app/actions/publicVisibility.live.test.ts`, one fluent-query mock update in `app/actions/bookEntitlements.test.ts`, `e2e/public-visibility.pw.ts`, `playwright.public-visibility.config.ts`, and the isolated missing-column response in `e2e/fixture-server.mjs`. This report and `artifacts/public-visibility` contain the audit results. The Next dev server's automatic AGENTS.md rewrite was restored.

## 7. Database changes

The following statements describe production operations during this task.

**DELETE statements executed — NO**

**TRUNCATE statements executed — NO**

**DROP statements executed — NO**

**Production content overwritten — NO**

**Historical backfill started — NO**

**Production migration applied — NO**

Direct production SQL was read-only. Browser checks used existing public reads. Ordinary guest feed rate-limit accounting remains part of the existing application behavior. No content regeneration, import, reset, cleanup or replacement operation was performed.

## 8. Post-fix production integrity

| Content | Before | After application testing |
|---|---:|---:|
| Books | 21 | 21 |
| Chapters | 134 | 134 |
| Shows | 24 | 24 |
| Episodes | 127 | 127 |
| Transcripts | 181 | 181 |
| Phrases | 6 | 6 |
| Transcript groups | 9 | 9 |
| Grammar Notes | 0 | 0 |

No count decreased. The safety artifact records post-test full-row hashes. Books, chapters, Shows, Episodes and Phrases also match the earlier integrity hashes in this session. Full transcript row metadata changed during live site use, so full-row hash identity is not claimed for transcripts. This task executed no transcript mutation. [Safety snapshot](../artifacts/public-visibility/safety-snapshot.json).

## 9. Browser QA

- **Chrome and Firefox** passed all 48 controlled regression cases, covering guest, free, AWM+ and Admin states at 320, 390, 430, 768, 1024 and 1440px. Each case covers Read, refresh, normal Explore and For You with the publication column absent.
- **Real production data** passed all three routes at the same six widths in both browsers against the corrected local application. Read rendered 21 unique Book destinations, normal Explore rendered 12 items, and For You rendered a real source. External video requests were blocked for the deterministic visibility matrix, and playback itself was outside that matrix.
- Direct load and refresh were checked in the matrix. Chrome internal navigation and back/forward passed. Firefox real-data checks used fresh tabs to avoid its cached navigation waiter issue. A separate Firefox Read → existing Book detail check passed refresh, internal navigation, back and forward with a no-cache test context. The isolated browser cases cover all four auth states. Real production signed-in accounts were not used.
- The full unit suite passed **1,544 tests**, with six skipped. Focused entitlement/publication checks, TypeScript, targeted lint and the Cloudflare Worker build passed.

Real content counts and titles are recorded in `artifacts/public-visibility/loader-trace.json`. Chrome results, Firefox results and real-page screenshots are in the same directory.

## 10. Final confirmation

No existing Book, Chapter, Show, Episode, Transcript, Phrase, Grammar Note, or other production content was deleted or replaced by this task. The repair is in application queries and error rendering. Existing records supply all corrected results.

**Read is showing the existing Books again in the corrected local application using production data. Explore is showing existing eligible content in that application.** Live production restoration remains pending authenticated deployment and post-deployment checks.

The configured target is the existing **`arabicwithm` Cloudflare Worker**, serving `arabicwithm.com` and `www.arabicwithm.com`. The CI workflow uses `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` secret references. Secret values were not accessed or printed. No usable process/user/machine deployment environment variables or local CLI sessions were available. Wrangler 4.162.0 `whoami` and the installed `cf` CLI both reported unauthenticated. The production account ID therefore awaits verification after login.

Per the user's instruction, deployment is stopped before authentication. Run the following locally through Cloudflare's browser login flow, then have the account and existing Worker identity verified before deploying.

```powershell
npx --yes --package=wrangler@4 wrangler login
```

No new account, Worker, Pages project, duplicate target, token rotation or credential replacement was created. No destructive production action was taken.

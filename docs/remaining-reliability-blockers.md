# Remaining reliability blockers — implementation and release gate

20 November 2026. This continues the prior audit without repeating its inventory or rewriting the working Admin Books repair. No application or Edge Function deployment has been performed.

## Browser blockers

Firefox's Profile → Library failure was a Playwright 1.63 pending-document precheck, not an observed dead Library. The driver waited before resolving locators even though the committed route and Library DOM were present. The installed driver's `performActionPreChecks` has a `PLAYWRIGHT_SKIP_NAVIGATION_CHECK` switch. The suite sets it **only inside Firefox test workers** and replaces that coarse wait with explicit response, canonical pathname, document readiness, visible controls, real pointer hit-testing, Listen state and native Back/Forward assertions. It does not change Firefox, application routing, authorization or browser security policies. Three full role/history repetitions passed. HTTP 304 revalidation is accepted alongside 200; cached content must still render and respond correctly.

WebKit's six diagnostic families were abandoned requests during navigation, not six demonstrated application crashes. The observer retains every diagnostic and records:

- browser-confirmed `requestfailed` cancellation and the exact URL;
- caller AbortSignal cancellation, including pre-dispatch prefetches;
- page-departure time and the actual fetch URLs from the old context;
- adjacent navigation and the final user-flow result;
- non-cancellation network failures and HTTP failures, which cannot be excused by cancellation matching.

Only WebKit's specific access-control diagnostic can be classified as expected, and only with matching cancellation/departure evidence. Page departures must coincide within 100ms; the related navigation must be within two seconds. Next's `_rsc` cache-busting nonce is ignored when comparing the same resource; semantic query parameters remain significant. An old nonce in a WebKit diagnostic caused one intermediate full-run failure; the complete WebKit project was rerun after that correction. No production error listener, console filter, forced click or global error suppression was added. Original fetch errors are rethrown unchanged by instrumentation.

| Request family | Cancelling navigation | Interpretation |
| --- | --- | --- |
| `/grammar/context?_rsc=…` | Note/level navigation and a direct load of another level | Abandoned RSC prefetch; WebKit can report an obsolete cache nonce |
| Episode route/action request | Episode → Memory and history traversal | Old Episode context abandoned after destination commit |
| Chapter 1 route/action request | Next Chapter | Old reader context/body abandoned |
| Chapter 6 route/action request | All Chapters | Old chapter request abandoned |
| Supabase `/auth/v1/user` | Reader/history navigation | Old client session probe abandoned; destination independently restores/verifies access |
| Structured chapter RSC/action URLs | Back/Forward and refresh | Superseded reader request; new reader rendering and controls verified |

These cancellations are expected browser behavior when leaving a page. The tests demonstrate completion of the new user-facing flow; they do not claim certification of physical macOS/iPhone Safari or every in-flight mutation. Each final diagnostic's exact URL, navigation and classification is exported in the evidence directory. Unmatched errors still fail the suite. The matcher regression rejects different chapters, different activities and arbitrary JavaScript errors.

<!-- FINAL-BROWSER-GATE -->
| Browser/runtime | Complete learner suite | Result |
| --- | --- | --- |
| WebKit | 15/15 | PASS |
| Chromium / installed Chrome | 15/15 | PASS |
| Firefox | 15/15 | PASS |
| Installed Edge | 15/15 | PASS |

All four complete browser projects pass, including connected controls at 320/375/390/414/430/768/1024/1440px. This gate uses the initial complete Chrome/Firefox/Edge projects plus a **complete 15-case WebKit rerun**, not cherry-picked individual cases. The first full process was 59/60 before the last cache-nonce correction; it is retained and is not described as one clean 60/60 process.

[Validated gate](validation/remaining-blockers/browser-gate.json), [initial raw full run](validation/remaining-blockers/browser-initial-full.json), [entire final WebKit project](validation/remaining-blockers/browser-webkit-final.json), [three Firefox repetitions](validation/remaining-blockers/firefox-repetitions.json), [request-by-request cancellation classifications](validation/remaining-blockers/webkit-request-classifications.json).

Verification: **1,564 unit tests passed, 6 skipped**, across 230 passing and four skipped files; the subsequently added URL-matcher regression also passed separately. The three-source service tests passed after timestamp assertions were added. Final TypeScript, targeted ESLint, Deno entrypoint checking and Cloudflare production build passed.
<!-- END-FINAL-BROWSER-GATE -->

## Admin preservation

`app/actions/admin.ts`, `getAuthenticatedAccess`, `isAdminUser`, `guardAdmin` and the role visibility helper were not rewritten in this continuation. The exact missing-`chapters.is_published` compatibility fallback remains. The preceding four-browser Books and 20 role/browser checks remain applicable; the final learner gate additionally checks anonymous denial and Admin access to every actual Admin route.

| Canonical role | Admin entry | Direct Admin route |
| --- | --- | --- |
| Signed out | HIDDEN | DENIED |
| Normal/free | HIDDEN | DENIED |
| AWM+ | HIDDEN | DENIED |
| Editor | HIDDEN | DENIED |
| Admin | VISIBLE | ALLOWED |

Client metadata cannot grant Admin access. The new analysis endpoint uses a separate authenticated server-service credential, not a new user role or client-side Admin flag.

## Real server-side provider service

`supabase/functions/transcript-library/grammar-analysis.ts` implements **POST `/functions/v1/transcript-library/grammar-analysis`** and accepts the existing **`awm-grammar-v1`** contract. It runs in the existing transcript Edge Function, reusing its server-side `OPENAI_API_KEY` secret. No raw vendor API URL is configured as `CONTENT_ANALYSIS_URL`.

The service authenticates `Authorization: Bearer CONTENT_ANALYSIS_TOKEN` using digest comparison before a model call. It bounds request bytes, source units, response bytes and deadlines; rejects redirects; calls OpenAI's Responses API with strict JSON schema and `store:false`; validates candidate fields, CEFR, category and exact source highlights. The existing worker then validates again, consolidates canonical rule keys, attaches authoritative provenance and writes candidates through the existing durable RPCs. Neither the service nor the model writes source content. This is implemented code, not hard-coded production grammar output.

The model prompt addresses the learner directly using explanation/mechanics/recognition/example/advanced-note fields, retains advanced Naḥw/Ṣarf/contextual analysis, and requires English terms immediately followed by Arabic in normal brackets without transliteration. Existing `grammarTerminology` processing and the learner renderer are retained. Semantic accuracy still requires a real-model controlled review; schema validation alone is not a quality guarantee.

Provider requests are bounded at 55 seconds, the model call at 45 seconds, within the existing 90-second durable lease. No automatic model replay or historical scan was added. The source-save path remains independent of provider success. Provider contract, authentication, invalid evidence, model failure and durable pipeline tests passed. Implementation follows [OpenAI's structured-output contract](https://developers.openai.com/api/docs/guides/structured-outputs).

Admin Grammar Notes now shows configured YES/NO, authenticated analysis-service connectivity YES/NO, pending/failed jobs and last error, alongside existing Retry controls. The missing-config warning disappears from real configuration rather than being hard-coded away. Scheduled-worker connectivity is NO while analysis is unconfigured and UNVERIFIED when it cannot yet be established; no fabricated YES is presented. Authored evidence remains available.

## Controlled grammar pipeline

The isolated test uses the real HTTP adapter, new service handler, existing durable jobs/cache/writer and Admin candidate review read. **Only the vendor model response is stubbed.** It starts with exactly one Episode, one imported standalone transcript and one Book chapter in a fresh in-memory database.

| Source | Isolated result | Example timestamp | Production real-model result |
| --- | --- | --- | --- |
| Episode | PASS, one linked example | Original `00:12` | BLOCKED |
| Imported transcript | PASS, one linked example | Original `00:14` | BLOCKED |
| Book chapter | PASS, one linked example | `null`, not invented | BLOCKED |

Those three grammar jobs (plus the pipeline's normal phrase jobs) yield **one consolidated C1 candidate and three grammar examples**, with one cached model response. All three source JSON hashes remain unchanged. Provenance identifies the correct source IDs/types; candidate status remains candidate, and the note appears in Admin review. No production note was generated or approved, and the fixture is not evidence of live model quality.

The proposed real three-source scope and read-only source fingerprints are recorded in [controlled-production-scope.json](validation/remaining-blockers/controlled-production-scope.json). It has **not** been queued or processed. No broad scan endpoint is used. Before execution, recheck source fingerprints and queue state, process only this scope, inspect actual model quality and provenance in Admin, and approve only reviewed evidence. Approved production-backed Grammar in Context verification remains **BLOCKED** until that real run and review exist. Frontend queries continue to use `rule_cefr` and approved/unmerged filtering.

## Exact deployment and configuration handoff

The tested Edge entrypoint retains the repository's existing `AWM_ENRICHMENT_WORKER_URL` dispatch and existing `x-transcript-worker` authentication. The deployed older function has not been changed by this task. Deno 2.9.6 type-checking of `index.ts` passed. The application production build passed; final TypeScript and lint passed.

**External blocker:** no local Cloudflare deployment token/account ID, analysis endpoint/token, or OpenAI key is available. Deployed secret values were not requested, read or printed. Read access through the Supabase connector does not establish CLI deployment authorization. No project, API credential or replacement worker token was created. A real-model controlled test and production-backed approval cannot be claimed complete under this configuration, so release and post-deployment smoke are withheld.

An authorized operator must first provide existing-account access and protected runtime configuration. Real-model quality can be checked with an authorized private/local invocation of the new service handler and an isolated durable pipeline before promotion; the stubbed vendor response in the unit test must never be used to claim that quality gate. The deployment command below is **withheld** until that real gate is satisfied:

1. Authenticate the existing Supabase account interactively with `npx --yes supabase@3.2.0 login`. Do not pass a token on the command line or into chat. This command has not been executed here.
2. In Supabase Edge Function secrets, preserve the existing worker authentication secret and existing `OPENAI_API_KEY`. Add `CONTENT_ANALYSIS_TOKEN` from a protected secret manager, and set `AWM_ENRICHMENT_WORKER_URL=https://arabicwithm.com/api/admin/content-enrichment/work`. Optional `CONTENT_ANALYSIS_MODEL` selects the existing OpenAI model; default is `gpt-4.1`.
3. In the existing Cloudflare `arabicwithm` Worker's secrets, set `CONTENT_ANALYSIS_URL=https://whbxgwucsoguqzpnpzjd.supabase.co/functions/v1/transcript-library/grammar-analysis` and the identical protected `CONTENT_ANALYSIS_TOKEN`. The OpenAI credential stays in Supabase, not in the browser or Cloudflare client bundle.
4. Deploy only the named existing function with the inspected CLI command below. `--no-verify-jwt` preserves the function's existing custom authentication architecture; the new analysis route still requires its own bearer credential. No prune/migration/reset command is involved.

```powershell
npx --yes supabase@3.2.0 functions deploy transcript-library --remote=whbxgwucsoguqzpnpzjd --use-api --no-verify-jwt --import-map supabase/functions/transcript-library/deno.json
```

Secrets can alternatively be loaded from a protected file outside the repository using the inspected `supabase@3.2.0 secrets set --env-file <protected-file> --remote=whbxgwucsoguqzpnpzjd` command. Do not print the file or use inline values/history. Secret setup guidance: [Supabase](https://supabase.com/docs/guides/functions/secrets), [Cloudflare](https://developers.cloudflare.com/workers/configuration/secrets/).

5. Use the existing authorized CI deployment credentials/workflow, or securely inject the existing `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` into the deployment terminal, with the existing production public environment. Run the existing `npm run deploy:vinext` only after every release gate is met. Nothing was pushed to trigger the deployment workflow.
6. Verify authenticated service readiness, then the scoped real-model results and their manual review. After approved notes exist, verify the public `rule_cefr` level/detail pages and the requested public/Admin post-deployment smoke. Do not start historical backfill.

Application deployed: **NO**. Edge Function deployed: **NO**. Production controlled analysis: **BLOCKED**. Post-deployment smoke: **BLOCKED**. No migration was introduced or applied.

## Data safety

**DELETE: NO**

**TRUNCATE: NO**

**DROP: NO**

**Books deleted: NO**

**Chapters deleted: NO**

**Shows deleted: NO**

**Episodes deleted: NO**

**Transcripts deleted: NO**

**Phrases deleted: NO**

**Grammar Notes deleted: NO**

**Existing production content replaced: NO**

These statements concern production; automated tests use isolated synthetic databases. No historical backfill or source recreation was started. Admin Books compatibility and canonical Admin-only security are preserved. The browser harness distinguishes cancellation from application failure rather than suppressing errors. Context grammar discovery now has a real authenticated server implementation; live configuration, model-quality review and production activation remain explicitly blocked. Existing ArabicWithM content was preserved.

Final read-only production check: **21 Books, 134 chapters, 0 Grammar Notes, 0 enrichment jobs**. The final focused rerun passed all seven service/pipeline/matcher tests; the formatted Edge entrypoint also passed Deno 2.9.6 checking from the cached executable.

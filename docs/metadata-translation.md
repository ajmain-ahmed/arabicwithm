# Metadata translation at £0 provider cost

The metadata workflow uses **bulk JSON export/import and manual Arabic review**.
It does not use OpenAI, Gemini or any other translation API. No provider key is
required. Existing unrelated project secrets are left alone.

Google's documentation checked on 25 November 2026 describes a limited Gemini
free tier, with variable model quotas and unpaid-service data use. Its current
[additional terms](https://aistudio.google.com/docs/terms) restrict API clients
made available in the UK, EEA or Switzerland to Paid Services, and restrict
clients likely to be accessed by under-18s. Professional/business use is
permitted subject to those restrictions. This is not a suitable default for
this learner website's strict £0 requirement. A key alone also does not prove
that its project has no billing account. No paid account, billing upgrade,
automatic retry, paid fallback or unverified public translation proxy is used.

## Admin workflow

1. Open **Admin → Translations** (`/admin/translations`). Choose a content type:
   Books, chapters, shows, episodes, transcripts or transcript groups.
2. Export batches of up to 50 source records / 100 fields. Continue until the
   last batch. Keyset pagination avoids the Data API response cap.
3. Fill only each row's `arabic` value with reviewed Modern Standard Arabic.
   Keep `format`, `entity`, `id`, `field`, `source` and `sourceHash` unchanged.
   Use an existing free/offline translation workflow; the app sends no material
   to third parties. Proper names and idioms need human review.
4. Load the completed JSON, then **Preview import**. Blank Arabic remains
   Pending. Stale sources, invalid Arabic and existing conflicting translations
   are reported separately. The preview does not write anything.
5. Select **Import new drafts**. The server independently validates again and
   inserts only missing fields, in one bounded batch, as drafts. A concurrent
   manual edit wins. Repeating a batch does not overwrite or duplicate rows.
6. Use **Edit / approve** for each record, including transcript groups, or its
   existing content editor. Review source and Arabic, then explicitly approve.
   Only approved translations with the current source hash can reach learners.

Drafts and approved/manual translations are excluded from missing-field exports.
Stale existing translations are counted for manual review, never overwritten by
bulk import. Existing authored `title_ar` values retain priority. Source metadata,
educational JSON, Book completion and publication flags are never changed.

New content and changed original text become pending in the next export; this
derived queue needs no extra schema or background request. Language switching
reads stored metadata and makes zero translation requests. There is no quota to
exhaust or billing fallback to invoke. API-specific Translating/Waiting for free
quota states do not apply to this mode. Imports report Failed — retry available
on storage failure; safe retries re-read existing values first.

## Repository CLI (available before the website UI rollout)

Node 24+ can run `scripts/metadata-localisations.mjs --help`. It shares the
import schema and conflict decision with Admin, verifies `account_role` for the
explicit `--admin-user`, and uses only the existing server environment. Secrets
are never command arguments. For example:

```powershell
node --env-file=.env.local scripts/metadata-localisations.mjs export --admin-user ADMIN_UUID --entity chapter --out artifacts/localisation/batch.json
node --env-file=.env.local scripts/metadata-localisations.mjs preview --admin-user ADMIN_UUID --file artifacts/localisation/completed.json
node --env-file=.env.local scripts/metadata-localisations.mjs import --admin-user ADMIN_UUID --file artifacts/localisation/completed.json --apply
```

`--apply` explicitly commits new drafts after preview. Repeating an import is
safe. Export refuses to replace an existing file and reports the next cursor.
Production export verification produced 13 files under the Git-ignored
`artifacts/localisation/bulk-pending/`, with **596 pending fields** after the
single controlled draft. All six content types were scanned, with zero stale
conflicts. These files contain untranslated source metadata, not completed
Arabic translations. No full translation backfill has been applied.

## Compatibility worker

The deployed `metadata-localisation` Edge Function remains JWT/service-key
protected to safely retire callers from an older app build. Every authorised
task, including the old controlled probe, reports:

```json
{"ready":false,"mode":"bulk-import-export","automaticTranslation":false,"paidFallback":false,"providerRequests":0}
```

It does not read provider secrets, source content or invoke fetch. Website
content-save hooks no longer schedule worker calls. Manual editing stays
available independently of provider availability. No additional migration is
needed beyond the previously approved `content_localisations` table.

## Verification

Tests cover canonical Admin guards, bounded files, duplicate detection, stale
sources/hashes, authored Arabic priority, preserving manual drafts and approved
values, preview without writes, draft-only conflict-ignore inserts, and all
legacy worker tasks making zero provider requests. Production worker health is
checked without logging secrets. Full backfill still requires actual Arabic
drafts and review; exports alone are not translations.

The opt-in production test (`AWM_METADATA_CONTROLLED_IMPORT=1`) passed on
25 November 2026 for chapter `1522d368-7071-4d44-8ced-7a14d93b9395` in **99 Souls**:
“A Door That Remained Open” → “باب ظل مفتوحًا”. This is a manually prepared,
natural MSA metadata translation, not an API-generated result. It was stored as
a draft, read back with its source hash, and a repeated import was skipped.
The original title was verified unchanged. It awaits normal Admin approval.

The full regression suite passes (1,689 tests; eight skipped), TypeScript and
lint have no errors, and the Cloudflare production build passes. Locale checks
at 390/768/1440 px pass in Chrome, WebKit, Firefox and Edge, including active
player/activity identity and hydration. These checks do **not** establish full
translation coverage; the broader learner localisation remains under development.

The new Admin form waits for the existing initial account-access response before
accepting selections. This prevents a WebKit startup race from exporting the
default Book batch after the operator has selected Chapters. It does not add a
new authentication request or replace server authorization.

All four Admin browser journeys pass: Chrome, WebKit, Firefox and Edge. Each
exports Chapters, previews without writing, imports one draft, skips an identical
retry, approves through the guarded editor, checks unchanged chapter content and
records zero provider/worker requests.

# English/Arabic localisation: storage decision required

Status on 25 November 2026: **inventory and review proposal only; no production mutation, migration, interface change or deployment**. This is not a completed localisation release.

The supplied request, section 6, says: “If additional database fields are genuinely required, stop before applying a production migration and report the proposed schema changes.” Production has no localisation table. Only Books and Shows have `title_ar`; no surveyed content table has `description_ar`. Chapters, Episodes, Transcript Library records and transcript groups have no separate Arabic metadata fields. Complete editable bilingual metadata therefore requires a storage decision before implementation/backfill.

## Read-only production inventory

These counts include all stored records, not just publicly eligible records. No transcript/chapter bodies or user accounts were downloaded for this audit. A populated field or Arabic-script source is a candidate for reuse, not proof of editorial quality.

| Type | Total | Populated Arabic title field | Missing Arabic title field | Existing descriptions | New translations generated/persisted |
|---|---:|---:|---:|---:|---:|
| Books | 23 | 22 | 1 | 23 | 0 / 0 |
| Shows | 24 | 23 | 1 | 21 | 0 / 0 |
| Chapters | 137 | Unsupported | 137 | No description field | 0 / 0 |
| Episodes | 128 | Unsupported | 128 | 118 | 0 / 0 |
| Transcript Library | 184 | Unsupported | 184 | No description field | 0 / 0 |
| Transcript groups | 9 | Unsupported | 9 | No description field | 0 / 0 |
| Phrases, educational content | 130 | 130 Arabic phrases | 0 | 125 notes | 0 / 0 |

- The Book of Proverbs (`bop`) has no `title_ar`, but its existing `description` is exactly **كِتَابُ الْأَمْثَالِ**. Reuse that verified curated title; do not translate it again or overwrite its source field.
- Prison Break (`pb`) is the Show missing `title_ar`; its description is English. Generate/review a title candidate after the storage decision.
- 23 transcript source titles already contain Arabic script: 21 ready, one indexing, one failed. Those originals must be preserved. There are 182 ready records overall, plus one indexing and one failed. Two ready titles contain navigation/avatar boilerplate and require manual source-title review.
- Missing separate title fields are not the same as missing Arabic text: 23 transcript source titles and the Proverbs description are already Arabic. Thus 436 title values lack an obvious Arabic candidate (1 Show + 137 Chapters + 128 Episodes + 161 Transcripts + 9 groups). All generated candidates require review; no reviewed/generated counts are claimed yet.
- Of 162 existing descriptions, 161 are English-only (22 Book, 21 Show, 118 Episode). The remaining Book description is the Proverbs title, not a synopsis. Do not manufacture missing synopses or infer that this field is a reviewed bilingual description.
- Categories are source taxonomy strings (Books have both `Non-fiction` and `Non-Fiction`); localise display labels using stable keys without rewriting stored categories. Featured artwork/rotation/link configuration is separate from text and must remain unchanged; its Show metadata is included above. Static learning activity titles belong in UI dictionaries, not an educational-content rewrite.
- Phrase Arabic/English sides, glosses, notes, chapter/transcript JSON and source-language selection are educational data, not interface labels. Leave them unchanged.

## Source audit

`node scripts/audit-localisation.mjs --out artifacts/localisation/ui-inventory.json`

The reproducible AST inventory covers **25 learner page entry routes**, inherited layouts/loading/error boundaries, relative/alias imports, dynamic imports, and shared chrome. It reports **1,066 literal candidates across 161 reachable files**. This is a review queue, not a claim of 1,066 confirmed untranslated UI strings: educational English, variable-based labels, template expressions, pluralisation and runtime branches require manual classification. Admin/reviewer route entries are excluded; shared dependencies may still contain role-specific labels.

Coverage includes Home, Explore, catalogue/detail/player/reader routes, Learn, Memory, Grammar and existing legacy Grammar route stubs, Word Search, audiobooks, Profile, reset password, support, feedback, legal pages and transcript viewer. Existing Context stubs must not become a newly exposed Grammar in Context feature. The generated inventory is an ignored local audit artifact rather than a bundled runtime catalogue.

## Proposed storage (approval required)

Review [content-localisations.sql](content-localisations.sql), an unapplied SQL draft outside `supabase/migrations`.

Add one `content_localisations` table keyed by `(entity_type, entity_id, locale, field)`. Store only title/description translations, source-text fingerprint, draft/approved state, review time and timestamps. Existing English fields and authored Arabic fields remain canonical. This supports more languages without adding one column per language to every content table. There is no content or publication backfill in this draft.

Enable RLS, revoke all direct access from anonymous/authenticated clients, and allow only the service role to select/insert/update. Public pages first apply their existing parent-record release and entitlement rules; only then look up approved translations for the bounded set of displayed IDs. This prevents even draft chapter titles from leaking through a public translation endpoint. Admin actions must call `guardAdmin`, validate parent identity and source fingerprint, and preserve existing curated values. Polymorphic parent IDs need guarded server validation; the generic table deliberately cannot enforce cross-table parent foreign keys.

The draft was tested only in ephemeral local PGlite: schema creation passed; anonymous/authenticated SELECT failed; service-role draft insertion passed; approval without a review timestamp failed. These tests do not constitute production migration approval or full security/integration acceptance.

Alternative: keep non-curated translations in versioned, per-content-type repository catalogues keyed by stable IDs, with no production migration. This can support rendering, but the current Admin CMS cannot edit them, and new source records would require a repository update. Do not claim a database migration is necessary if that maintenance trade-off is preferred. The recommended table supports ongoing Admin content management.

## Implementation architecture after the decision

- Central, typed namespace dictionaries (`common`, `nav`, `auth`, `catalogue`, `learn`, `billing`, `profile`, errors/accessibility), with English/Arabic key parity. Translate plural forms and interpolation explicitly; no DOM text replacement or live AI requests.
- Website locale is an independent `en`/`ar` preference, default English, persisted locally across account changes. Do not reuse Reader `?lang=`, Explore source-language filters, Memory sides or any educational-language setting. No new authentication or profile fetch to choose a locale. Storage failures fall back safely to English/in-memory choice.
- Locale provider updates leaf labels in place. Do not key/remount players, activity workspaces, carousel, or app providers by locale. Server-rendered content boundaries need an explicit consistent initial snapshot; do not read localStorage during server render or add request cookies to every cached root page. Retain Safari recovery/startup behavior.
- Configure document `lang`/`dir`, MUI direction and logical spacing. Admin routes force English/LTR presentation while retaining the learner preference for return navigation. Review portal menus/forms and directional icons; keep players, timelines, code, timestamps and numeric ranges LTR. Isolate mixed Arabic/English text. Preserve existing Arabic font assets and root/mobile scale.
- Metadata helpers prefer existing verified curated Arabic fields, then approved stored translations, with no render-time generation. Keep lookup code server-only and fetch only selected IDs/fields, with locale/cache-tag separation. Do not download a corpus into the browser or Worker for locale switching.
- Featured keeps current artwork, focal coordinates, rotation, destination and Watch/Play behavior. Learn keeps three desktop columns, mobile stacking and independent continuous activity state. Auth/registration, subscription errors, dialogs and footer are part of acceptance, not just navigation.
- Add translation editing to the existing canonical Admin workflow without localising Admin chrome or broadening Editor privileges.

## Release acceptance still outstanding

No learner pages have been converted yet; no language switcher or RTL implementation is deployed. All 25 routes still require actual translation integration and runtime audit. No browser/device/PWA/localisation screenshots exist, because no bilingual UI has been implemented. Existing earlier subtitle/browser test passes are not evidence for this request.

After implementation, test EN/AR desktop/tablet/mobile in Chrome, WebKit, Firefox and Edge, persistence/refresh/Back/Forward/account changes, active-player/activity stability, publication/privacy and Admin English isolation. Capture Home/Learn/Auth/catalogue screenshots in both locales, check missing keys and accidental English, and measure production Worker errors/startup behavior. Physical iPhone Safari, Android and installed PWA tests must be identified separately from emulation. Do not claim a complete Arabic learner interface before these pass.

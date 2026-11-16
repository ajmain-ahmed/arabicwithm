# Route health matrix

Scope: local repaired production build against isolated fixtures. PASS/FIXED covers observed checks, not every role/width combination. BLOCKED means unexercised or unavailable, not necessarily broken. Production application changes have not been deployed. Loading means the observed content or intended gate reached a terminal state; it does not certify every pending-request combination. Mobile smoke coverage uses 390px; connected flows add 320/430px. Desktop smoke coverage uses 1440px; connected flows add 768/1024px. Auth indicates at least the fixture role used for that flow, not all roles.

| Route | Direct | Internal | Refresh | Back | Forward | Loading | Auth | Out | Mobile | Desktop | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| / | PASS | BLOCKED | PASS | BLOCKED | BLOCKED | BLOCKED | BLOCKED | PASS | PASS | PASS | PASS |
| /admin | PASS | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | PASS | PASS | BLOCKED | PASS | PASS |
| /admin/books | PASS | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | PASS | PASS | BLOCKED | PASS | PASS |
| /admin/books/[chapterId] | PASS | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | PASS | PASS | BLOCKED | PASS | PASS |
| /admin/books/preview/[chapterId] | PASS | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | PASS | PASS | BLOCKED | PASS | PASS |
| /admin/episodes | PASS | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | PASS | PASS | BLOCKED | PASS | PASS |
| /admin/episodes/[episodeId] | PASS | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | PASS | PASS | BLOCKED | PASS | PASS |
| /admin/featured | PASS | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | PASS | PASS | BLOCKED | PASS | PASS |
| /admin/grammar-notes | PASS | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | PASS | PASS | BLOCKED | PASS | PASS |
| /admin/hans-wehr | PASS | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | PASS | PASS | BLOCKED | PASS | PASS |
| /admin/phrases | PASS | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | PASS | PASS | BLOCKED | PASS | PASS |
| /admin/reviews | PASS | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | PASS | PASS | BLOCKED | PASS | PASS |
| /admin/shows | PASS | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | PASS | PASS | BLOCKED | PASS | PASS |
| /admin/transcripts | PASS | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | PASS | PASS | BLOCKED | PASS | PASS |
| /admin/users | PASS | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | PASS | PASS | BLOCKED | PASS | PASS |
| /api/admin/audio-upload | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| /api/admin/content-enrichment/work | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| /api/billing/webhook | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| /api/books/[book]/download | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| /api/covers/[kind]/[id] | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| /api/profile-presets/[bucket]/[...path] | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| /api/reviewer/export | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| /auth/callback | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| /auth/confirm | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| /books | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | FIXED |
| /books/[book] | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | FIXED |
| /books/[book]/[chapter] | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | FIXED |
| /cartoons | PASS | BLOCKED | PASS | BLOCKED | BLOCKED | BLOCKED | BLOCKED | PASS | PASS | PASS | PASS |
| /cartoons/[show] | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | FIXED |
| /cartoons/[show]/[episode] | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | FIXED |
| /explore | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | FIXED |
| /explore/search | PASS | BLOCKED | PASS | BLOCKED | BLOCKED | BLOCKED | BLOCKED | PASS | PASS | PASS | PASS |
| /feedback | PASS | BLOCKED | PASS | BLOCKED | BLOCKED | BLOCKED | BLOCKED | PASS | PASS | PASS | PASS |
| /grammar | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | FIXED |
| /grammar/context | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | FIXED |
| /grammar/context/[level] | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | FIXED |
| /grammar/notes/[id] | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | FIXED |
| /learn | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| /listen/[book] | PASS | BLOCKED | PASS | BLOCKED | BLOCKED | BLOCKED | BLOCKED | PASS | PASS | PASS | PASS |
| /memory | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| /practice | PASS | BLOCKED | PASS | BLOCKED | BLOCKED | BLOCKED | BLOCKED | PASS | PASS | PASS | PASS |
| /practice/session | PASS | BLOCKED | PASS | BLOCKED | BLOCKED | BLOCKED | BLOCKED | PASS | PASS | PASS | PASS |
| /privacy | PASS | BLOCKED | PASS | BLOCKED | BLOCKED | BLOCKED | BLOCKED | PASS | PASS | PASS | PASS |
| /profile | PASS | BLOCKED | PASS | BLOCKED | BLOCKED | BLOCKED | BLOCKED | PASS | PASS | PASS | PASS |
| /profile/[user] | PASS | BLOCKED | PASS | BLOCKED | BLOCKED | PASS | PASS | BLOCKED | PASS | PASS | FIXED |
| /reset-password | PASS | BLOCKED | PASS | BLOCKED | BLOCKED | BLOCKED | BLOCKED | PASS | PASS | PASS | PASS |
| /reviewer | PASS | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | PASS | BLOCKED | BLOCKED | PASS | PASS |
| /search | PASS | BLOCKED | PASS | BLOCKED | BLOCKED | BLOCKED | BLOCKED | PASS | PASS | PASS | PASS |
| /support | PASS | BLOCKED | PASS | BLOCKED | BLOCKED | BLOCKED | BLOCKED | PASS | PASS | PASS | PASS |
| /terms | PASS | BLOCKED | PASS | BLOCKED | BLOCKED | BLOCKED | BLOCKED | PASS | PASS | PASS | PASS |
| /transcripts/[id] | PASS | BLOCKED | PASS | BLOCKED | BLOCKED | BLOCKED | BLOCKED | PASS | PASS | PASS | PASS |
| /word-search | PASS | BLOCKED | PASS | BLOCKED | BLOCKED | BLOCKED | BLOCKED | PASS | PASS | PASS | PASS |
| /explore?view=foryou | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | FIXED |
| /books?mode=listen | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | FIXED |
| /cartoons?view=shows | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | FIXED |
| /profile/[user]?tab=settings | PASS | PASS | PASS | PASS | PASS | PASS | PASS | BLOCKED | PASS | PASS | FIXED |
| /profile/[user]?tab=awm | PASS | PASS | PASS | PASS | PASS | PASS | PASS | BLOCKED | PASS | PASS | FIXED |
| /grammar/context/A1 | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | FIXED |
| /grammar/context/A2 | PASS | BLOCKED | PASS | BLOCKED | BLOCKED | PASS | PASS | PASS | PASS | PASS | FIXED |
| /grammar/context/B1 | PASS | BLOCKED | PASS | BLOCKED | BLOCKED | PASS | PASS | PASS | PASS | PASS | FIXED |
| /grammar/context/B2 | PASS | BLOCKED | PASS | BLOCKED | BLOCKED | PASS | PASS | PASS | PASS | PASS | FIXED |
| /grammar/context/C1 | PASS | BLOCKED | PASS | BLOCKED | BLOCKED | PASS | PASS | PASS | PASS | PASS | FIXED |
| /grammar/context/C2 | PASS | BLOCKED | PASS | BLOCKED | BLOCKED | PASS | PASS | PASS | PASS | PASS | FIXED |

See the CSV for per-route evidence and separate production limitations. Its production column describes signed-out smoke observations only; live account QA is unavailable.

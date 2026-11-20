# Admin route health matrix

Current source routes. Initial four-browser lifecycle checks include direct entry, refresh, Back/Forward and a fresh tab. BLOCKED retains strict cancellation-error failures; it does not imply authorization bypass. Dedicated final Books and Grammar checks are linked in the audit report. Real authenticated production QA remains unavailable.

| Route | WebKit | Chrome | Firefox | Edge | Status | Root cause / scope |
|---|---|---|---|---|---|---|
| /admin | BLOCKED | PASS | PASS | PASS | BLOCKED | WebKit lifecycle recorded navigation-cancelled request diagnostics; strict zero-error acceptance remains outstanding. |
| /admin/books | BLOCKED | PASS | PASS | PASS | BLOCKED | Production projection selected missing chapters.is_published; application compatibility reader repaired. Dedicated Books controls have separate evidence. |
| /admin/books/[chapterId] | BLOCKED | PASS | PASS | PASS | BLOCKED | Production projection selected missing chapters.is_published; application compatibility reader repaired. Dedicated Books controls have separate evidence. |
| /admin/books/preview/[chapterId] | PASS | PASS | PASS | PASS | PASS | Lifecycle smoke; not exhaustive mutation certification. |
| /admin/episodes | BLOCKED | PASS | PASS | PASS | BLOCKED | WebKit lifecycle recorded navigation-cancelled request diagnostics; strict zero-error acceptance remains outstanding. |
| /admin/episodes/[episodeId] | PASS | PASS | PASS | PASS | PASS | Lifecycle smoke; not exhaustive mutation certification. |
| /admin/featured | PASS | PASS | PASS | PASS | PASS | Lifecycle smoke; not exhaustive mutation certification. |
| /admin/grammar-notes | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | Initial fixture lacked dashboard RPC data; use the final dedicated diagnostics check, not shell-only smoke. |
| /admin/hans-wehr | BLOCKED | PASS | PASS | PASS | BLOCKED | WebKit lifecycle recorded navigation-cancelled request diagnostics; strict zero-error acceptance remains outstanding. |
| /admin/phrases | BLOCKED | PASS | PASS | PASS | BLOCKED | WebKit lifecycle recorded navigation-cancelled request diagnostics; strict zero-error acceptance remains outstanding. |
| /admin/reviews | PASS | PASS | PASS | PASS | PASS | Lifecycle smoke; not exhaustive mutation certification. |
| /admin/shows | PASS | PASS | PASS | PASS | PASS | Lifecycle smoke; not exhaustive mutation certification. |
| /admin/transcripts | PASS | PASS | PASS | PASS | PASS | Lifecycle smoke; not exhaustive mutation certification. |
| /admin/users | PASS | PASS | PASS | PASS | PASS | Lifecycle smoke; not exhaustive mutation certification. |

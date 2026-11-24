# Profile reliability and immediate Learn workspace

Implemented locally on 24 November 2026. **Not deployed.** No production content mutation was performed in this follow-up.

## Profile

The reproduced failure is in the server profile loader, after verified identity and profile visibility checks: optional username/statistics, membership or reading-shelf failures previously threw out the entire profile response. Missing auth metadata or a missing creation date also lacked defensive handling. This is a confirmed code/fixture failure path; it has not been established as the exact failure from the user's production session.

`fetchPublicProfile` now bounds optional reads to four seconds, isolates their failures and returns notices with the remaining profile. Missing fields use existing empty states. Private-profile visibility and verified identity remain mandatory. A preferences-read outage can fall back only for the verified owner; public visibility errors still fail closed. No email-derived display name is exposed as a public fallback. Missing join dates are omitted from the header. Critical failures have a Profile-specific Retry boundary. The client membership widget now has an eight-second deadline; it does not retry billing mutations.

Regression tests reproduce optional backend outages, missing metadata/date fields and a statistics Promise that never resolves. The latter settles through the deadline rather than hanging. Existing Profile, Memory and puzzle tests passed: **50 tests across six files** in the final focused run.

Browser coverage uses isolated normal-user, AWM+ and Admin fixtures. All eight widths have passing Profile refresh, Back and Settings/Back evidence in WebKit, installed Chrome, Firefox and installed Edge. The final 390px rerun uses the actual Books library route for the navigation return. An additional four-browser check passes mobile drawer → My Profile, an injected statistics outage with the rest of Profile still visible, and desktop avatar menu → My Profile. There is no separate Me/Profile destination in the current floating mobile nav; mobile Profile is in the drawer.

These tests do not certify the user's live signed-in production session or a physical iPhone. The previous browser connector was unavailable. Production reproduction and deployment remain outstanding, so an unconditional claim that the reported production failure is fixed would be premature.

## Learn

The passive landing cards are replaced by a full-width workspace. Desktop at 1200px and above has Word Search / grammar / Memory columns. Narrower layouts use two columns from 900px, and one column below 900px, preserving Word Search → grammar → Memory document order. At tablet widths the stacked layout prioritizes usable activity widths.

- **Word Search:** the existing canonical vocabulary loader chooses Episode/book content. The server generates the existing Easy puzzle, passed as stable initial props to the existing interactive game. No Start or Generate click is needed. Target words, drag selection, found/completed states, clues and New Game use the existing engine. Further vocabulary reads have ten-second bounds.
- **Grammar:** the request selects a random reviewed foundation from `websiteQuestions`, including Naḥw role/structure/case/particle exercises or Ṣarf root/morphology/conjugation exercises. `WebsiteActivity` and `GrammarProvider` supply the existing answer, check/automatic-check, feedback, explanation and retry behaviour. The finite reviewed foundation pool is intentional; it does not call removed Grammar Notes infrastructure. Explore Naḥw / Explore Ṣarf retain their existing course URLs.
- **Memory:** the existing Memory library chooses an Episode, limits the embedded deck to up to five cards from that source, and shows its title/link. The existing Memory page/session, server start/review actions, allowance checks and storage are reused. Eligible signed-in learners automatically begin after the bounded access check. Anonymous users retain sign-in, and exhausted free access becomes an inline notice; it must not block Word Search or grammar with an automatic upgrade dialog. No entitlement bypass or second Memory store was introduced.

Choice occurs on the server per fresh Learn request. Selected puzzle/question/deck data is passed to client state; revealing a card or resizing does not replace it. Requests can randomly select the same source again, particularly with a small pool; avoiding consecutive repeats is not guaranteed. Source loading streams independently with Suspense, has ten-second deadlines and useful empty/error states. Client error boundaries and dynamic imports isolate activity rendering and defer heavy game modules. No Admin editors or automatic Grammar Notes components are imported by Learn.

Anonymous visitors and free users who have used their daily session therefore do **not** receive three unrestricted activities. Existing access rules are preserved.

## Browser results and evidence

| Browser | Width cases with passing evidence | Drawer/desktop entry and optional outage |
|---|---:|---:|
| WebKit | 8/8 | passed |
| Chrome | 8/8 | passed |
| Firefox | 8/8 | passed |
| Edge | 8/8 | passed |

Widths: **320, 375, 390, 414, 430, 768, 1024, 1440px**. Assertions cover ready puzzle/grammar, ready entitled Memory or the free-limit notice, reveal, session stability after resize, responsive ordering and page overflow. All checks use synthetic content; the normal-user allowance is intentionally preserved.

The main 32-case run had 30 fully passing cases and two trace-file teardown errors because a concurrent runner cleared shared Playwright artifacts. Both affected viewport cases passed in the isolated rerun (four cases rerun, all passed). Final additional entry/390px verification passed eight cases. An earlier test incorrectly looked for the desktop avatar button on mobile; the final test follows the real drawer entry. These are test corrections, not hidden application failures.

Screenshots are retained in `artifacts/learn-profile/`. Full-page screenshots captured after scrolling can place the fixed navbar midway through the image; that is a screenshot artifact. The test now scrolls to the top before future captures. The 390px WebKit and 1440px Edge layouts were visually inspected.

Production vinext build, targeted ESLint, TypeScript and whitespace checks passed. The build rewrites generated Next route declarations; `next typegen` regenerates them for TypeScript verification. No source workaround was introduced.

## Mobile scale, Phrases and Phrase of the Day

The previous [scale/corpus report](mobile-scale-phrase-backfill-2026-11-24.md) remains applicable. No new global typography, viewport, safe-area or sizing rule was changed. Current Homepage measurements match the immediate pre-21-November Safari startup baseline, so no speculative shrinking was applied. The statement “previous mobile scale restored” would imply a reproduced regression that has not been found.

The live Phrase count was rechecked: **130 canonical rows, 118 with glosses**, not the older six-row state quoted in the new request. The prior additive backfill scanned 334 canonical documents (178 eligible transcripts with 106 Episode mirrors merged, 128 Episodes, 134 chapters; 24 Shows and 21 Books inspected). It reviewed 155 candidates, accepted 130 including six existing rows, rejected 25 corpus matches and inserted 124 new rows. Final discovery collapsed 990 repeated occurrences. It is a conservative pass, not exhaustive semantic discovery; it does not establish that every useful corpus expression was extracted. No duplicate backfill or further production insertion was performed in this follow-up.

The existing local Phrase-of-the-Day centring change remains: heading, Arabic, full English, gloss groups and wrapped rows centre-align, while RTL, canonical `public.phrases` loading, mobile-only visibility and London daily selection are unchanged. The prior four-browser alignment evidence remains available. It has not been deployed by this follow-up.

The previously proposed Phrase-only queue migration is still unapplied; this follow-up did not treat the repeated task description as explicit approval of that SQL.

## Data safety

**DELETE: NO**  
**TRUNCATE: NO**  
**DROP: NO**  
**Books deleted: NO**  
**Chapters deleted: NO**  
**Shows deleted: NO**  
**Episodes deleted: NO**  
**Transcripts deleted: NO**  
**Existing Phrases deleted: NO**  
**Existing production content replaced: NO**

No existing ArabicWithM production content was deleted or replaced. The new activity session/review tests used the isolated fixture backend.

## Acceptance limits

The implemented Profile failure paths and Learn interactions pass the described fixture/browser checks. The requested three-column desktop and stacked mobile Learn layouts are implemented, and Naḥw/Ṣarf links remain available without Grammar in Context in the workspace. However, live Profile reproduction, deployment, a reproduced mobile-scale regression and exhaustive semantic Phrase discovery remain unresolved. The task is not reported as fully complete on production.

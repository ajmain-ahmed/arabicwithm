1. **Exact records.** Bolder Deeds `ad76c3ab-177b-4180-99ce-bfd7facabb10` (`bos3`); Lord of The Boy `e4ba3b2a-1a62-45ad-a2bb-1eff8a36fed7` (`bos1`); The Fragrant Scent `f3b08eae-fdfc-4746-81b9-7b7d5088ff69` (`bos2`); Between People & Days `6fb6426f-2d56-44e0-88f6-86c39e3d1f18` (`bpd`). All IDs/slugs were verified before the update.

2. **Live values.** All four now have `premium_exempt = true`, `is_completed = true`; their existing `free_chapter_count = 5` values were retained. The four other pre-existing exemptions remained true. No title-based production access checks or separate audiobook ID list were added. At the live audit, published audio sources were: bos1 5, bos2 5, bos3 0, bpd 10. Bolder Deeds becomes discoverable in Listen automatically when a published valid source is added.

3. **Central policy.** `fetchEntitlements(bookId)` loads the authoritative parent book and applies the shared `canAccessBookMedia` rule: signed in AND released AND (effective Plus OR canonical `premium_exempt`). Book-scoped capabilities do not grant global Premium or change Memory/For You allowances. Existing signed-in website reading rules remain intact. No new exemption field was created.

4. **Guests.** Public metadata/discovery remain available. Guests receive the existing sign-in flow for reading and direct Listen access. Guest Book Detail responses omit prose teasers; content, PDF and playable audio require authentication regardless of exemption.

5. **Reader boundary.** Website chapter actions reject guests before reading chapter prose. Restrictive chapter RLS requires an authenticated user, and the shared `read_book_chapter` RPC checks authentication before chapter/exemption logic. Existing completion and publication predicates still apply. For the shared RPC, existing ordinary-book free-chapter/Plus rules remain unchanged, while exemptions bypass chapter count.

6. **Audio policy.** Playback and progress server actions resolve chapter → `book_id` → canonical Book entitlement before reading audio references or issuing URLs. The Edge update applies the same policy; all seven Deno tests/type checks pass. Production version 10 was deployed after explicit approval, read back as ACTIVE with JWT verification enabled, and smoke-tested to deny anonymous access.

7. **Single source of truth.** Both website and Edge code use the parent Book's `premium_exempt` value. The shared pure policy lives in `supabase/functions/_shared/bookAccess.ts`. Changing another book's database flag is sufficient after the initial website/Edge deployment; a browser test changes a warm ordinary book's flag and obtains PDF/audio access in the same running build.

8. **Private media.** JWT/user verification, fresh server checks, private Storage and existing signed-URL generation remain in place. The canonical Storage URL resolver is untouched. No bucket was made public, and guest denial occurs before private URL generation.

9. **My List.** Exempt books retain their normal canonical Book Detail links and do not gain an access-related Plus gate. In-progress books still show metadata/reminder state.

10. **Continue Reading.** Exempt books resume normally for signed-in free accounts. Unreleased books remain excluded, even with legacy progress.

11. **Reading progress.** Existing per-user progress tracking/metadata sync was preserved. Browser checks open late chapters in both reading languages and return to the saved-book/resume links. Existing reading-progress unit coverage also passed.

12. **Audio progress.** Free exempt listeners play, seek to 28 seconds, leave and resume beyond 27 seconds. Arabic/English progress remains separated and owned by the verified caller; it is not Premium-only for an exempt book.

13. **Existing exemptions.** Live checks verified the existing four flags remain true. An additional existing exempt fixture book successfully downloads PDF and plays audio for a free user, demonstrating that access is not limited to the four newly named IDs.

14. **Non-exempt users.** Existing signed-in website reading behaviour is preserved. Normal-book audio and PDF remain Plus-only; regression tests verify the free-user denial. The existing shared reader-RPC chapter-count logic was retained.

15. **Plus.** Normal Plus audiobook playback and PDF preparation continue to work. The existing Admin/reviewer preview capabilities remain separate.

16. **Database/RLS.** Applied migrations: `20261103192129_book_completion_release_reminders` and `20261103192139_book_exempt_access`. Four exact records were updated without disabling any existing exemptions. Live anonymous API tests saw zero chapter rows and the expected `42501` reader/reminder denials. Production `audiobook-library` version 10 is ACTIVE with JWT verification enabled; its anonymous request returned 401 with no playable URL. The deployed audio resolver matches the prior resolver unchanged. Website changes remain local for normal commit/deployment.

17. **Files and other requested work.** `app/lib/entitlements.ts`, `app/actions/entitlements.ts`, `app/actions/audiobooks.ts`, `app/actions/books.ts`, PDF route/button, Book Reading CTA, Listen route, shared Edge policy/handler/index, migration, and focused tests/fixtures. Navbar `UserAvatar.tsx` now renders the saved canonical avatar/crop from Auth metadata with an initials fallback; the profile Save event updates it without a reload. The desktop browser test verifies the new navbar image before any reload; draft/Cancel behaviour is preserved. See `docs/book-completion-release-reminders.md` for the completion/reminder implementation report.

18. **Tests.** Full unit suite: 1,054 passed, three opt-in live tests skipped. PostgreSQL migration/RLS and real server-action/PDF tests cover all four canonical IDs, other exemptions, guests, normal users, Plus, unreleased books and future flag edits. Three production-mode Chrome exemption acceptance tests passed, including both audio languages, private media decoding, seek/resume, guest denials and normal-book regression. All 22 final responsive completion, automatic Listen, existing playback and profile regressions passed, giving 25 unique browser acceptance/regression tests. Seven Edge handler tests/type checks passed. TypeScript, changed-file ESLint and production builds passed. Validation screenshots are under `docs/validation/book-release/` and `docs/validation/navbar-avatar/`.

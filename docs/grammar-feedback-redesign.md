1. **Word Search messages.** Removed the selection messages for incorrect, incomplete, repeated and found selections. Existing load/setup errors remain available. Incorrect red flashes, found-word colouring, mistake tracking and completion behavior remain intact.

2. **Word Search stability.** Incorrect selections no longer insert a message above the grid. Browser checks compare grid position and height before and after a wrong drag and verify the temporary incorrect state clears normally.

3. **Vocabulary layout.** The existing RTL flex group now uses `justifyContent: 'center'`, retaining natural wrapping and the existing gap. Tags keep their natural width on mobile and desktop.

4. **Answer-revealing controls.** Removed Word Patterns’ pre-answer Information button. Pattern help appears only after evaluation. The active Context activity has no answer-revealing information button. Flashcard reveal controls remain appropriate to their review activities.

5. **Shared feedback.** `AnswerArea` and `Feedback` in `GrammarUI.tsx` replace the visible answer area in place. Hidden choices retain their layout footprint but are inert and hidden from accessibility tools. A measured height, minimum height and internal overflow prevent feedback from collapsing or expanding the activity unexpectedly. Feedback is focused with `preventScroll`, announced politely, and uses text plus an icon. No animated transitions are introduced.

6. **Correct layout.** A centred 64px tick sits above the Correct heading, followed by the answer label and a centred, wrapping explanation limited to 40ch. Case Endings includes the Arabic case label and English name. Naḥw explanations use concise deterministic word-class/role definitions; case reasons use a stored same-token role where available, without guessing a role from word order.

7. **Incorrect progression.** The same central surface shows a large cross, Incorrect, the correct answer, a reason and Next. Incorrect answers never auto-advance. Correct answers also show Next when Auto Next is off.

8. **Auto Next.** A small shared switch appears above active evaluated practice. It defaults on and persists in the existing `awm-grammar-settings` object alongside text sizes and tashkīl. Turning it off cancels a pending transition. Flashcards do not show the switch.

9. **Timing.** Trimmed explanation length selects one of three simple delays: up to 60 characters → 1,500ms; up to 180 → 2,500ms; longer → 4,000ms. Timer cleanup prevents stale transitions. Wrong answers and Auto Next off schedule no transition.

10. **Word Patterns variety.** Extracted the prepared-question adapter and activity. The inventory combines canonical curriculum patterns and explicit pattern metadata on existing reviewed questions. Each 12-question round balances pattern coverage, randomises ties, penalises recent patterns (3), words (8) and word-pattern pairs (12), and deduplicates identical pairs across contexts. New rounds use a fresh server seed and request up to 10 indexed sentences. Existing source-validation guards remain in place. More eligible indexed material can flow through the same adapter without hard-coding example words.

11. **Current eligible inventory.** There are 12 reviewed patterns: فَعِيل، فَعْلَان، فَعَّال، فَعُول، أَفْعَل، مِفْعَال، فَاعِل، مَفْعُول، تَفْعِيل، مُفَعِّل، مُفَعَّل، اِسْتِفْعَال. These include adjective, intensive, instrument, participial and verbal-noun patterns. The source audit found 217 indexed Word Pattern rows, 207 passing the existing freshness check, currently covering two indexed pattern categories. Reviewed foundations supply the broader inventory; the implementation does not claim all twelve already have indexed sentence examples. Stale rows and source data were not modified.

12. **Context Ṣarf reasons.** Explanations use the validated stored verb form, canonical past/present templates, the curriculum’s qualified meaning tendency, and the item’s actual meaning. Attested Form I past/present variants are used when available. Derived-form tendencies are not presented as universal meanings.

13. **Weak Verb reasons.** Identification uses the stored classification, Arabic label and first sentence of its curated root description. The existing categories and answer model remain intact. Conjugation recall retains Reveal, Again and Got it.

14. **Case Endings tashkīl.** Added Show Tashkīl beside Practice level, wrapping when needed on small screens. It uses `useGrammarDisplay` to remove/restore visible vocalisation only; source text, question identity and answer remain unchanged.

15. **Synchronized settings.** Inline tashkīl and the Grammar settings cog update the same provider and storage object. Browser and component checks verify synchronization, persistence across activity navigation/reload, and stable question identity.

16. **Ten Forms cleanup.** Removed the repeated “Recall the pattern, characteristic features and an example.” line. In Order/Shuffle, Start, pattern details, meaning tendencies, examples, Reveal and Next Form remain available. No evaluated feedback overlay was added to this review activity.

17. **Migrated activities.** All active evaluated catalogue activities: Word Type, Sentence Role, Case Endings, Context Ṣarf, Weak Verbs identification and Word Patterns. The reusable `WebsiteActivity` renderer also supports existing phrase/clause selection, four-part analysis and typed-answer questions without reducing their answer model. Rules and flashcard-only review retain their existing architecture.

18. **Files changed for this request.**

    - `app/actions/grammar.ts`
    - `app/grammar/BankActivity.tsx`
    - `app/grammar/GrammarPage.tsx`
    - `app/grammar/GrammarUI.tsx`
    - `app/grammar/GrammarFeedback.test.tsx` (new)
    - `app/grammar/PreparedActivity.tsx` (new)
    - `app/grammar/preparedQuestions.ts` (new)
    - `app/grammar/preparedQuestions.test.ts` (new)
    - `app/grammar/TenFormsRevision.tsx`
    - `app/grammar/WebsiteActivity.tsx`
    - `app/grammar/WebsiteActivity.test.tsx`
    - `app/grammar/questionBank.ts`
    - `app/grammar/questionBank.test.ts`
    - `app/grammar/useCorrectAutoAdvance.ts`
    - `app/grammar/websiteQuestions.ts`
    - `app/word-search/WordSearchGame.tsx`
    - `app/word-search/WordSearchClues.tsx`
    - `e2e/grammar-feedback.pw.ts` (new)
    - `e2e/grammar-upgrade.pw.ts`
    - `e2e/fixture-server.mjs` (only the Grammar fixture payload for this request)
    - `docs/grammar-feedback-redesign.md` (this report)
    - `docs/validation/grammar-feedback/` (browser screenshots)

19. **Validation.** 38 unit/component tests passed across 10 files, TypeScript passed, scoped ESLint passed, and all 21 selected production-mode browser tests passed (2.1 minutes). New feedback tests run at 390px and 1440px; existing relevant regressions also cover 320px and 768px, plus a 1920px rules check. Browser coverage includes correct keyboard selection, hidden/inert options, stable container size, centred icon layout, bounded automatic progression, manual corrections, persisted Auto Next, synchronized display-only tashkīl, two complete pattern rounds per viewport, Context/Weak explanations, flashcard behavior, RTL tag layout and no horizontal overflow. The application production build succeeded as part of this fixture suite. Screenshots were visually reviewed and saved under `docs/validation/grammar-feedback/`. These are local implementation/fixture checks; no production frontend deployment, commit, push or database mutation was performed for this request.
